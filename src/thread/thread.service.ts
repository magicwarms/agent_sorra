import { Prisma } from "../generated/prisma";
import { CreateThreadDTO, FindAllThreadDTO } from "./thread.dto";
import {
  countAllThread,
  createThread,
  findAllThreads,
  updateTotalTokenUsageByThreadId,
} from "./thread.repository";

export const storeThread = async (data: CreateThreadDTO) => {
  const storeData: Prisma.ThreadCreateInput = {
    user: {
      connect: { id: data.userId },
    },
    title: data.title,
  };
  return await createThread(storeData);
};

export const getAllThreads = async (payload: FindAllThreadDTO) => {
  const { pageNumber, perPage } = payload;
  const [threads, totalThread] = await Promise.all([
    findAllThreads(payload),
    countAllThread(payload.userId),
  ]);

  const totalPages = Math.ceil(totalThread / perPage);

  return {
    threads,
    meta: {
      total: totalThread,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    },
  };
};

export const updateThreadToken = async (
  threadId: string,
  totalToken: number,
) => {
  return await updateTotalTokenUsageByThreadId(threadId, totalToken);
};
