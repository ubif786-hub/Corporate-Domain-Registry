CREATE TABLE "order_lines" (
	"order_id" text NOT NULL,
	"position" smallint NOT NULL,
	"domain" text NOT NULL,
	"service" text NOT NULL,
	"label" text NOT NULL,
	"term" smallint NOT NULL,
	"amount_cents" integer NOT NULL,
	"state" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"attempted_at" timestamp with time zone,
	"registered_at" timestamp with time zone,
	"reason" text,
	"opensrs" jsonb,
	"opensrs_order_id" text,
	CONSTRAINT "order_lines_order_id_position_pk" PRIMARY KEY("order_id","position"),
	CONSTRAINT "order_lines_state_valid" CHECK ("order_lines"."state" in ('new', 'registering', 'registered', 'pending', 'failed', 'unknown')),
	CONSTRAINT "order_lines_reason_valid" CHECK ("order_lines"."reason" is null or "order_lines"."reason" in ('taken', 'tucows_on_hold', 'rejected', 'error')),
	CONSTRAINT "order_lines_term_valid" CHECK ("order_lines"."term" between 1 and 10),
	CONSTRAINT "order_lines_amount_not_negative" CHECK ("order_lines"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"test_mode" boolean NOT NULL,
	"opensrs_env" text NOT NULL,
	"currency" text NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"email" text NOT NULL,
	"registrant" jsonb NOT NULL,
	"registrant_ip" text DEFAULT '' NOT NULL,
	"visitor_country" text,
	"agreement" jsonb NOT NULL,
	"stripe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent" text,
	"stripe_events" text[] DEFAULT '{}'::text[] NOT NULL,
	"notified_final" timestamp with time zone,
	"settled_early" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "orders_id_format" CHECK ("orders"."id" ~ '^[0-9]{8}-[a-f0-9]{10}$'),
	CONSTRAINT "orders_status_valid" CHECK ("orders"."status" in ('pending_payment', 'authorized', 'fulfilling', 'pending', 'registered', 'partially_registered', 'failed', 'expired', 'payment_failed', 'amount_mismatch', 'settle_error', 'needs_review', 'stripe_error')),
	CONSTRAINT "orders_currency_valid" CHECK ("orders"."currency" in ('usd', 'cad')),
	CONSTRAINT "orders_opensrs_env_valid" CHECK ("orders"."opensrs_env" in ('test', 'live')),
	CONSTRAINT "orders_subtotal_not_negative" CHECK ("orders"."subtotal_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_log" ADD CONSTRAINT "order_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_lines_domain_idx" ON "order_lines" USING btree (lower("domain"));--> statement-breakpoint
CREATE INDEX "order_lines_opensrs_order_idx" ON "order_lines" USING btree ("opensrs_order_id");--> statement-breakpoint
CREATE INDEX "order_log_order_idx" ON "order_log" USING btree ("order_id","id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "orders_payment_intent_idx" ON "orders" USING btree ("stripe_payment_intent");