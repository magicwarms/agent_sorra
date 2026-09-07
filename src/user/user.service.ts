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
  return await signInUser(data, headers);
};
