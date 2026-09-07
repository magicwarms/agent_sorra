import auth from "../auth/auth.service";
import { toWebHeaders } from "../utils/utils";
import { CreateUserType, LoginUserType } from "./user.dto";

export const createUser = async (
  data: CreateUserType,
  requestHeaders: Record<string, string | undefined>,
) => {
  return await auth.api.signUpEmail({
    body: data,
    headers: toWebHeaders(requestHeaders),
  });
};

export const signInUser = async (
  data: LoginUserType,
  requestHeaders: Record<string, string | undefined>,
) => {
  console.log({ HEADERS: toWebHeaders(requestHeaders) });
  return await auth.api.signInEmail({
    body: {
      email: data.email,
      password: data.password,
    },
    headers: toWebHeaders(requestHeaders),
  });
};
