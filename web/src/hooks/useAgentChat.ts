import { useCallback, useEffect, useReducer, useRef } from "react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import type { EventSourceMessage } from "eventsource-parser";
import { ApiError, getThreadMessages, streamChat } from "../lib/api";
import { failRunningTools, groupAssistantRuns } from "../lib/format";
import type { AgentStreamEvent, Todo, UiMessage } from "../types";

export const NOT_FOUND = "Percakapan ini tidak ditemukan.";
export const CONNECTION_LOST = "Koneksi ke agent terputus.";

export type ChatStatus =
  | "idle"
  | "loading"
  | "preparing"
  | "streaming"
  | "error";
export type ChatError = { message: string; retryable: boolean };
type AssistantMessage = Extract<UiMessage, { role: "assistant" }>;
type ThreadInfo = Extract<AgentStreamEvent, { event: "thread" }>["data"];

type State = {
  threadId: string | null;
  title: string | null;
  messages: UiMessage[];
  todos: Todo[];
  status: ChatStatus;
  error: ChatError | null;
  stoppedId: string | null;
  pendingBreak: boolean;
  epoch: number;
};

type Action =
  | { type: "reset" }
  | { type: "load_start"; threadId: string }
  | {
      type: "load_done";
      thread: { id: string; title: string };
      messages: UiMessage[];
      todos: Todo[];
    }
  | { type: "load_fail"; error: ChatError }
  | { type: "send_start"; user: UiMessage; assistant: AssistantMessage }
  | { type: "rewind" }
  | { type: "event"; event: AgentStreamEvent }
  | { type: "stop" }
  | { type: "fail"; error: ChatError };

const initialState: State = {
  threadId: null,
  title: null,
  messages: [],
  todos: [],
  status: "idle",
  error: null,
  stoppedId: null,
  pendingBreak: false,
  epoch: 0,
};

const updateLastAssistant = (
  messages: UiMessage[],
  update: (message: AssistantMessage) => AssistantMessage,
): UiMessage[] => {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === "assistant") {
      const next = messages.slice();
      next[index] = update(message);
      return next;
    }
  }
  return messages;
};

const dropEmptyAssistant = (messages: UiMessage[]): UiMessage[] => {
  const last = messages[messages.length - 1];
  return last?.role === "assistant" &&
    !last.text &&
    last.toolCalls.length === 0
    ? messages.slice(0, -1)
    : messages;
};

const fail = (state: State, error: ChatError): State => ({
  ...state,
  status: "error",
  error,
  messages: dropEmptyAssistant(
    updateLastAssistant(state.messages, (message) => ({
      ...message,
      toolCalls: failRunningTools(message.toolCalls),
    })),
  ),
});

const applyEvent = (state: State, event: AgentStreamEvent): State => {
  switch (event.event) {
    case "thread":
      return {
        ...state,
        threadId: event.data.threadId,
        title: event.data.title,
        status: "streaming",
      };
    case "token": {
      const { text } = event.data;
      return {
        ...state,
        status: "streaming",
        pendingBreak: false,
        messages: updateLastAssistant(state.messages, (message) => ({
          ...message,
          text: message.text
            ? message.text + (state.pendingBreak ? "\n\n" : "") + text
            : text,
        })),
      };
    }
    case "tool_start": {
      const { id, name, args } = event.data;
      return {
        ...state,
        pendingBreak: true,
        messages: updateLastAssistant(state.messages, (message) =>
          message.toolCalls.some((toolCall) => toolCall.id === id)
            ? message
            : {
                ...message,
                toolCalls: [
                  ...message.toolCalls,
                  { id, name, args, status: "running" },
                ],
              },
        ),
      };
    }
    case "tool_end": {
      const { id, name, status, result } = event.data;
      return {
        ...state,
        messages: updateLastAssistant(state.messages, (message) => ({
          ...message,
          toolCalls: message.toolCalls.some((toolCall) => toolCall.id === id)
            ? message.toolCalls.map((toolCall) =>
                toolCall.id === id ? { ...toolCall, status, result } : toolCall,
              )
            : [...message.toolCalls, { id, name, args: {}, status, result }],
        })),
      };
    }
    case "todos":
      return { ...state, todos: event.data.todos };
    case "done":
      return { ...state, status: "idle" };
    case "error":
      return fail(state, {
        message: event.data.message,
        retryable: event.data.message !== NOT_FOUND,
      });
  }
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "reset":
      return { ...initialState, epoch: state.epoch + 1 };
    case "load_start":
      return {
        ...initialState,
        threadId: action.threadId,
        status: "loading",
        epoch: state.epoch + 1,
      };
    case "load_done":
      return {
        ...state,
        threadId: action.thread.id,
        title: action.thread.title,
        messages: action.messages,
        todos: action.todos,
        status: "idle",
      };
    case "load_fail":
      return {
        ...state,
        status: "error",
        error: action.error,
        threadId: action.error.retryable ? state.threadId : null,
      };
    case "send_start":
      return {
        ...state,
        messages: [...state.messages, action.user, action.assistant],
        status: "preparing",
        error: null,
        stoppedId: null,
        pendingBreak: false,
      };
    case "rewind": {
      const messages = state.messages.slice();
      if (messages[messages.length - 1]?.role === "assistant") messages.pop();
      if (messages[messages.length - 1]?.role === "user") messages.pop();
      return { ...state, messages, status: "idle", error: null };
    }
    case "event":
      return applyEvent(state, action.event);
    case "stop": {
      if (state.status !== "preparing" && state.status !== "streaming") {
        return state;
      }
      const last = state.messages.findLast(
        (message) => message.role === "assistant",
      );
      return {
        ...state,
        status: "idle",
        stoppedId: last?.id ?? null,
        messages: updateLastAssistant(state.messages, (message) => ({
          ...message,
          toolCalls: failRunningTools(message.toolCalls),
        })),
      };
    }
    case "fail":
      return fail(state, action.error);
  }
};

