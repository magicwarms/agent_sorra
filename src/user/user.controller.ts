import Elysia, { StatusMap, t } from "elysia";
import { CreateUserDTO, LoginUserDTO } from "./user.dto";
import { loginUser, storeUser } from "./user.service";
import { standardResponse } from "../utils/utils";
import { ElysiaError, formatError } from "../utils/error-handling";
import { authGuard, jwtConfig } from "../auth/guard.service";

export const userController = new Elysia({
  prefix: "/users",
  detail: { tags: ["User"] },
})
  .use(jwtConfig)
  .error({ ElysiaError })
  .onError(({ code, error }) => new ElysiaError(formatError(error), code))
  .post(
    "/",
    async ({ body, headers }) => {
      const user = await storeUser(
        {
          name: body.name,
          email: body.email,
          password: body.password,
          username: body.username,
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
        },
        headers,
      );

      return {
        success: true,
        message: "Login user successfull",
        data: {
          ...login,
          token: await jwt.sign({
            userId: login.user.id,
            email: login.user.email,
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
