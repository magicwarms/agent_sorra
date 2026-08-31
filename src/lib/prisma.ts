import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["warn", "error"],
  errorFormat: "pretty",
  accelerateUrl: process.env.DATABASE_URL,
});
