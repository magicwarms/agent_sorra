import jwt from "@elysia/jwt";

export const jwtConfig = () =>
  jwt({
    name: "jwt",
    secret: String(process.env.BETTER_AUTH_SECRET),
    alg: "HS512",
    iat: true,
    exp: "30d",
  });

export const authGuard = async ({ jwt, headers }: any) => {
  const authorization = headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return { status: false, data: {} };
  }

  const token = authorization.split(" ")[1];
  const profile = await jwt.verify(token);
  if (!profile) {
    return { status: false, data: {} };
  }

  return { status: true, data: profile };
};
