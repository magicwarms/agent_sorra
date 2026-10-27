import { memo } from "react";
import type { UiToolCall } from "../types";

const TOOL_LABELS: Record<string, string> = {
  get_recipe: "Cari resep",
  get_weather: "Cek cuaca",
  get_common_info: "Info umum",
  get_interview_knowledge: "Bahan interview",
  get_nodejs_knowledge: "Dokumentasi Node.js",
  web_search: "Cari di web",
};

const STATUS_LABELS: Record<UiToolCall["status"], string> = {
  running: "Berjalan",
  success: "Selesai",
  error: "Gagal",
};

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

const ToolResult = ({ result }: { result: string }) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result);
  } catch {
    return <pre className="tool-box">{result}</pre>;
  }
  const entries =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.entries(parsed)
      : [];
  if (entries.length > 0) {
    return (
      <div className="tool-box">
        {entries.map(([key, value]) => (
          <div key={key} className="result-item">
            <span className="result-key">{key}</span>
            <pre>{typeof value === "string" ? value : stringify(value)}</pre>
          </div>
        ))}
      </div>
    );
  }
  return <pre className="tool-box">{stringify(parsed)}</pre>;
};

export const ToolCallRow = memo(({ toolCall }: { toolCall: UiToolCall }) => {
  const hasArgs = Object.keys(toolCall.args).length > 0;
  return (
    <details className="tool">
      <summary>
        <span className="tool-name">
          {TOOL_LABELS[toolCall.name] ?? toolCall.name}
        </span>
        <span className={`tool-status is-${toolCall.status}`}>
          {toolCall.status === "running" && (
            <span className="spinner" aria-hidden="true" />
          )}
          {STATUS_LABELS[toolCall.status]}
        </span>
      </summary>
      <div className="tool-body">
        {hasArgs && (
          <section>
            <h4>Input</h4>
            <pre className="tool-box">{stringify(toolCall.args)}</pre>
          </section>
        )}
        {toolCall.result && (
          <section>
            <h4>Hasil</h4>
            <ToolResult result={toolCall.result} />
          </section>
        )}
      </div>
    </details>
  );
});
