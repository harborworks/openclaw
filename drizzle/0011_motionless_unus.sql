ALTER TABLE "task_comments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "task_comments" CASCADE;--> statement-breakpoint
DROP TABLE "tasks" CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_comment_id_task_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "task_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "comment_id";--> statement-breakpoint
DROP TYPE "public"."task_priority";--> statement-breakpoint
DROP TYPE "public"."task_status";