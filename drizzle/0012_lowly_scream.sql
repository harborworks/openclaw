CREATE TYPE "public"."org_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "org_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "org_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "memberships" CASCADE;--> statement-breakpoint
ALTER TABLE IF EXISTS "shires" RENAME TO "harbors";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "cognito_id" TO "auth0_id";--> statement-breakpoint
ALTER TABLE "agents" RENAME COLUMN "shire_id" TO "harbor_id";--> statement-breakpoint
ALTER TABLE "secrets" RENAME COLUMN "shire_id" TO "harbor_id";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_cognitoId_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint
ALTER TABLE "orgs" DROP CONSTRAINT IF EXISTS "orgs_deleted_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_shire_id_shires_id_fk";
--> statement-breakpoint
ALTER TABLE "secrets" DROP CONSTRAINT IF EXISTS "secrets_shire_id_shires_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "cognito_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "secret_shire_name_idx";--> statement-breakpoint
ALTER TABLE "orgs" ALTER COLUMN "slug" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "harbors" ADD COLUMN "org_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_org_user_idx" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_harbor_id_harbors_id_fk" FOREIGN KEY ("harbor_id") REFERENCES "public"."harbors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_harbor_id_harbors_id_fk" FOREIGN KEY ("harbor_id") REFERENCES "public"."harbors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harbors" ADD CONSTRAINT "harbors_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_auth0_id_idx" ON "users" USING btree ("auth0_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "secret_harbor_name_idx" ON "secrets" USING btree ("harbor_id","name");--> statement-breakpoint
CREATE INDEX "harbor_org_id_idx" ON "harbors" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "orgs" DROP COLUMN "deleted_by_id";--> statement-breakpoint
ALTER TABLE "orgs" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "superadmin";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "deleted_by_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth0Id_unique" UNIQUE("auth0_id");