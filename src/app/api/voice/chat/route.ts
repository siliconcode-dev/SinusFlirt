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
  // streaming before *starting* this. Kicked off as a real promise (not
  // after()) and awaited in the stream's finally block below, right before
  // controller.close() — that guarantees the DB write lands before the
  // client's reader loop resolves done:true, which is what the client's
  // post-turn fetchCharacterInfo() call depends on. Backgrounding this via
  // after() let the client's refetch race the scoring call and read a stale
  // (pre-update) score, so a player could keep talking to a character whose
  // score had already dropped below EARLY_EXIT_THRESHOLD. Still runs
  // concurrently with reply-token streaming, so it adds no perceived latency
  // in the common case where scoring finishes before the reply text does.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const previousAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  const scoringPromise = lastUserMessage
    ? scoreTurn(
        supabase,
        user.id,
        characterId,
        character,
        interestScore,
        memorySummary,
        lastUserMessage.content,
        previousAssistantMessage
      )
    : Promise.resolve(interestScore);
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
        // Wait for scoring's DB write here, not after — see the comment
        // above scoringPromise's declaration for why this matters.
        await scoringPromise.catch((error) => {
          console.error("[voice/chat] scoreTurn failed:", error);
        });
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
