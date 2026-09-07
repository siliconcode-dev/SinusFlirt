import { NextResponse } from "next/server";
import { after } from "next/server";
import { withGroqFallback, GROQ_MODELS, classifyGroqError } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { getAssignedCharacter } from "@/lib/characters/get-assigned-character";
import { getToneDirective } from "@/lib/characters/tone";
import { getMemoryDirective } from "@/lib/characters/memory";
import { scoreTurn } from "@/lib/characters/score-turn";
import { moderateSentence } from "@/lib/moderation";
import { splitSentences } from "@/lib/sentence-split";
import { pickDeflectionLine } from "@/lib/characters/interruption-lines";
import { checkUsageCap, incrementUsage } from "@/lib/monetization/usage-cap";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const assigned = await getAssignedCharacter(supabase, user.id);
  if (!assigned) {
    return NextResponse.json(
      { error: "Could not resolve assigned character." },
      { status: 500 }
    );
  }
  const { character, characterId, interestScore, memorySummary, premiumUnlockExpiresAt } =
    assigned;

  // Phase 7: free-tier daily turn limit, lifted entirely while a premium
  // unlock is active (Masterdoc §8 — "higher usage caps"). Checked
  // synchronously (single lightweight read) before doing anything else.
  const usage = await checkUsageCap(supabase, user.id, premiumUnlockExpiresAt !== null);
  if (!usage.allowed) {
    return NextResponse.json({ error: "usage-cap" }, { status: 429 });
  }

  // Scoring + memory-summary rewrite only depend on the player's message and
  // her *previous* reply — both already fully available here (the client
  // resends full history every turn, so the prior assistant turn is already
  // in `messages`) — no need to wait for this turn's reply to finish
  // streaming. `after()` keeps the serverless function alive for this after
  // the response below is sent, run concurrently with TTS so it never adds
  // perceived latency (same trick as Phase 3's chunk prefetching).
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const previousAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  if (lastUserMessage) {
    after(() =>
      scoreTurn(
        supabase,
        user.id,
        characterId,
        character,
        interestScore,
        memorySummary,
        lastUserMessage.content,
        previousAssistantMessage
      )
    );
  }
  after(() => incrementUsage(supabase, user.id));

  const start = performance.now();
  let firstTokenMs: number | null = null;

  let stream;
  try {
    stream = await withGroqFallback((client) =>
      client.chat.completions.create({
        model: GROQ_MODELS.chat,
        messages: [
          {
            role: "system",
            content:
              character.systemPrompt +
              getToneDirective(interestScore) +
              getMemoryDirective(memorySummary),
          },
          ...messages,
        ],
        stream: true,
      })
    );
  } catch (error) {
    console.error("[voice/chat] failed to start stream:", error);
    const kind = classifyGroqError(error);
    return NextResponse.json({ error: kind }, { status: kind === "cap" ? 429 : 503 });
  }

  const encoder = new TextEncoder();

  // Every sentence is moderated (Masterdoc §9/§6, Claude.md rule #2) before
  // it ever reaches the client — this is the one choke point both the
  // on-screen caption and the eventual TTS input pass through, since the
  // client just displays whatever text this stream sends it. A flagged
  // sentence is replaced with an in-character deflection line and ends the
  // turn there; moderateSentence() itself fails closed on error.
  const body = new ReadableStream({
    async start(controller) {
      let buffer = "";
      let stopped = false;

      async function flushSentences(finalFlush: boolean) {
        if (!buffer.trim()) return;
        if (!finalFlush && !/[.!?]\s*$/.test(buffer)) return;

        const sentences = splitSentences(buffer);
        buffer = "";
        for (const sentence of sentences) {
          const flagged = await moderateSentence(sentence);
          if (flagged) {
            controller.enqueue(encoder.encode(pickDeflectionLine()));
            stopped = true;
            return;
          }
          controller.enqueue(encoder.encode(sentence + " "));
        }
      }

      try {
        for await (const chunk of stream) {
          if (stopped) break;
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (!token) continue;
          if (firstTokenMs === null) {
            firstTokenMs = Math.round(performance.now() - start);
            console.log(`[voice/chat] time-to-first-token ${firstTokenMs}ms`);
          }
          buffer += token;
          await flushSentences(false);
        }
        if (!stopped) await flushSentences(true);
      } catch (error) {
        console.error("[voice/chat] stream failed:", error);
      } finally {
        const totalMs = Math.round(performance.now() - start);
        console.log(`[voice/chat] total ${totalMs}ms`);
        controller.close();
      }
    },
  });

  // Note: TTFT can't be surfaced as a response header (headers are fixed
  // before the stream body starts executing) — the client measures its own
  // time-to-first-chunk instead, which is the more accurate number anyway
  // since it includes real network transit time.
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
