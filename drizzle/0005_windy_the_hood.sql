ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_deleted_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_deleted_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "deleted_by_id";
--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "deleted_at";
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "deleted_by_id";
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "deleted_at";