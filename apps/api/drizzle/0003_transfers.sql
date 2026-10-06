CREATE TABLE "transfer_codes" (
	"order_id" text NOT NULL,
	"position" smallint NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_codes_order_id_position_pk" PRIMARY KEY("order_id","position")
);
--> statement-breakpoint
ALTER TABLE "order_lines" DROP CONSTRAINT "order_lines_state_valid";--> statement-breakpoint
ALTER TABLE "order_lines" DROP CONSTRAINT "order_lines_reason_valid";--> statement-breakpoint
ALTER TABLE "order_lines" DROP CONSTRAINT "order_lines_service_valid";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_status_valid";--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "transfer" jsonb;--> statement-breakpoint
ALTER TABLE "transfer_codes" ADD CONSTRAINT "transfer_codes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_state_valid" CHECK ("order_lines"."state" in ('awaiting_code', 'new', 'registering', 'registered', 'pending', 'failed', 'unknown'));--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_reason_valid" CHECK ("order_lines"."reason" is null or "order_lines"."reason" in ('taken', 'tucows_on_hold', 'rejected', 'error', 'no_code'));--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_service_valid" CHECK ("order_lines"."service" in ('register', 'renew', 'transfer'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_valid" CHECK ("orders"."status" in ('pending_payment', 'authorized', 'fulfilling', 'pending', 'transferring', 'registered', 'partially_registered', 'failed', 'expired', 'payment_failed', 'amount_mismatch', 'settle_error', 'needs_review', 'stripe_error'));