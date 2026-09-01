import { Prisma } from "@prisma/client";
import { CreateThreadDTO } from "./thread.dto";
import { createThread } from "./thread.repository";

export const storeThread = async (data: CreateThreadDTO) => {
  const storeData: Prisma.ThreadCreateArgs = {
    data: {
      userId: data.userId,
      title: data.title,
    },
  };
  return await createThread(storeData);
};
