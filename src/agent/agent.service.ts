import {
  createAgent,
  createMiddleware,
  HumanMessage,
  modelRetryMiddleware,
  summarizationMiddleware,
  toolRetryMiddleware,
} from "langchain";
import { ChatOpenAI, tools } from "@langchain/openai";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import * as z from "zod";
import { findRecipe, getCommonInfo, getWeather } from "./tools.service";
import { assistantSystemPrompt, threadTitleMakerPrompt } from "./system_prompt";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { AgentDTO } from "./agent.dto";
import { storeThread } from "../thread/thread.service";

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
      });
    }
  },
});

const mainAgent = createAgent({
  model: new ChatOpenAI({
    model: process.env.OPENAI_MODEL as string,
  }),
  tools: [
    tools.webSearch({
      userLocation: { country: "ID", type: "approximate" },
    }),
    findRecipe,
    getWeather,
    getCommonInfo,
  ],
  systemPrompt: assistantSystemPrompt,
  checkpointer,
  name: "main_agent_sorra",
  middleware: [
    modelRetryMiddleware({ maxRetries: 3 }),
    toolRetryMiddleware({ maxRetries: 2 }),
    handleToolErrors,
    summarizationMiddleware({
      model: process.env.OPENAI_MODEL as string,
      trigger: { tokens: 4000, messages: 10 },
      keep: { messages: 20 },
    }),
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

const createOrReturnThreadId = async (data: AgentDTO) => {
  const { threadId, message, userId } = data;

  if (threadId !== "") return threadId;

  const threadTitleAgent = generateThreadTitleAgent(message);
  const generateTitle = await threadTitleAgent.invoke(
    { messages: [{ role: "user", content: message }] },
    { maxConcurrency: 2 },
  );
  const thread = await storeThread({
    userId,
    title: generateTitle.structuredResponse.title,
  });

  return thread.id;
};

export const chatWithAgent = async (data: AgentDTO) => {
  const threadId = await createOrReturnThreadId(data);
  const result = await mainAgent.invoke(
    { messages: [{ role: "user", content: data.message }] },
    { configurable: { thread_id: threadId }, maxConcurrency: 5 },
  );

  const finalResponse = result.messages[result.messages.length - 1];
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
  const usageMetadata = AIMessage.isInstance(finalResponse)
    ? finalResponse.usage_metadata
    : undefined;

  return {
    message: finalResponse.text,
    toolCalls,
    threadId,
    usage: {
      promptTokens: usageMetadata?.input_tokens,
      completionTokens: usageMetadata?.output_tokens,
      totalTokens: usageMetadata?.total_tokens,
    },
  };
};
