// keep in sync with src/agent/stream-events.ts
export type Todo = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};
export type UiToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "success" | "error";
  result?: string;
};
export type UiMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "summary"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      toolCalls: UiToolCall[];
      usage?: Usage;
    };
export type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
export type AgentStreamEvent =
  | {
      event: "thread";
      data: { threadId: string; title: string; isNew: boolean };
    }
  | { event: "token"; data: { text: string } }
  | {
      event: "tool_start";
      data: { id: string; name: string; args: Record<string, unknown> };
    }
  | {
      event: "tool_end";
      data: {
        id: string;
        name: string;
        status: "success" | "error";
        result: string;
      };
    }
  | { event: "todos"; data: { todos: Todo[] } }
  | { event: "done"; data: { usage: Usage } }
  | { event: "error"; data: { message: string } };

export type User = {
  id: string;
  name: string;
  email: string;
  username: string;
};
export type Thread = {
  id: string;
  title: string;
  totalToken: number;
  createdAt: string;
};
export type ThreadMeta = {
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
export type ThreadHistory = {
  thread: { id: string; title: string; totalToken: number };
  messages: UiMessage[];
  todos: Todo[];
};
