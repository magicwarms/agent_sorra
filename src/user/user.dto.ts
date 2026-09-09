import { t } from "elysia";

export const CreateUserDTO = {
  name: t.String(),
  email: t.String({
    format: "email",
  }),
  password: t.String({
    minLength: 8,
    pattern: "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).+$",
    error: "Password harus 8+ karakter, ada huruf besar, kecil, dan angka",
  }),
  username: t.String(),
};

export type CreateUserType = {
  name: string;
  email: string;
  password: string;
  username: string;
};

export const LoginUserDTO = {
  email: t.Optional(
    t.String({
      format: "email",
    }),
  ),
  username: t.Optional(t.String()),
  password: t.String({
    minLength: 8,
    pattern: "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).+$",
    error: "Password harus 8+ karakter, ada huruf besar, kecil, dan angka",
  }),
};

export type LoginUserType = {
  email?: string;
  password: string;
  username?: string;
};
