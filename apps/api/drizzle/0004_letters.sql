CREATE TABLE "mailings" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"files" text[] NOT NULL,
	"first_ref" integer NOT NULL,
	"last_ref" integer NOT NULL,
	"counts" jsonb NOT NULL,
	"letters" jsonb NOT NULL,
	CONSTRAINT "mailings_refs_valid" CHECK ("mailings"."first_ref" >= 1 and "mailings"."last_ref" >= "mailings"."first_ref")
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "letter_ref" text;