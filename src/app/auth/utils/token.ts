import JWT from "jsonwebtoken";

interface UserTokenPayload {
  id: string;
}

export function createUserToken(payload: UserTokenPayload) {
  return JWT.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  });
}

export function verifyUserToken(token: string) {
  try {
    const payload = JWT.verify(
      token,
      process.env.JWT_SECRET!,
    ) as UserTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}
