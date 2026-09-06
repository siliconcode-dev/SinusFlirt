import { withGroqFallback, GROQ_MODELS } from "@/lib/groq";
import { AIKO } from "@/lib/characters/aiko";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  const start = performance.now();
  let firstTokenMs: number | null = null;

  const stream = await withGroqFallback((client) =>
    client.chat.completions.create({
      model: GROQ_MODELS.chat,
      messages: [{ role: "system", content: AIKO.systemPrompt }, ...messages],
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
