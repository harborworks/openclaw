ALTER TABLE "tags" DROP CONSTRAINT "tags_deleted_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_deleted_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "deleted_by_id";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "deleted_by_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "deleted_at";