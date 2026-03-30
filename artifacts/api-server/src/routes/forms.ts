import { Router, type IRouter } from "express";
import { db, formsTable, submissionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as XLSX from "xlsx";
import {
  CreateFormBody,
  UpdateFormBody,
  SubmitFormBody,
} from "@workspace/api-zod";
import { appendToGoogleSheet, createSheetForForm, shareSheetWithEmail } from "../lib/googleSheets.js";

const router: IRouter = Router();

function serializeForm(form: typeof formsTable.$inferSelect) {
  return {
    ...form,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

async function setupGoogleSheet(formId: string, formTitle: string, email: string): Promise<{ sheetId: string | null; sheetUrl: string | null }> {
  try {
    const result = await createSheetForForm(formTitle, email);
    if (result) {
      await db.update(formsTable).set({
        googleSheetId: result.sheetId,
        googleSheetUrl: result.sheetUrl,
        googleSheetEmail: email,
        updatedAt: new Date(),
      }).where(eq(formsTable.id, formId));
      return result;
    }
  } catch (err) {
    // Non-fatal
  }
  return { sheetId: null, sheetUrl: null };
}

function serializeSubmission(sub: typeof submissionsTable.$inferSelect) {
  return {
    ...sub,
    totalAmount: Number(sub.totalAmount),
    createdAt: sub.createdAt.toISOString(),
  };
}

router.get("/forms", async (req, res) => {
  try {
    const forms = await db.select().from(formsTable).orderBy(
      sql`${formsTable.createdAt} DESC`,
    );
    res.json(forms.map(serializeForm));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch forms" });
  }
});

router.post("/forms", async (req, res) => {
  try {
    const body = CreateFormBody.parse(req.body);
    const formId = nanoid();
    const form = await db
      .insert(formsTable)
      .values({
        id: formId,
        title: body.title,
        description: body.description ?? null,
        items: (body.items ?? []) as any,
        deliveryMode: body.deliveryMode ?? "Pickup Only",
        paymentMethod: body.paymentMethod ?? "Cash on Delivery (COD)",
        orderDeadline: body.orderDeadline ?? null,
        pickupTime: body.pickupTime ?? null,
        pickupLocation: body.pickupLocation ?? null,
        googleSheetEmail: (body as any).googleSheetEmail ?? null,
      })
      .returning();

    // Auto-create Google Sheet if email provided
    if ((body as any).googleSheetEmail) {
      setupGoogleSheet(formId, body.title, (body as any).googleSheetEmail).catch((e) =>
        req.log.warn({ e }, "Google Sheet setup failed"),
      );
    }

    // Return immediately with latest data
    const latest = await db.select().from(formsTable).where(eq(formsTable.id, formId));
    res.status(201).json(serializeForm(latest[0] ?? form[0]));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

router.get("/forms/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const forms = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.slug, slug));
    if (!forms[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    if (!forms[0].isPublished) {
      return res.status(404).json({ error: "not_found", message: "Form not published" });
    }
    res.json(serializeForm(forms[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch form" });
  }
});

router.get("/forms/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const forms = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId));
    if (!forms[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    res.json(serializeForm(forms[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch form" });
  }
});

router.put("/forms/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const body = UpdateFormBody.parse(req.body);
    const existing = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId));
    if (!existing[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    const newEmail = (body as any).googleSheetEmail as string | undefined;
    const emailChanged = newEmail !== undefined && newEmail !== existing[0].googleSheetEmail;

    const updated = await db
      .update(formsTable)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.items !== undefined && { items: body.items as any }),
        ...(body.deliveryMode !== undefined && { deliveryMode: body.deliveryMode }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
        ...(body.orderDeadline !== undefined && { orderDeadline: body.orderDeadline }),
        ...(body.pickupTime !== undefined && { pickupTime: body.pickupTime }),
        ...(body.pickupLocation !== undefined && { pickupLocation: body.pickupLocation }),
        ...(newEmail !== undefined && { googleSheetEmail: newEmail }),
        // Clear sheet data if email changed so we create a new sheet
        ...(emailChanged && { googleSheetId: null, googleSheetUrl: null }),
        updatedAt: new Date(),
      })
      .where(eq(formsTable.id, formId))
      .returning();

    // If email changed or newly added, set up a new Google Sheet
    if (emailChanged && newEmail) {
      const titleForSheet = body.title ?? existing[0].title;
      setupGoogleSheet(formId, titleForSheet, newEmail).catch((e) =>
        req.log.warn({ e }, "Google Sheet setup failed"),
      );
    }

    res.json(serializeForm(updated[0]));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

router.delete("/forms/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const existing = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId));
    if (!existing[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    await db.delete(formsTable).where(eq(formsTable.id, formId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to delete form" });
  }
});

router.post("/forms/:formId/publish", async (req, res) => {
  try {
    const { formId } = req.params;
    const existing = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId));
    if (!existing[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    const slug = existing[0].slug ?? nanoid(8);
    const updated = await db
      .update(formsTable)
      .set({ isPublished: true, slug, updatedAt: new Date() })
      .where(eq(formsTable.id, formId))
      .returning();
    res.json(serializeForm(updated[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to publish form" });
  }
});

router.get("/forms/:formId/submissions", async (req, res) => {
  try {
    const { formId } = req.params;
    const subs = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId))
      .orderBy(sql`${submissionsTable.createdAt} DESC`);
    res.json(subs.map(serializeSubmission));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch submissions" });
  }
});

router.post("/forms/:formId/submissions", async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId));
    if (!form[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    const body = SubmitFormBody.parse(req.body);
    const submission = await db
      .insert(submissionsTable)
      .values({
        id: nanoid(),
        formId,
        customerName: body.customerName,
        phone: body.phone,
        address: body.address,
        items: body.items as any,
        totalItems: body.totalItems,
        totalAmount: String(body.totalAmount),
        paymentMethod: form[0].paymentMethod,
        deliveryMode: form[0].deliveryMode,
      })
      .returning();

    const sub = serializeSubmission(submission[0]);

    try {
      if (form[0].googleSheetId) {
        await appendToGoogleSheet(form[0].googleSheetId, sub, form[0]);
      }
    } catch (sheetErr) {
      req.log.warn({ sheetErr }, "Failed to write to Google Sheets (non-fatal)");
    }

    res.status(201).json(sub);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

router.get("/forms/:formId/submissions/export", async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await db.select().from(formsTable).where(eq(formsTable.id, formId));
    if (!form[0]) {
      return res.status(404).json({ error: "not_found", message: "Form not found" });
    }
    const subs = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId))
      .orderBy(sql`${submissionsTable.createdAt} DESC`);

    const rows = subs.map((s) => {
      const items = (s.items as any[]) || [];
      return {
        "Timestamp": s.createdAt.toISOString(),
        "Name": s.customerName,
        "Phone": s.phone,
        "Address": s.address,
        "Items": items.map((i: any) => `${i.itemName} x${i.quantity}`).join(", "),
        "Total Items": s.totalItems,
        "Total Amount": Number(s.totalAmount),
        "Payment Method": s.paymentMethod,
        "Delivery Mode": s.deliveryMode,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="orders-${formId}.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buf);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Export failed" });
  }
});

export default router;
