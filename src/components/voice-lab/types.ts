export type TurnLatency = {
  turn: number;
  sttMs: number | null;
  llmTtftMs: number | null;
  llmTotalMs: number | null;
  ttsChunkCount: number;
  ttsTotalMs: number | null;
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
