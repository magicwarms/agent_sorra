import Elysia, { sse, StatusMap, t } from "elysia";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";
import { GatewayDTO } from "./gateway.dto";
import { chatWithAgent, streamChatWithAgent } from "../agent/agent.service";
import { updateThreadToken } from "../thread/thread.service";

export const gatewayController = new Elysia({
  prefix: "/gateway",
  detail: { tags: ["Gateway"] },
})
  .use(jwtConfig())
  .error({ ElysiaError })
  .onError(({ code, error }) =>
    error instanceof ElysiaError
      ? error
      : new ElysiaError(formatError(error), code),
  )
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
            if (conversation.usage.totalTokens > 0)
              updateThreadToken(
                conversation.threadId,
                conversation.usage.totalTokens,
              ).catch(console.error);

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
        )
        .post(
          "/stream",
          async function* ({ user, body, request }) {
            try {
              for await (const event of streamChatWithAgent(
                {
                  userId: user.userId,
                  email: user.email.trim(),
                  name: user.name.trim(),
                  message: body.message,
                  threadId: body.threadId,
                },
                request.signal,
              ))
                yield sse(event);
            } catch (error) {
              if (!request.signal.aborted) {
                console.error(error);
                yield sse({
                  event: "error",
                  data: {
                    message:
                      error instanceof ElysiaError && error.statusCode === 404
                        ? error.message
                        : "Agent gagal menjawab. Coba kirim ulang.",
                  },
                });
              }
            }
          },
          {
            body: t.Object(GatewayDTO),
            detail: { summary: "Stream chat with agent (SSE)" },
          },
        ),
  );
