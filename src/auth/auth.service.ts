import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../lib/prisma";
import { username } from "better-auth/plugins";
import { randomUUIDv7 } from "bun";

export default betterAuth({
  appName: "AGENT-SORRA",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: false,
  }),
  user: {
    modelName: "User",
  },
  emailAndPassword: {
    minPasswordLength: 8,
    enabled: true,
  },
  rateLimit: {
    window: 10,
    max: 50,
    storage: "database",
  },
  plugins: [username()],
  advanced: {
    database: {
      generateId: () => randomUUIDv7(),
    },
  },
});
