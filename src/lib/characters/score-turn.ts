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
  },
  required: ["delta", "reasoning"],
  additionalProperties: false,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Runs the per-turn interest-meter scoring call (Masterdoc §5.2: "moves
 * each turn based on an LLM-assessed read of conversation quality... per
 * character's own preferences") and persists the new score. Deliberately a
 * separate call from the main streamed reply — see Phase 4 plan for why
 * (strict structured output doesn't stream token-by-token the way plain
 * text does) — run concurrently with TTS so it never adds perceived latency.
 */
export async function scoreTurn(
  supabase: SupabaseClient,
  accountId: string,
  character: Character,
  currentScore: number,
  playerMessage: string
): Promise<number> {
  try {
    const completion = await withGroqFallback((client) =>
      client.chat.completions.create({
        model: SCORING_MODEL,
        messages: [
          {
            role: "system",
            content: `You are scoring one conversational turn for an interest/mood meter. Here is the character being talked to:\n\n${character.systemPrompt}\n\nGiven what the player just said, decide how this should shift her interest in him — reward what she's described as responding well to, penalize what turns her off. Stay within -10 to +10.`,
          },
          { role: "user", content: `The player just said: "${playerMessage}"` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "interest_delta", strict: true, schema: SCORE_SCHEMA },
        },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { delta: number; reasoning: string };
    const delta = clamp(Math.round(parsed.delta), -10, 10);
    const newScore = clamp(currentScore + delta, SCORE_MIN, SCORE_MAX);

    console.log(`[score-turn] ${currentScore} -> ${newScore} (delta ${delta}: ${parsed.reasoning})`);

    const { error } = await supabase
      .from("relationship_state")
      .update({ interest_score: newScore, updated_at: new Date().toISOString() })
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
