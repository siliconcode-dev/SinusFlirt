import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withGroqFallback } from "@/lib/groq";
import type { Character } from "./types";

const SCORING_MODEL = "openai/gpt-oss-20b"; // fast/cheap — separate quota bucket from the main gpt-oss-120b reply model
const SCORE_MIN = 0;
const SCORE_MAX = 100;

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    delta: {
      type: "integer",
      description: "How much the player's message should shift her interest score, from -10 (rude/boring/off-putting for her specifically) to +10 (exactly what she responds well to).",
    },
    reasoning: {
      type: "string",
      description: "One short phrase explaining the delta.",
    },
    memorySummary: {
      type: "string",
      description: "The updated running relationship summary, 2-4 short sentences, in third person — how he's treated her and any key facts worth remembering, rewritten to fold in this latest exchange.",
    },
  },
  required: ["delta", "reasoning", "memorySummary"],
  additionalProperties: false,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Runs the per-turn interest-meter scoring call (Masterdoc §5.2: "moves
 * each turn based on an LLM-assessed read of conversation quality... per
 * character's own preferences") AND the per-turn memory-summary rewrite
 * (Masterdoc §5.3: "a running relationship summary... rebuilt into her
 * context each session") in one Groq call — folded together rather than two
 * separate per-turn calls to keep turn cost flat (see Phase 5 plan). Both are
 * deliberately a separate call from the main streamed reply — strict
 * structured output doesn't stream token-by-token the way plain text does —
 * run concurrently with TTS so it never adds perceived latency.
 */
export async function scoreTurn(
  supabase: SupabaseClient,
  accountId: string,
  character: Character,
  currentScore: number,
  previousSummary: string | null,
  playerMessage: string,
  previousAssistantMessage: string | null
): Promise<number> {
  try {
    const completion = await withGroqFallback((client) =>
      client.chat.completions.create({
        model: SCORING_MODEL,
        messages: [
          {
            role: "system",
            content: `You are doing two jobs for one conversational turn, given the character being talked to:\n\n${character.systemPrompt}\n\n1. Score how much what the player just said should shift her interest in him — reward what she's described as responding well to, penalize what turns her off. Stay within -10 to +10.\n2. Rewrite her running relationship summary (how he's treated her, key facts she'd remember) to fold in this latest exchange. Previous summary: ${previousSummary ?? "(none yet — this is their first exchange)"}`,
          },
          {
            role: "user",
            content: `${previousAssistantMessage ? `She previously said: "${previousAssistantMessage}"\n` : ""}The player just said: "${playerMessage}"`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "interest_delta", strict: true, schema: SCORE_SCHEMA },
        },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      delta: number;
      reasoning: string;
      memorySummary: string;
    };
    const delta = clamp(Math.round(parsed.delta), -10, 10);
    const newScore = clamp(currentScore + delta, SCORE_MIN, SCORE_MAX);

    console.log(`[score-turn] ${currentScore} -> ${newScore} (delta ${delta}: ${parsed.reasoning})`);

    const update: { interest_score: number; updated_at: string; memory_summary?: string } = {
      interest_score: newScore,
      updated_at: new Date().toISOString(),
    };
    // Only overwrite memory_summary if the model returned something —
    // a transient bad/empty call shouldn't null out real memory.
    if (parsed.memorySummary && parsed.memorySummary.trim()) {
      update.memory_summary = parsed.memorySummary.trim();
    }

    const { error } = await supabase
      .from("relationship_state")
      .update(update)
      .eq("account_id", accountId)
      .eq("is_permanent", true);

    if (error) {
      console.error("[score-turn] failed to persist score:", error);
      return currentScore;
    }

    return newScore;
  } catch (error) {
    console.error("[score-turn] scoring call failed:", error);
    return currentScore;
  }
}
