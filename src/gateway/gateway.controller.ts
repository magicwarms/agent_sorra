import Elysia, { StatusMap, t } from "elysia";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";
import { GatewayDTO } from "./gateway.dto";
import { chatWithAgent } from "../agent/agent.service";
import { updateThreadToken } from "../thread/thread.service";

export const gatewayController = new Elysia({
  prefix: "/gateway",
  detail: { tags: ["Gateway"] },
})
  .use(jwtConfig)
  .error({ ElysiaError })
  .onError(({ code, error }) => new ElysiaError(formatError(error), code))
  .onAfterResponse(({ responseValue }) => {
    const {
      data: { threadId, usage },
    } = responseValue as {
      data: { threadId: string; usage: { totalTokens: number } };
    };
    updateThreadToken(threadId, usage.totalTokens).then((data) =>
      data
        ? console.log("update token success")
        : console.log("update token failed"),
    );
  })
  .guard(
    {
      detail: {
        description: "Require user to be logged in to use this API",
        tags: ["Gateway"],
      },
    },
    (app) =>
      app
        .resolve(async ({ jwt, headers, status }) => {
          const payload = await authGuard({ jwt, headers });
          if (!payload.status) {
            return status(401, {
              success: false,
              message: {
                message: "Unauthorized",
                code: StatusMap.Unauthorized,
              },
              data: null,
            });
          }

          return {
            user: payload.data,
          };
        })
        .post(
          "/init",
          async ({ user, body }) => {
            const conversation = await chatWithAgent({
              userId: user.userId,
              email: user.email.trim(),
              message: body.message,
              threadId: body.threadId,
              name: user.name.trim(),
            });

            return {
              success: true,
              data: conversation,
              message: "success",
            };
          },
          {
            body: t.Object(GatewayDTO),
            response: standardResponse.response,
            detail: {
              summary: "Gateway chat for users to start the conversation",
            },
          },
        ),
  );
