// Masterdoc §5.3: "a running relationship summary... rebuilt into her
// context each session." Same shape as tone.ts's getToneDirective.
export function getMemoryDirective(summary: string | null): string {
  if (!summary) return "";
  return `\n\nWhat you remember about him from before: ${summary}`;
}
