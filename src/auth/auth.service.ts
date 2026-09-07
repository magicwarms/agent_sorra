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
  disabledPaths: ["/is-username-available"],
  plugins: [
    username({
      minUsernameLength: 5,
      maxUsernameLength: 100,
      usernameValidator: (username) => {
        if (username === "admin" || username === "administrator") {
          return false;
        }
        return true;
      },
      displayUsernameValidator: (displayUsername) => {
        // Allow only alphanumeric characters, underscores, and hyphens
        return /^[a-zA-Z0-9_-]+$/.test(displayUsername);
      },
      displayUsernameNormalization: (displayUsername) =>
        displayUsername.toLowerCase(),
      validationOrder: {
        username: "post-normalization",
        displayUsername: "post-normalization",
      },
    }),
  ],
  advanced: {
    database: {
      generateId: () => randomUUIDv7(),
    },
  },
});
