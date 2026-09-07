import { NextResponse } from "next/server";
import { withGroqFallback, GROQ_MODELS, classifyGroqError } from "@/lib/groq";

export async function POST(request: Request) {
  const start = performance.now();

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }

  try {
    const transcription = await withGroqFallback((client) =>
      client.audio.transcriptions.create({
        file: audio,
        model: GROQ_MODELS.stt,
        response_format: "json",
      })
    );

    const ms = Math.round(performance.now() - start);
    console.log(`[voice/transcribe] ${ms}ms`);

    return NextResponse.json({ text: transcription.text, ms });
  } catch (error) {
    console.error("[voice/transcribe] failed:", error);
    const kind = classifyGroqError(error);
    return NextResponse.json({ error: kind }, { status: kind === "cap" ? 429 : 503 });
  }
}
