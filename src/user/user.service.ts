import { ElysiaError } from "../utils/error-handling";
import { CreateUserType, LoginUserType } from "./user.dto";
import { createUser, signInUser } from "./user.repository";

export const storeUser = async (
  data: CreateUserType,
  headers: Record<string, string | undefined>,
) => {
  return await createUser(data, headers);
};

export const loginUser = async (
  data: LoginUserType,
  headers: Record<string, string | undefined>,
) => {
  const login = await signInUser(data, headers);
  console.log({ loginSVC: login });
  if (!login) {
    throw new ElysiaError("Email atau password salah", 401);
  }

  return login;
};
