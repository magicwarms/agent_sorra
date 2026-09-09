import {
  createAgent,
  modelRetryMiddleware,
  summarizationMiddleware,
  toolRetryMiddleware,
} from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import {
  findRecipe,
  getCommonInfo,
  getWeather,
  webSearch,
} from "./tools.service";
import { assistantSystemPrompt, threadTitleMakerPrompt } from "./system_prompt";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { AgentDTO } from "./agent.dto";
import { storeThread } from "../thread/thread.service";

const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL as string,
);
await checkpointer.setup();

const mainAgent = createAgent({
  model: new ChatOpenAI({ model: process.env.OPENAI_MODEL as string }),
  tools: [findRecipe, getWeather, webSearch, getCommonInfo],
  systemPrompt: assistantSystemPrompt,
  checkpointer,
  name: "main_agent_sorra",
  middleware: [
    modelRetryMiddleware({ maxRetries: 3 }),
    toolRetryMiddleware({ maxRetries: 2 }),
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

  if (threadId || threadId !== "") return threadId;

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

  const response = result.messages;
  const toolCalls = response.flatMap((message) =>
    "tool_calls" in message && Array.isArray(message.tool_calls)
      ? message.tool_calls
      : [],
  );
  // ambil usage token yang di hasilkan dan token prompt nya wak
  console.log({
    response: response[response.length - 1],
    toolCalls: JSON.stringify(toolCalls, null, 2),
  });

  return {
    message: response[response.length - 1]!.text,
    toolCalls,
    threadId,
  };
};
