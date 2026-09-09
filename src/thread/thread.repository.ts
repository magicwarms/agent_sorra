import prisma from "../lib/prisma";
import { Prisma } from "../generated/prisma";

export const createThread = async (data: Prisma.ThreadCreateInput) => {
  return await prisma.thread.create({ data, select: { id: true } });
};
