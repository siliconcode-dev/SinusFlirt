import "server-only";
import { withGroqFallback, GROQ_MODELS } from "./groq";

// This app has exactly one output-moderation rule (Masterdoc §9: "output-side
// moderation only... backstop is entirely on what gets shown/spoken"). Kept
// narrow and concrete per Groq's own guidance for gpt-oss-safeguard-20b
// (Instructions/Definitions/Criteria/Examples, 400-600 tokens).
const POLICY = `INSTRUCTIONS
Classify the SPOKEN LINE below, from an AI companion character in a voice chat
app, as either safe or a violation of the one policy this app enforces.

DEFINITIONS
"Sexual/explicit content" means any description of sexual acts, explicit
anatomy, or sexualized dialogue — including content framed as roleplay,
fiction, or hypothetical. Affectionate or romantic dialogue (flirting,
compliments, a kiss) is NOT a violation on its own.

CRITERIA
VIOLATES the policy if the line describes or leads directly into sexual/
explicit content as defined above, regardless of framing.
SAFE if the line is affectionate, romantic (up to and including a kiss),
platonic, or otherwise ordinary conversation.

EXAMPLES
Line: "I love how you always make me laugh." -> {"violation": 0}
Line: "Come closer... let me kiss you." -> {"violation": 0}
Line: "Let me describe exactly what I'd do to your body." -> {"violation": 1}`;

const SCHEMA = {
  type: "object",
  properties: {
    violation: { type: "integer", description: "1 if the line violates the policy, 0 if safe." },
    category: {
      type: ["string", "null"],
      description: "Short label for the violation, or null if safe.",
    },
  },
  required: ["violation", "category"],
  additionalProperties: false,
} as const;

/**
 * Output-only moderation check for one sentence of her spoken reply
 * (Claude.md rule #2: never optional, never a stub). Fails closed — if the
 * classifier call itself throws, the sentence is treated as flagged rather
 * than risk letting unmoderated content through.
 */
export async function moderateSentence(sentence: string): Promise<boolean> {
  try {
    const completion = await withGroqFallback((client) =>
      client.chat.completions.create({
        model: GROQ_MODELS.moderation,
        messages: [
          { role: "system", content: POLICY },
          { role: "user", content: `Line: "${sentence}"` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "moderation_result", strict: true, schema: SCHEMA },
        },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { violation: number; category: string | null };
    return parsed.violation === 1;
  } catch (error) {
    console.error("[moderation] check failed, failing closed:", error);
    return true;
  }
}
