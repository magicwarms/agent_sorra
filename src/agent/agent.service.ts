import {
  createAgent,
  createMiddleware,
  HumanMessage,
  llmToolSelectorMiddleware,
  modelRetryMiddleware,
  piiMiddleware,
  summarizationMiddleware,
  todoListMiddleware,
  toolRetryMiddleware,
} from "langchain";
import { ChatOpenAI, tools } from "@langchain/openai";
import {
  AIMessage,
  AIMessageChunk,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import * as z from "zod";
import {
  getCommonInfo,
  getInterviewKnowledge,
  getNodejsKnowledge,
  getRecipe,
  getWeather,
} from "./tools.service";
import { assistantSystemPrompt, threadTitleMakerPrompt } from "./system_prompt";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { AgentDTO } from "./agent.dto";
import {
  getThreadByIdAndUser,
  storeThread,
  updateThreadToken,
} from "../thread/thread.service";
import { ElysiaError } from "../utils/error-handling";
import {
  getServerToolBlocks,
  toUiMessages,
  truncateResult,
  WRITE_TODOS_TOOL,
  type AgentStreamEvent,
  type Todo,
  type UiMessage,
  type Usage,
} from "./stream-events";

const MAIN_MODEL_TAG = "sorra_main";
const MODEL_NODE = "model_request";
const TOOLS_NODE = "tools";
// Tiap putaran agent memakai ~8 step graph (middleware ikut dihitung), default 25 terlalu kecil.
const AGENT_RECURSION_LIMIT = 100;

const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL as string,
);
await checkpointer.setup();

const handleToolErrors = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
        status: "error",
      });
    }
  },
});

const createMainAgent = (name: string, email: string) =>
  createAgent({
    model: new ChatOpenAI({
      model: process.env.OPENAI_MODEL as string,
      user: name,
      tags: [MAIN_MODEL_TAG],
    }),
    tools: [
      tools.webSearch({
        userLocation: { country: "ID", type: "approximate" },
      }),
      getRecipe,
      getWeather,
      getCommonInfo,
      getInterviewKnowledge,
      getNodejsKnowledge,
    ],
    systemPrompt: assistantSystemPrompt(name, email),
    checkpointer,
    name: "main_agent_sorra",
    middleware: [
      todoListMiddleware(),
      modelRetryMiddleware({ maxRetries: 3 }),
      toolRetryMiddleware({ maxRetries: 2 }),
      handleToolErrors,
      summarizationMiddleware({
        model: new ChatOpenAI({
          model: process.env.OPENAI_MODEL as string,
          tags: ["nostream"],
        }),
        trigger: { tokens: 1000, messages: 10 },
        keep: { messages: 20 },
      }),
      llmToolSelectorMiddleware({
        model: new ChatOpenAI({
          model: process.env.OPENAI_TOOL_SELECTOR_MODEL as string,
          tags: ["nostream"],
        }),
        maxTools: 3,
        alwaysInclude: ["get_common_info", WRITE_TODOS_TOOL],
      }),
      // TODO:
      // middleware ini belum jalan, cari tahu wak
      piiMiddleware("email", { strategy: "mask", applyToInput: true }),
      piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
    ],
  });

const generateThreadTitleAgent = (message: string) =>
  createAgent({
    model: new ChatOpenAI({ model: process.env.OPENAI_MODEL as string }),
    systemPrompt: threadTitleMakerPrompt(message),
    responseFormat: z.object({
      title: z.string(),
    }),
  });

const resolveThread = async (
  data: AgentDTO,
): Promise<{ threadId: string; title: string; isNew: boolean }> => {
  const { threadId, message, userId } = data;

  if (threadId) {
    const thread = await getThreadByIdAndUser(threadId, userId);
    if (!thread)
      throw new ElysiaError(
        "Percakapan ini tidak ditemukan.",
        "NOT_FOUND",
        404,
      );

    return { threadId: thread.id, title: thread.title, isNew: false };
  }

  const threadTitleAgent = generateThreadTitleAgent(message);
  const generateTitle = await threadTitleAgent.invoke(
    { messages: [{ role: "user", content: message }] },
    { maxConcurrency: 2 },
  );
  const thread = await storeThread({
    userId,
    title: generateTitle.structuredResponse.title,
  });

  return { threadId: thread.id, title: thread.title, isNew: true };
};

type NodeUpdate = { messages?: BaseMessage[]; todos?: Todo[] } | undefined;

