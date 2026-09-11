import Elysia, { StatusMap, t } from "elysia";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";
import { getAllThreads } from "../thread/thread.service";

export const threadController = new Elysia({
  prefix: "/threads",
  detail: { tags: ["Thread"] },
})
  .use(jwtConfig)
  .error({ ElysiaError })
  .onError(({ code, error }) => new ElysiaError(formatError(error), code))
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

            return {
              success: true,
              data: threads,
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
        ),
  );
