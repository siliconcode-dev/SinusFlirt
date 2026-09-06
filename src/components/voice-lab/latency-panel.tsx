import type { TurnLatency } from "./types";

export function LatencyPanel({ turns }: { turns: TurnLatency[] }) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
      <thead>
        <tr>
          {["Turn", "STT ms", "LLM TTFT ms", "LLM total ms", "TTS chunks", "TTS total ms"].map(
            (h) => (
              <th key={h} style={cellStyle}>
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {turns.map((t) => (
          <tr key={t.turn}>
            <td style={cellStyle}>{t.turn}</td>
            <td style={cellStyle}>{t.sttMs ?? "—"}</td>
            <td style={cellStyle}>{t.llmTtftMs ?? "—"}</td>
            <td style={cellStyle}>{t.llmTotalMs ?? "—"}</td>
            <td style={cellStyle}>{t.ttsChunkCount}</td>
            <td style={cellStyle}>{t.ttsTotalMs ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "4px 8px",
  textAlign: "left",
};
