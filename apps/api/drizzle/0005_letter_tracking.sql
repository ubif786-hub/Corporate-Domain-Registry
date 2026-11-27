CREATE TABLE "letter_scans" (
	"ref" integer PRIMARY KEY NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reminder_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reminders_sent" smallint DEFAULT 0 NOT NULL;