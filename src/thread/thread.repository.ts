import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const createThread = async (data: Prisma.ThreadCreateArgs) => {
  return await prisma.thread.create(data);
};
