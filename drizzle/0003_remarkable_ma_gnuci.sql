ALTER TABLE "tasks" ADD COLUMN "assigned_to_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_id_idx" ON "tasks" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "assignment_idx" ON "tasks" USING btree ("assigned_to_id","completed_at");--> statement-breakpoint
CREATE INDEX "assigned_at_idx" ON "tasks" USING btree ("assigned_at");