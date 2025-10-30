import {
  pgTable,
  serial,
  text,
  boolean,
  date,
  time,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const rosters = pgTable("rosters", {
  id: serial("id").primaryKey(),
  employee_id: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  shift_date: date("shift_date").notNull(),
  shift_start: time("shift_start").notNull(),
  shift_end: time("shift_end").notNull(),
  role: text("role"),
  is_weekend: boolean("is_weekend").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const business_requirements = pgTable("business_requirements", {
  id: serial("id").primaryKey(),
  day_of_week: text("day_of_week").notNull(),
  required_chefs: integer("required_chefs").notNull(),
  required_kitchen_hands: integer("required_kitchen_hands").notNull(),
  // Optional time slots per role
  chef_start: time("chef_start"),
  chef_end: time("chef_end"),
  chef_end_is_closing: boolean("chef_end_is_closing").default(false),
  kitchen_start: time("kitchen_start"),
  kitchen_end: time("kitchen_end"),
  kitchen_end_is_closing: boolean("kitchen_end_is_closing").default(false),
  // Optional per-person slot arrays
  chef_slots: jsonb("chef_slots"),
  kitchen_slots: jsonb("kitchen_slots"),
  notes: text("notes"),
});

export const employee_availability = pgTable("employee_availability", {
  id: serial("id").primaryKey(),
  employee_id: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  day_of_week: text("day_of_week").notNull(), // Monday..Sunday
  is_available: boolean("is_available").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
