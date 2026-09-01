import { createAgent, initChatModel } from "langchain";
import {
  findRecipe,
  getCommonInfo,
  getWeather,
  webSearch,
} from "./tools.service";
import assistantSystemPrompt from "./system_prompt";
import { generateConversationId } from "../utils/utils";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL as string,
);

const model = await initChatModel(process.env.OPENAI_MODEL as string, {
  temperature: 0.5,
  timeout: 300,
  maxTokens: 25000,
});

const agent = createAgent({
  model,
  tools: [findRecipe, getWeather, webSearch, getCommonInfo],
  systemPrompt: assistantSystemPrompt,
  checkpointer,
});

export default async (message: string, threadId?: number) => {
  const conversationId = threadId ?? generateConversationId();
  const result = await agent.invoke(
    { messages: [{ role: "user", content: message }] },
    { configurable: { thread_id: conversationId }, maxConcurrency: 2 },
  );

  const response = result.messages;
  console.log({ response: JSON.stringify(response, null, 2) });

  return response[response.length - 1]!.contentBlocks;
};
