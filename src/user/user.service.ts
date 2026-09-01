import { CreateUserType } from "./user.dto";
import { createUser } from "./user.repository";

export const storeUser = async (data: CreateUserType) => {
  return await createUser(data);
};
