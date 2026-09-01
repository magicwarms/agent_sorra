import { t } from "elysia";

export const CreateUserDTO = {
  name: t.String(),
  email: t.String(),
  password: t.String(),
};

export type CreateUserType = {
  name: string;
  email: string;
  password: string;
};
