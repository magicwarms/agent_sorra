import { Role } from "@prisma/client";

export type CreateMessageDTO = {
  threadId: number;
  content: string;
  role: Role;
};
