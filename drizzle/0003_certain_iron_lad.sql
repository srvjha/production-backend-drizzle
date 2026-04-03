ALTER TABLE "users" ADD COLUMN "forgot_password_verification_token" varchar(4096);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "forgot_password_verification_token_expiry" timestamp;