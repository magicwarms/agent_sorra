import Elysia, { t } from "elysia";
import { CreateUserDTO, LoginUserDTO } from "./user.dto";
import { loginUser, storeUser } from "./user.service";
import { standardResponse } from "../utils/utils";
import { ElysiaError } from "../utils/error-handling";

export const userController = new Elysia({
  prefix: "/users",
  detail: { tags: ["User"] },
});

userController
  .error({ ElysiaError })
  .onError(({ code, error }) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);

    return new ElysiaError(message, code);
  })
  .post(
    "/",
    async ({ body, headers }) => {
      const user = await storeUser(
        {
          name: body.name,
          email: body.email,
          password: body.password,
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
      },
    },
  )
  .error({ ElysiaError });

userController
  .error({ ElysiaError })
  .onError(({ code, error }) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);

    return new ElysiaError(message, code);
  })
  .post(
    "/login",
    async ({ body, headers }) => {
      const login = await loginUser(
        {
          email: body.email,
          password: body.password,
        },
        headers,
      );
      console.log({ login });
      return {
        success: true,
        message: "Login user successfull",
        data: login,
      };
    },
    {
      body: t.Object(LoginUserDTO),
      response: standardResponse.response,
      detail: {
        summary: "Login user",
      },
    },
  );
