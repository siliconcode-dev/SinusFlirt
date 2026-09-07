import { NextResponse } from "next/server";
import { after } from "next/server";
import { withGroqFallback, GROQ_MODELS } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { getAssignedCharacter } from "@/lib/characters/get-assigned-character";
import { getToneDirective } from "@/lib/characters/tone";
import { scoreTurn } from "@/lib/characters/score-turn";

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
  const { character, interestScore } = assigned;

  // Scoring only depends on the player's message, already fully available
  // here — no need to wait for her reply to finish streaming. `after()`
  // keeps the serverless function alive for this after the response below
  // is sent, run concurrently with TTS so it never adds perceived latency
  // (same trick as Phase 3's chunk prefetching).
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMessage) {
    after(() =>
      scoreTurn(supabase, user.id, character, interestScore, lastUserMessage.content)
    );
  }

  const start = performance.now();
  let firstTokenMs: number | null = null;

  const stream = await withGroqFallback((client) =>
    client.chat.completions.create({
      model: GROQ_MODELS.chat,
      messages: [
        {
          role: "system",
          content: character.systemPrompt + getToneDirective(interestScore),
        },
        ...messages,
      ],
      stream: true,
    })
  );

  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (!token) continue;
          if (firstTokenMs === null) {
            firstTokenMs = Math.round(performance.now() - start);
            console.log(`[voice/chat] time-to-first-token ${firstTokenMs}ms`);
          }
          controller.enqueue(encoder.encode(token));
        }
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
