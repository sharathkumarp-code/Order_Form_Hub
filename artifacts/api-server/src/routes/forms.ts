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


const router: IRouter = Router();

function serializeForm(form: typeof formsTable.$inferSelect) {
  if (!form) return null;
  const flatItems = (form.items as any[]) || [];
  const groups: Record<string, { groupName: string; pickupTime: string; items: any[] }> = {};

  flatItems.forEach((item: any) => {
    const groupName = item.groupName || "Default Group";
    const pickupTime = item.pickupTime || "Not Specified";
    const key = `${groupName}|||${pickupTime}`;
    
    if (!groups[key]) {
      groups[key] = {
        groupName,
        pickupTime,
        items: [],
      };
    }
    // Remove group properties from item for response cleanliness
    const { groupName: _, pickupTime: __, ...itemInfo } = item;
    groups[key].items.push(itemInfo);
  });

  return {
    ...form,
    items: Object.values(groups),
    createdAt: (form.createdAt instanceof Date ? form.createdAt : new Date(form.createdAt)).toISOString(),
    updatedAt: (form.updatedAt instanceof Date ? form.updatedAt : new Date(form.updatedAt)).toISOString(),
  };
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

    // Flatten items from groups for storage
    const flatItems: any[] = [];
    (body.items || []).forEach((group: any) => {
      (group.items || []).forEach((item: any) => {
        flatItems.push({
          ...item,
          groupName: group.groupName,
          pickupTime: group.pickupTime,
        });
      });
    });

    const form = await db
      .insert(formsTable)
      .values({
        id: formId,
        title: body.title,
        description: body.description ?? null,
        items: flatItems as any,
        deliveryMode: body.deliveryMode ?? "Pickup Only",
        paymentMethod: body.paymentMethod ?? "Cash on Delivery (COD)",
        orderDeadline: body.orderDeadline ?? null,
        pickupLocation: body.pickupLocation ?? null,
      })
      .returning();

    if (!form[0]) {
      throw new Error("Failed to create form - no data returned");
    }

    res.status(201).json(serializeForm(form[0]));
  } catch (err) {
    req.log.error(err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: "bad_request", message });
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

    // Flatten items from groups for storage
    let flatItems: any[] | undefined = undefined;
    if (body.items !== undefined) {
      flatItems = [];
      (body.items || []).forEach((group: any) => {
        (group.items || []).forEach((item: any) => {
          flatItems!.push({
            ...item,
            groupName: group.groupName,
            pickupTime: group.pickupTime,
          });
        });
      });
    }

    const updated = await db
      .update(formsTable)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(flatItems !== undefined && { items: flatItems as any }),
        ...(body.deliveryMode !== undefined && body.deliveryMode !== null && { deliveryMode: body.deliveryMode }),
        ...(body.paymentMethod !== undefined && body.paymentMethod !== null && { paymentMethod: body.paymentMethod }),
        ...(body.orderDeadline !== undefined && { orderDeadline: body.orderDeadline }),
        ...(body.pickupLocation !== undefined && { pickupLocation: body.pickupLocation }),

        updatedAt: new Date(),
      })
      .where(eq(formsTable.id, formId))
      .returning();

    if (!updated[0]) {
      throw new Error("Failed to update form - no data returned");
    }

    res.json(serializeForm(updated[0]));
  } catch (err) {
    req.log.error(err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ 
      error: "bad_request", 
      message,
      details: (err as any).issues || (err as any).errors || []
    });
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

    const rows = subs.flatMap((s) => {
      const items = (s.items as any[]) || [];
      return items.map((item) => ({
        "Timestamp": s.createdAt.toISOString(),
        "Name": s.customerName,
        "Phone": s.phone,
        "Address": s.address,
        "Group": item.groupName || "N/A",
        "Pickup Time": item.pickupTime || "N/A",
        "Item": item.itemName,
        "Quantity": item.quantity,
        "Price": item.price,
        "Item Total": item.total,
        "Overall Total": s.totalAmount,
        "Payment": s.paymentMethod,
        "Delivery": s.deliveryMode,
      }));
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
