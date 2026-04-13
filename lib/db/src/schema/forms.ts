import { pgTable, text, boolean, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  groupName: z.string(),
  pickupTime: z.string(),
  category: z.string().nullable().optional(),
  quantity: z.string().nullable().optional().default(""),
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
  pickupLocation: text("pickup_location"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
