import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const createMessage = async (data: Prisma.MessageCreateArgs) => {
  return await prisma.message.create(data);
};
