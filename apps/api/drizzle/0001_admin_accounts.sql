CREATE TABLE "admin_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"ip" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text,
	"setup_hash" text,
	"setup_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"password_changed_at" timestamp with time zone,
	"weak_password" boolean DEFAULT false NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "admin_users_role_check" CHECK ("admin_users"."role" in ('owner', 'staff')),
	CONSTRAINT "admin_users_email_check" CHECK (position('@' in "admin_users"."email") > 1)
);
--> statement-breakpoint
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_at_idx" ON "admin_audit" USING btree ("at");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_setup_key" ON "admin_users" USING btree ("setup_hash");