CREATE TABLE "business_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" text NOT NULL,
	"closing_time" time,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_hours_day_of_week_unique" UNIQUE("day_of_week")
);
