import { t } from "elysia";

export const standardResponse = {
  response: t.Object({
    success: t.Boolean(),
    data: t.Optional(t.Object({})),
    message: t.Optional(t.String()),
  }),
} as const;
