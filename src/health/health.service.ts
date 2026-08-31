import { prisma } from "../lib/prisma";

export const healthCheck = async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    success: true,
    data: {},
    message: "Health check successful",
  };
};
