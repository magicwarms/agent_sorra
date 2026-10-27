import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

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

export const WRITE_TODOS_TOOL = "write_todos";
const TOOL_RESULT_MAX_LENGTH = 4000;

const truncateText = (text: string) =>
  text.length > TOOL_RESULT_MAX_LENGTH
    ? `${text.slice(0, TOOL_RESULT_MAX_LENGTH)}…`
    : text;

const truncateStrings = (value: unknown): unknown => {
  if (typeof value === "string") return truncateText(value);
  if (Array.isArray(value)) return value.map(truncateStrings);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, truncateStrings(item)]),
    );
  return value;
};

// Hasil JSON dipotong per nilai string supaya tetap valid dan bisa di-parse UI.
export const truncateResult = (text: string) => {
  if (text.length <= TOOL_RESULT_MAX_LENGTH) return text;
  try {
    return JSON.stringify(truncateStrings(JSON.parse(text)));
  } catch {
    return truncateText(text);
  }
};

// Tool bawaan OpenAI (web_search) tidak masuk `tool_calls`, hanya ada di contentBlocks.
export const getServerToolBlocks = (message: AIMessage) => {
  const calls: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[] = [];
  const results = new Map<
    string,
    { status: "success" | "error"; result: string }
  >();

  for (const block of message.contentBlocks) {
    if (block.type === "server_tool_call") {
      calls.push({
        id: block.id ?? `${message.id}-${calls.length}`,
        name: block.name,
        args: (block.args ?? {}) as Record<string, unknown>,
      });
    } else if (block.type === "server_tool_call_result") {
      results.set(block.toolCallId, {
        status: block.status,
        result: truncateResult(JSON.stringify(block.output ?? {})),
      });
    }
  }

  return { calls, results };
};

type UiAssistantMessage = Extract<UiMessage, { role: "assistant" }>;

const toUsage = (message: AIMessage): Usage | undefined => {
  const metadata = message.usage_metadata;
  return metadata
    ? {
        promptTokens: metadata.input_tokens,
        completionTokens: metadata.output_tokens,
        totalTokens: metadata.total_tokens,
      }
    : undefined;
};

const sumUsage = (
  first: Usage | undefined,
  second: Usage | undefined,
): Usage | undefined =>
  first && second
    ? {
        promptTokens: first.promptTokens + second.promptTokens,
        completionTokens: first.completionTokens + second.completionTokens,
        totalTokens: first.totalTokens + second.totalTokens,
      }
    : (first ?? second);

export const toUiMessages = (messages: BaseMessage[]): UiMessage[] => {
  const uiMessages: UiMessage[] = [];
  const toolCallsById = new Map<string, UiToolCall>();
  // Pemakaian token AIMessage yang tidak tampil (mis. hanya write_todos) dititipkan
  // ke pesan asisten lain dalam giliran yang sama, supaya total per giliran tetap utuh.
  let turnAssistant: UiAssistantMessage | undefined;
  let carriedUsage: Usage | undefined;

  messages.forEach((message, index) => {
    const id = message.id ?? `message-${index}`;

    if (HumanMessage.isInstance(message)) {
      turnAssistant = undefined;
      carriedUsage = undefined;
      uiMessages.push({
        id,
        role:
          message.additional_kwargs?.lc_source === "summarization"
            ? "summary"
            : "user",
        text: message.text,
      });
      return;
    }

    if (AIMessage.isInstance(message)) {
      const functionCalls: UiToolCall[] = (message.tool_calls ?? [])
        .filter((toolCall) => toolCall.name !== WRITE_TODOS_TOOL)
        .map((toolCall, callIndex) => ({
          id: toolCall.id ?? `${id}-call-${callIndex}`,
          name: toolCall.name,
          args: toolCall.args,
          status: "running",
        }));

      const server = getServerToolBlocks(message);
      const serverCalls: UiToolCall[] = server.calls.map((call) => {
        const outcome = server.results.get(call.id);
        return {
          ...call,
          status: outcome?.status ?? "success",
          result: outcome?.result,
        };
      });

      const toolCalls = [...functionCalls, ...serverCalls];
      const text = message.text;
      const usage = toUsage(message);
      if (!text && toolCalls.length === 0) {
        if (turnAssistant)
          turnAssistant.usage = sumUsage(turnAssistant.usage, usage);
        else carriedUsage = sumUsage(carriedUsage, usage);
        return;
      }

      toolCalls.forEach((toolCall) => toolCallsById.set(toolCall.id, toolCall));
      const assistant: UiAssistantMessage = {
        id,
        role: "assistant",
        text,
        toolCalls,
        usage: sumUsage(carriedUsage, usage),
      };
      carriedUsage = undefined;
      turnAssistant = assistant;
      uiMessages.push(assistant);
      return;
    }

    if (ToolMessage.isInstance(message)) {
      const toolCall = toolCallsById.get(message.tool_call_id);
      if (!toolCall) return;
      toolCall.result = truncateResult(message.text);
      toolCall.status = message.status === "error" ? "error" : "success";
    }
  });

  return uiMessages;
};
