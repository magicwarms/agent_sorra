import { CreateMessageDTO } from "./message.dto";
import { createMessage } from "./message.repository";
import { Prisma } from "@prisma/client";

export const storeMessage = async (data: CreateMessageDTO) => {
  const storeData: Prisma.MessageCreateArgs = {
    data: {
      threadId: data.threadId,
      content: data.content,
      role: data.role,
    },
  };
  return await createMessage(storeData);
};
