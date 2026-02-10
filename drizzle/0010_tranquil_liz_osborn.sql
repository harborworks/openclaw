CREATE TYPE "public"."secret_category" AS ENUM('required', 'custom');--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "secrets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"category" "secret_category" DEFAULT 'custom' NOT NULL,
	"description" varchar(500),
	"encrypted_value" text,
	"iv" varchar(32),
	"auth_tag" varchar(32),
	"is_set" boolean DEFAULT false NOT NULL,
	"pending_sync" boolean DEFAULT true NOT NULL,
	"shire_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_shire_id_shires_id_fk" FOREIGN KEY ("shire_id") REFERENCES "public"."shires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "secret_shire_name_idx" ON "secrets" USING btree ("shire_id","name");