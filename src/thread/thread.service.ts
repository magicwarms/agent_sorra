import { Prisma } from "../generated/prisma";
import { CreateThreadDTO } from "./thread.dto";
import { createThread } from "./thread.repository";

export const storeThread = async (data: CreateThreadDTO) => {
  const storeData: Prisma.ThreadCreateInput = {
    user: {
      connect: { id: data.userId },
    },
    title: data.title,
  };
  return await createThread(storeData);
};
