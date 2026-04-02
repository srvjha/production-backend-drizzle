import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().nonempty(),
  RESEND_API_KEY: z.string().nonempty(),
  EMAIL_FROM_NAME: z.string().default("srvjha"),
  EMAIL_FROM_ADDRESS: z.string().nonempty(),
  BASE_URL: z.string().default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z.string().nonempty(),
  ACCESS_TOKEN_EXPIRY: z.string().default("5m"),
  REFRESH_TOKEN_SECRET: z.string().nonempty(),
  REFRESH_TOKEN_EXPIRY: z.string().default("1d"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(safeParseResult.error.message);
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
