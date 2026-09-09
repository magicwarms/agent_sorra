import { t } from "elysia";

export const GatewayDTO = {
  message: t.String(),
  threadId: t.Optional(t.String()),
};
