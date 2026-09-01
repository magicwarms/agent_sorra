import Elysia, { t } from "elysia";
import { CreateUserDTO } from "./user.dto";
import { storeUser } from "./user.service";
import { standardResponse } from "../utils/utils";

export const userController = new Elysia({
  prefix: "/users",
  detail: { tags: ["User"] },
}).post(
  "/",
  async ({ body }) => {
    const user = await storeUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });

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
);
