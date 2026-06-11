ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_active_unique" ON "users" USING btree ("email") WHERE deleted_at IS NULL;