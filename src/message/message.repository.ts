import prisma from "../lib/prisma";
import { Prisma } from "../generated/prisma";

export const createMessage = async (data: Prisma.MessageCreateInput) => {
  return await prisma.message.create({ data });
};
