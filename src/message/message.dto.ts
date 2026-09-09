import { Role } from "@prisma/client";

export type CreateMessageDTO = {
  threadId: string;
  content: string;
  role: Role;
};
