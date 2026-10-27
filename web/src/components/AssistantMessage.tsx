import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatUsage } from "../lib/format";
import type { UiMessage } from "../types";
import { ToolCallRow } from "./ToolCallRow";

type AssistantMessageData = Extract<UiMessage, { role: "assistant" }>;

const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

const remarkPlugins = [remarkGfm];

const Markdown = memo(
  ({ text, streaming }: { text: string; streaming: boolean }) => (
    <div className={streaming ? "md is-streaming" : "md"}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  ),
);

const Pending = ({ label }: { label: string }) => (
  <p className="status">
    <span className="dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
    {label}
  </p>
);

type Props = {
  message: AssistantMessageData;
  live: boolean;
  preparing: boolean;
  afterTool: boolean;
  stopped: boolean;
};

export const AssistantMessage = memo(
  ({ message, live, preparing, afterTool, stopped }: Props) => {
    const { text, toolCalls, usage } = message;
    const toolRunning = toolCalls.some((toolCall) => toolCall.status === "running");
    // Jeda tanpa token: sebelum token pertama, atau setelah tool selesai sampai teks berikutnya.
    const waiting = live && !preparing && !toolRunning && (!text || afterTool);
    if (!text && toolCalls.length === 0 && !live && !stopped) return null;

    return (
      <div className="msg msg-assistant" aria-live="polite">
        {toolCalls.length > 0 && (
          <div className="tools">
            {toolCalls.map((toolCall) => (
              <ToolCallRow key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}
        {text && <Markdown text={text} streaming={live && !waiting} />}
        {live && preparing && <Pending label="Menyiapkan percakapan…" />}
        {waiting && <Pending label="Menyusun jawaban…" />}
        {stopped && <p className="note">Dihentikan.</p>}
        {!live && usage && usage.totalTokens > 0 && (
          <p className="usage">{formatUsage(usage)}</p>
        )}
      </div>
    );
  },
);
