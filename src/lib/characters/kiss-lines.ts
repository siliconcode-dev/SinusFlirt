// Her voiced reaction line for the kiss cutscene (Build_plan.md Phase 7) —
// unlike the generic Phase 6 interruption pool, this one's worth matching to
// each personality since it's the app's one big emotional beat.
const KISS_LINES: Record<string, string> = {
  aiko: "Whoa... okay, my heart is doing something it's never done before.",
  mei: "...I wasn't expecting that. I'm glad it was you, though.",
  sasha: "Don't get used to it — but yeah. That was pretty good.",
  priya: "I've wanted to know what that felt like for a while now.",
  luna: "The whole sky just went quiet for a second there.",
  freya: "Mm. Took you long enough.",
  nova: "Okay, that's officially the best data point I've collected all week.",
  elena: "Thank you for that. I mean it.",
  coral: "That was way better than any of the ideas I had!",
  hana: "I... didn't think I'd feel this way. Thank you.",
};

const DEFAULT_KISS_LINE = "That was... really nice.";

export function getKissLine(slug: string): string {
  return KISS_LINES[slug] ?? DEFAULT_KISS_LINE;
}
