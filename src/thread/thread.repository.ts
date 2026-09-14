import prisma from "../lib/prisma";
import { Prisma } from "../generated/prisma";
import { FindAllThreadDTO } from "./thread.dto";

export const createThread = async (data: Prisma.ThreadCreateInput) => {
  return await prisma.thread.create({ data, select: { id: true } });
};

export const findAllThreads = async (payload: FindAllThreadDTO) => {
  const { userId, pageNumber, perPage } = payload;

  const offset = (pageNumber - 1) * perPage;

  return await prisma.thread.findMany({
    select: { id: true, title: true, totalToken: true, createdAt: true },
    where: { userId },
    skip: offset,
    take: perPage,
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const countAllThread = async (userId: string) => {
  return await prisma.thread.count({ where: { userId } });
};

export const updateTotalTokenUsageByThreadId = async (
  threadId: string,
  totalToken: number,
) => {
  return await prisma.thread.update({
    where: { id: threadId },
    data: { totalToken },
  });
};
