import Elysia, { StatusMap, t } from "elysia";
import { isAPIError } from "better-auth/api";
import { CreateUserDTO, LoginUserDTO } from "./user.dto";
import { loginUser, storeUser } from "./user.service";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";

const DUPLICATE_CODES = new Set([
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "USERNAME_IS_ALREADY_TAKEN",
]);

// better-auth melempar APIError dengan status sendiri; duplikat email/username dijadikan 409.
const toUserError = (error: unknown, code: unknown) => {
  if (error instanceof ElysiaError) return error;
  if (isAPIError(error)) {
    const authCode = error.body?.code;
    const status =
      authCode && DUPLICATE_CODES.has(authCode) ? 409 : error.statusCode;
    return new ElysiaError(formatError(error), authCode ?? code, status);
  }
  return new ElysiaError(formatError(error), code);
};

export const userController = new Elysia({
  prefix: "/users",
  detail: { tags: ["User"] },
})
  .use(jwtConfig())
  .error({ ElysiaError })
  .onError(({ code, error }) => toUserError(error, code))
  .post(
    "/",
    async ({ body, headers }) => {
      const username = body.username?.trim();
      const user = await storeUser(
        {
          name: body.name,
          email: body.email,
          password: body.password,
          ...(username ? { username } : {}),
        },
        headers,
      );

      return {
        success: true,
        message: "Register User successfull",
        data: user,
      };
    },
    {
      body: t.Object(CreateUserDTO),
      response: standardResponse.response,
      detail: {
        summary: "Register user",
        tags: ["User"],
      },
    },
  )
  .post(
    "/login",
    async ({ jwt, body, headers }) => {
      const login = await loginUser(
        {
          email: body.email,
          password: body.password,
          username: body.username,
        },
        headers,
      );

      return {
        success: true,
        message: "Login user successfull",
        data: {
          ...login,
          token: await jwt.sign({
            name: login.user.name,
            userId: login.user.id,
            email: login.user.email,
            username: login.user.username,
          }),
        },
      };
    },
    {
      body: t.Object(LoginUserDTO),
      response: standardResponse.response,
      detail: {
        summary: "Login user",
        tags: ["User"],
      },
    },
  );

userController.guard(
  {
    detail: {
      description: "Require user to be logged in",
      tags: ["User"],
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
        "/profile",
        ({ user }) => {
          return {
            success: true,
            data: {
              userId: user.userId,
              email: user.email,
            },
            message: "User profile",
          };
        },
        {
          response: standardResponse.response,
          detail: {
            summary: "Get user profile",
          },
        },
      ),
);
