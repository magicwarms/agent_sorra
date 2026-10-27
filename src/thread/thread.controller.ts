import Elysia, { StatusMap, t } from "elysia";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";
import { getAllThreads, getThreadByIdAndUser } from "../thread/thread.service";
import { getThreadHistory } from "../agent/agent.service";
import { addKnowledge, findKnowledge } from "../embedding/embedding.service";
import { COLLECTION_NAME } from "../utils/enum";

export const threadController = new Elysia({
  prefix: "/threads",
  detail: { tags: ["Thread"] },
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
        tags: ["Thread"],
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
        .get(
          "/",
          async ({ user, query }) => {
            const page = Math.max(1, query.page);
            const limit = Math.max(1, query.perPage);

            const threads = await getAllThreads({
              pageNumber: page,
              perPage: limit,
              userId: user.userId,
            });
            // DONT DELETE THIS FOR TESTING PURPOSE
            // addKnowledge(
            //   "./docs/nodejs-docs.pdf",
            //   COLLECTION_NAME.NODEJS_GUIDE_DOCS,
            // );
            // const results2 = await findKnowledge(
            //   "What should I prepare before interview?",
            //   COLLECTION_NAME.INTERVIEW_GUIDE_DOCS,
            // );
            // console.log({ results2: JSON.stringify(results2[0]) });
            // const results3 = await findKnowledge(
            //   "what is nodejs?",
            //   COLLECTION_NAME.NODEJS_GUIDE_DOCS,
            // );
            // console.log({ results2: JSON.stringify(results3[0]) });
            return {
              success: true,
              data: {
                threads,
              },
              message: "success",
            };
          },
          {
            query: t.Object({
              page: t.Number({
                error: "page must be a number",
              }),
              perPage: t.Number({
                error: "perPage must be a number",
              }),
            }),
            response: standardResponse.response,
            detail: {
              summary: "Get all user threads",
            },
          },
        )
        .get(
          "/:threadId/messages",
          async ({ user, params }) => {
            const thread = await getThreadByIdAndUser(
              params.threadId,
              user.userId,
            );
            if (!thread)
              throw new ElysiaError(
                "Percakapan ini tidak ditemukan.",
                "NOT_FOUND",
                404,
              );

            const history = await getThreadHistory(thread.id);

            return {
              success: true,
              data: { thread, ...history },
              message: "success",
            };
          },
          {
            params: t.Object({ threadId: t.String() }),
            response: standardResponse.response,
            detail: {
              summary: "Get thread messages and todos",
            },
          },
        ),
  );
