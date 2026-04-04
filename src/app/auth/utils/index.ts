import { randomBytes, createHmac, createHash } from "node:crypto";
import JWT from "jsonwebtoken";
import { env } from "../../../config/env";
import { StringValue } from "ms";
import { db } from "../../../db";
import { usersTable } from "../../../db/schema";
import { eq } from "drizzle-orm";
import ApiError from "../../../utils/api-error";

interface UserPayload {
  id: string;
  email: string;
}

const hashPassword = (password: string, salt: string) => {
  if (salt.trim().length === 0) {
    salt = randomBytes(32).toString("hex");
  }
  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return { salt, hashedPassword };
};

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

const verifyUserToken = (token: string) => {
  try {
    const decodeToken = JWT.verify(
      token,
      env.ACCESS_TOKEN_SECRET,
    ) as UserPayload;
    return decodeToken;
  } catch (error) {
    return null;
  }
};

const verificationEmailToken = () => {
  const token = randomBytes(32).toString("hex");
  const hashedToken = hashToken(token);
  const oneDayPeriod = Date.now() + 60 * 60 * 1000; // 1 hour
  const tokenExpiry = new Date(oneDayPeriod);
  return { token, hashedToken, tokenExpiry };
};

const generateAccessToken = ({ id, email }: UserPayload) => {
  return JWT.sign({ id, email }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY as StringValue,
  });
};

const generateRefreshToken = (id: string) => {
  return JWT.sign({ id }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY as StringValue,
  });
};

const generateAccessAndRefreshToken = async (userId: string) => {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) {
    throw ApiError.unauthorized("Invalid Request");
  }
  const { id, email } = user;
  const accessToken = generateAccessToken({ id, email });
  const refreshToken = generateRefreshToken(id);

  // add refreshtoken in db
  try {
    await db
      .update(usersTable)
      .set({ refreshToken })
      .where(eq(usersTable.id, id));
  } catch (error: any) {
    throw new ApiError(500, error.message);
  }

  return { accessToken, refreshToken };
};

export {
  hashPassword,
  hashToken,
  verificationEmailToken,
  generateAccessToken,
  generateRefreshToken,
  generateAccessAndRefreshToken,
  verifyUserToken,
  type UserPayload,
};