const EVENT_NAMES = new Set([
  "thread",
  "token",
  "tool_start",
  "tool_end",
  "todos",
  "done",
  "error",
]);

const parseEvent = (message: EventSourceMessage): AgentStreamEvent | null => {
  if (!message.event || !EVENT_NAMES.has(message.event)) return null;
  try {
    return {
      event: message.event,
      data: JSON.parse(message.data),
    } as AgentStreamEvent;
  } catch {
    return null;
  }
};

const toChatError = (error: unknown): ChatError => {
  if (error instanceof ApiError) {
    if (error.status === 404) return { message: NOT_FOUND, retryable: false };
    if (error.status < 500 && error.message) {
      return { message: error.message, retryable: true };
    }
  }
  return { message: CONNECTION_LOST, retryable: true };
};

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useAgentChat = ({
  onThread,
}: { onThread?: (thread: ThreadInfo) => void } = {}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const onThreadRef = useRef(onThread);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  const loadRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    onThreadRef.current = onThread;
  });

  useEffect(
    () => () => {
      runRef.current++;
      abortRef.current?.abort();
    },
    [],
  );

  const cancelRun = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(async (text: string) => {
    if (abortRef.current || stateRef.current.status === "loading") return;
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runRef.current;
    const isLive = () => runRef.current === runId;

    dispatch({
      type: "send_start",
      user: { id: newId(), role: "user", text },
      assistant: { id: newId(), role: "assistant", text: "", toolCalls: [] },
    });

    try {
      const threadId = stateRef.current.threadId;
      const response = await streamChat(
        { message: text, ...(threadId ? { threadId } : {}) },
        controller.signal,
      );
      if (!response.body) throw new Error("Respons tanpa body.");

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())
        .getReader();

      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isLive()) return;
        const event = parseEvent(value);
        if (!event) continue;
        if (event.event === "done" || event.event === "error") finished = true;
        if (event.event === "thread") onThreadRef.current?.(event.data);
        dispatch({ type: "event", event });
      }
      if (!finished && isLive()) {
        dispatch({
          type: "fail",
          error: { message: CONNECTION_LOST, retryable: true },
        });
      }
    } catch (error) {
      if (isLive() && !controller.signal.aborted) {
        dispatch({ type: "fail", error: toChatError(error) });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (message) void start(message);
    },
    [start],
  );

  const stop = useCallback(() => {
    cancelRun();
    dispatch({ type: "stop" });
  }, [cancelRun]);

  const reset = useCallback(() => {
    cancelRun();
    loadRef.current++;
    dispatch({ type: "reset" });
  }, [cancelRun]);

  const load = useCallback(
    async (threadId: string) => {
      cancelRun();
      const loadId = ++loadRef.current;
      dispatch({ type: "load_start", threadId });
      try {
        const history = await getThreadMessages(threadId);
        if (loadRef.current !== loadId) return;
        dispatch({
          type: "load_done",
          thread: history.thread,
          messages: groupAssistantRuns(history.messages),
          todos: history.todos,
        });
      } catch (error) {
        if (loadRef.current !== loadId) return;
        dispatch({ type: "load_fail", error: toChatError(error) });
      }
    },
    [cancelRun],
  );

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (abortRef.current || current.status === "loading") return;
    if (current.messages.length === 0) {
      if (current.threadId) void load(current.threadId);
      return;
    }
    const lastUser = current.messages.findLast(
      (message) => message.role === "user",
    );
    if (!lastUser) return;
    dispatch({ type: "rewind" });
    void start(lastUser.text);
  }, [load, start]);

  return { ...state, send, stop, retry, load, reset };
};
