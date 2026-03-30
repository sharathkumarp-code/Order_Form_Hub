import { logger } from "./logger.js";

let googleSheetsClient: any = null;

async function getGoogleSheetsClient() {
  if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
    return null;
  }
  try {
    const { getUncachableGoogleSheetsClient } = await import("../integrations/googleSheets.js");
    return getUncachableGoogleSheetsClient();
  } catch {
    return null;
  }
}

export async function appendToGoogleSheet(
  sheetId: string,
  submission: any,
  form: any,
) {
  const client = await getGoogleSheetsClient();
  if (!client) {
    logger.warn("Google Sheets client not available - skipping sheet write");
    return;
  }

  const items = (submission.items as any[]) || [];
  const itemsStr = items
    .map((i: any) => `${i.itemName} x${i.quantity} (₹${i.total})`)
    .join("; ");

  const values = [
    [
      submission.createdAt,
      submission.customerName,
      submission.phone,
      submission.address,
      itemsStr,
      submission.totalItems,
      submission.totalAmount,
      form.paymentMethod || "Cash on Delivery (COD)",
      form.deliveryMode || "Pickup Only",
    ],
  ];

  await client.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:I",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function createSheetForForm(formTitle: string): Promise<string | null> {
  const client = await getGoogleSheetsClient();
  if (!client) {
    return null;
  }

  const headers = [
    "Timestamp",
    "Name",
    "Phone",
    "Address",
    "Items",
    "Total Items",
    "Total Amount",
    "Payment Method",
    "Delivery Mode",
  ];

  const response = await client.spreadsheets.create({
    requestBody: {
      properties: { title: `Orders: ${formTitle}` },
      sheets: [
        {
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: headers.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                      backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
                      textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  });

  return response.data.spreadsheetId ?? null;
}
