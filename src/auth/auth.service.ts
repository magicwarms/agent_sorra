import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../lib/prisma";
import { username } from "better-auth/plugins";

export default betterAuth({
  appName: "AGENT-SORRA",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    window: 10,
    max: 50,
  },
  plugins: [username()],
});
