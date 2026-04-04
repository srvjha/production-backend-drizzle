import { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 45 }).notNull(),
  lastName: varchar("last_name", { length: 45 }),
  email: varchar("email", { length: 322 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken:varchar("email_verification_token",{length:4096}),
  emailVerificationTokenExpiry:timestamp("email_verification_token_expiry"),
  password: varchar("password", { length: 66 }),
  forgotPasswordToken:varchar("forgot_password_verification_token",{length:4096}),
  forgotPasswordTokenExpiry:timestamp("forgot_password_verification_token_expiry"),
  salt: text("salt"),
  accessToken:varchar("access_token",{length:4096}),
  refreshToken:varchar("refresh_token",{length:4096}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type User = InferSelectModel<typeof usersTable>
