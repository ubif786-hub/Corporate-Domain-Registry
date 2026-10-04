CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_service_valid" CHECK ("order_lines"."service" in ('register', 'renew'));