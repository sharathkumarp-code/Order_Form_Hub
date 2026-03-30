import { pgTable, text, integer, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderItemSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  price: z.number(),
  quantity: z.number().int(),
  total: z.number(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey(),
  formId: text("form_id").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  items: jsonb("items").notNull().default([]),
  totalItems: integer("total_items").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("Cash on Delivery (COD)"),
  deliveryMode: text("delivery_mode").notNull().default("Pickup Only"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  createdAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
