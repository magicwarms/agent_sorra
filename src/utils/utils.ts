import { randomUUIDv7 } from "bun";
import { t } from "elysia";

export const standardResponse = {
  response: t.Object({
    success: t.Boolean(),
    data: t.Optional(t.Object({})),
    message: t.Optional(t.String()),
  }),
} as const;

export const generateConversationId = () => {
  return randomUUIDv7("base64", new Date());
};

export const toWebHeaders = (headers: Record<string, string | undefined>) =>
  new Headers(
    Object.entries(headers).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value] as [string, string]],
    ),
  );
