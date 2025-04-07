ALTER TABLE "jobs" ADD COLUMN "deleted_by_id" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;