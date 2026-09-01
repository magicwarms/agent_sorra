import auth from "../auth/auth.service";
import { CreateUserType } from "./user.dto";

export const createUser = async (data: CreateUserType) => {
  return await auth.api.signUpEmail({
    body: data,
  });
};