export async function* streamChatWithAgent(
  data: AgentDTO,
  signal: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const thread = await resolveThread(data);
  yield { event: "thread", data: thread };

  const usage: Usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const startedTools = new Map<string, string>();
  const todoCallIds = new Set<string>();

  try {
    const stream = await createMainAgent(data.name, data.email).stream(
      { messages: [{ role: "user", content: data.message }] },
      {
        configurable: { thread_id: thread.threadId },
        streamMode: ["messages", "updates"],
        recursionLimit: AGENT_RECURSION_LIMIT,
        signal,
      },
    );

    for await (const [mode, chunk] of stream) {
      if (mode === "messages") {
        const [message, metadata] = chunk as [
          BaseMessage,
          { langgraph_node?: string; tags?: string[] },
        ];
        if (
          metadata.langgraph_node === MODEL_NODE &&
          metadata.tags?.includes(MAIN_MODEL_TAG) &&
          AIMessageChunk.isInstance(message) &&
          message.text
        )
          yield { event: "token", data: { text: message.text } };
        continue;
      }

      for (const [node, update] of Object.entries(
        chunk as Record<string, NodeUpdate | NodeUpdate[]>,
      )) {
        if (node !== MODEL_NODE && node !== TOOLS_NODE) continue;

        for (const state of ([] as NodeUpdate[]).concat(update)) {
          for (const message of state?.messages ?? []) {
            if (node === MODEL_NODE && AIMessage.isInstance(message)) {
              usage.promptTokens += message.usage_metadata?.input_tokens ?? 0;
              usage.completionTokens +=
                message.usage_metadata?.output_tokens ?? 0;
              usage.totalTokens += message.usage_metadata?.total_tokens ?? 0;

              for (const toolCall of message.tool_calls ?? []) {
                const id = toolCall.id ?? `${message.id}-${toolCall.name}`;
                if (toolCall.name === WRITE_TODOS_TOOL) {
                  todoCallIds.add(id);
                  continue;
                }
                startedTools.set(id, toolCall.name);
                yield {
                  event: "tool_start",
                  data: { id, name: toolCall.name, args: toolCall.args },
                };
              }

              const server = getServerToolBlocks(message);
              for (const call of server.calls) {
                const outcome = server.results.get(call.id);
                yield { event: "tool_start", data: call };
                yield {
                  event: "tool_end",
                  data: {
                    id: call.id,
                    name: call.name,
                    status: outcome?.status ?? "success",
                    result: outcome?.result ?? "",
                  },
                };
              }
            }

            if (node === TOOLS_NODE && ToolMessage.isInstance(message)) {
              if (
                message.name === WRITE_TODOS_TOOL ||
                todoCallIds.has(message.tool_call_id)
              )
                continue;
              yield {
                event: "tool_end",
                data: {
                  id: message.tool_call_id,
                  name:
                    message.name ??
                    startedTools.get(message.tool_call_id) ??
                    "",
                  status: message.status === "error" ? "error" : "success",
                  result: truncateResult(message.text),
                },
              };
            }
          }

          if (node === TOOLS_NODE && state?.todos)
            yield { event: "todos", data: { todos: state.todos } };
        }
      }
    }

    yield { event: "done", data: { usage } };
  } finally {
    if (usage.totalTokens > 0)
      updateThreadToken(thread.threadId, usage.totalTokens)
        .then(() => console.log("update token success"))
        .catch(console.error);
  }
}

export const chatWithAgent = async (data: AgentDTO) => {
  const { threadId } = await resolveThread(data);
  const result = await createMainAgent(data.name, data.email).invoke(
    { messages: [{ role: "user", content: data.message }] },
    {
      configurable: { thread_id: threadId },
      maxConcurrency: 5,
      recursionLimit: AGENT_RECURSION_LIMIT,
    },
  );

  // for testing
  // const result = JSON.parse(
  //   readFileSync("./src/agent/response-mock.json", "utf8"),
  // ) as { messages: any[] };

  const finalResponse = result.messages[result.messages.length - 1];
  // TODO:
  // cari tahu soal todo list ini wak gimana process nya
  const currentMessageIndex = result.messages.reduce(
    (lastIndex, message, index) =>
      HumanMessage.isInstance(message) && message.content === data.message
        ? index
        : lastIndex,
    -1,
  );

  const currentTurnMessages = result.messages.slice(currentMessageIndex + 1);

  const toolCalls = currentTurnMessages.flatMap((message) =>
    AIMessage.isInstance(message)
      ? (message.tool_calls ?? []).map(({ id, name, args, type }) => ({
          id,
          name,
          args,
          type,
        }))
      : [],
  );

  const usage = currentTurnMessages.reduce<Usage>(
    (total, message) => {
      const usageMetadata = AIMessage.isInstance(message)
        ? message.usage_metadata
        : undefined;
      return {
        promptTokens: total.promptTokens + (usageMetadata?.input_tokens ?? 0),
        completionTokens:
          total.completionTokens + (usageMetadata?.output_tokens ?? 0),
        totalTokens: total.totalTokens + (usageMetadata?.total_tokens ?? 0),
      };
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );

  return {
    message: finalResponse.text,
    toolCalls,
    todos: result.todos,
    threadId,
    usage,
  };
};

export const getThreadHistory = async (
  threadId: string,
): Promise<{ messages: UiMessage[]; todos: Todo[] }> => {
  const tuple = await checkpointer.getTuple({
    configurable: { thread_id: threadId },
  });
  if (!tuple) return { messages: [], todos: [] };

  const { messages, todos } = tuple.checkpoint.channel_values as {
    messages?: BaseMessage[];
    todos?: Todo[];
  };

  return { messages: toUiMessages(messages ?? []), todos: todos ?? [] };
};
