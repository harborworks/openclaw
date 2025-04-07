ALTER TABLE "memberships" ADD COLUMN "deleted_by_id" integer;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "deleted_by_id" integer;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_by_id" integer;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_by_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;