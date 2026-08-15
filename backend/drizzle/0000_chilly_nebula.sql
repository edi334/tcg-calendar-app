CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"store_name" text NOT NULL,
	"address" text NOT NULL,
	"country" text,
	"lat" double precision,
	"lng" double precision,
	"start_time" timestamp with time zone NOT NULL,
	"timezone" text,
	"price_amount" double precision,
	"price_currency" text,
	"format" text,
	"source_url" text,
	"last_synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_game_type_idx" ON "events" USING btree ("game","event_type");