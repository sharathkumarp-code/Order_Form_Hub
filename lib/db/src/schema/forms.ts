import { pgTable, text, boolean, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string().nullable().optional(),
  maxQuantity: z.number().int().default(10),
});

export type FormItem = z.infer<typeof formItemSchema>;

export const formsTable = pgTable("forms", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").unique(),
  isPublished: boolean("is_published").notNull().default(false),
  items: jsonb("items").notNull().default([]),
  deliveryMode: text("delivery_mode").notNull().default("Pickup Only"),
  paymentMethod: text("payment_method").notNull().default("Cash on Delivery (COD)"),
  orderDeadline: text("order_deadline"),
  pickupTime: text("pickup_time"),
  pickupLocation: text("pickup_location"),
  googleSheetId: text("google_sheet_id"),
  googleSheetEmail: text("google_sheet_email"),
  googleSheetUrl: text("google_sheet_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
