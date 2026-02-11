ALTER TABLE "harbors" ADD COLUMN "slug" varchar(100) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "harbor_org_slug_idx" ON "harbors" USING btree ("org_id","slug");