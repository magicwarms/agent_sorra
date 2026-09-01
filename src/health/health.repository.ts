import prisma from "../lib/prisma";

export const checkHealth = async () => {
  return await prisma.$queryRaw`SELECT 1`;
};
