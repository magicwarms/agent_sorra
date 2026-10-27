import { memo, useLayoutEffect, useRef } from "react";
import type { ChatError, ChatStatus } from "../hooks/useAgentChat";
import type { UiMessage } from "../types";
import { AssistantMessage } from "./AssistantMessage";

const NEAR_BOTTOM = 96;

const SummaryBlock = memo(({ text }: { text: string }) => (
  <details className="msg summary">
    <summary>Ringkasan percakapan sebelumnya</summary>
    <p>{text}</p>
  </details>
));

type Props = {
  messages: UiMessage[];
  status: ChatStatus;
  pendingBreak: boolean;
  stoppedId: string | null;
  error: ChatError | null;
  onRetry: () => void;
};

export const MessageList = ({
  messages,
  status,
  pendingBreak,
  stoppedId,
  error,
  onRetry,
}: Props) => {
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      NEAR_BOTTOM;
  };

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (status === "preparing") stickToBottom.current = true;
    if (stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, status, error]);

  const busy = status === "preparing" || status === "streaming";
  const lastId = messages[messages.length - 1]?.id;

  return (
    <div className="messages" ref={scroller} onScroll={onScroll}>
      <div className="column">
        {messages.length === 0 && status === "idle" && (
          <p className="empty">
            Tanya soal resep, cuaca, persiapan interview, atau Node.js.
          </p>
        )}
        {status === "loading" && <p className="status">Memuat…</p>}
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="msg msg-user">
                {message.text}
              </div>
            );
          }
          if (message.role === "summary") {
            return <SummaryBlock key={message.id} text={message.text} />;
          }
          return (
            <AssistantMessage
              key={message.id}
              message={message}
              live={busy && message.id === lastId}
              preparing={status === "preparing"}
              afterTool={pendingBreak}
              stopped={message.id === stoppedId}
            />
          );
        })}
        {error && (
          <div className="msg error" role="alert">
            <p>{error.message}</p>
            {error.retryable && (
              <button type="button" className="btn btn-quiet" onClick={onRetry}>
                Kirim ulang
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
