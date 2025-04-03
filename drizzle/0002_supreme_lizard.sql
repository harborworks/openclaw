ALTER TABLE "public"."jobs" ALTER COLUMN "tag_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."tags" ALTER COLUMN "tag_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."tag_type";--> statement-breakpoint
CREATE TYPE "public"."tag_type" AS ENUM('bounding-boxes', 'categories', 'time-segments');--> statement-breakpoint
ALTER TABLE "public"."jobs" ALTER COLUMN "tag_type" SET DATA TYPE "public"."tag_type" USING "tag_type"::"public"."tag_type";--> statement-breakpoint
ALTER TABLE "public"."tags" ALTER COLUMN "tag_type" SET DATA TYPE "public"."tag_type" USING "tag_type"::"public"."tag_type";