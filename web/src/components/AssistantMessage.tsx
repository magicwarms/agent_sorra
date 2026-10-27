import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
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

type Props = {
  message: AssistantMessageData;
  live: boolean;
  preparing: boolean;
  stopped: boolean;
};

export const AssistantMessage = memo(
  ({ message, live, preparing, stopped }: Props) => {
    const { text, toolCalls } = message;
    const toolRunning = toolCalls.some((toolCall) => toolCall.status === "running");
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
        {text && <Markdown text={text} streaming={live} />}
        {live && preparing && (
          <p className="status">
            <span className="spinner" aria-hidden="true" />
            Menyiapkan percakapan…
          </p>
        )}
        {live && !preparing && !text && !toolRunning && (
          <span className="caret" aria-hidden="true" />
        )}
        {stopped && <p className="note">Dihentikan.</p>}
      </div>
    );
  },
);
