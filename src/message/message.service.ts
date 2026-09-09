import { CreateMessageDTO } from "./message.dto";
import { createMessage } from "./message.repository";
import { Prisma } from "../generated/prisma";

export const storeMessage = async (data: CreateMessageDTO) => {
  const storeData: Prisma.MessageCreateInput = {
    thread: { connect: { id: data.threadId } },
    content: data.content,
    role: data.role,
  };
  return await createMessage(storeData);
};
