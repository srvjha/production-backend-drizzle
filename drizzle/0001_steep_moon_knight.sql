ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar(4096);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_token" varchar(4096);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token" varchar(4096);