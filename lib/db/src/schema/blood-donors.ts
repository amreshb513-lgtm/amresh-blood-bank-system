import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const bloodDonorsTable = pgTable("blood_donors", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  bloodGroup: varchar("blood_group", { length: 3 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 6 }),
  phone: varchar("phone", { length: 10 }).notNull(),
  available: boolean("available").notNull().default(true),
  lastDonationDate: date("last_donation_date", { mode: "string" }),
  contactConsent: boolean("contact_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBloodDonorSchema = createInsertSchema(bloodDonorsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBloodDonor = typeof bloodDonorsTable.$inferInsert;
export type BloodDonor = typeof bloodDonorsTable.$inferSelect;