import * as XLSX from 'xlsx';
import type { MenuGroup, FormItem } from '@workspace/api-client-react';
import { generateId } from './utils';

export async function parseExcelGroups(file: File): Promise<MenuGroup[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (workbook.SheetNames.length === 0) {
          throw new Error("Excel file is empty");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        // We collect flat rows and then group them
        const flatRows: { groupName: string; pickupTime: string; name: string; price: number; category: string; quantity: string }[] = [];

        for (const row of rawData) {
          const keys = Object.keys(row);
          let name = '';
          let price = 0;
          let category = '';
          let quantity = '';
          let groupName = 'General';
          let pickupTime = '';

          for (const key of keys) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (normalizedKey === 'itemname' || normalizedKey === 'item') {
              name = String(row[key]);
            } else if (normalizedKey === 'name' && !name) {
              name = String(row[key]);
            } else if (normalizedKey.includes('price') || normalizedKey === 'cost') {
              price = Number(row[key]);
            } else if (normalizedKey.includes('category') || normalizedKey === 'type') {
              category = String(row[key]);
            } else if (normalizedKey === 'quantity' || normalizedKey === 'qty' || normalizedKey === 'unit') {
              quantity = String(row[key]);
            } else if (normalizedKey === 'groupname' || normalizedKey === 'group') {
              groupName = String(row[key]);
            } else if (normalizedKey === 'pickuptime' || normalizedKey === 'time') {
              pickupTime = String(row[key]);
            }
          }

          if (name && !isNaN(price)) {
            flatRows.push({
              groupName: groupName.trim(),
              pickupTime: pickupTime.trim(),
              name: name.trim(),
              price,
              category: category.trim(),
              quantity: quantity.trim(),
            });
          }
        }

        // Group by groupName + pickupTime
        const groupMap: Record<string, MenuGroup> = {};
        for (const row of flatRows) {
          const key = `${row.groupName}|||${row.pickupTime}`;
          if (!groupMap[key]) {
            groupMap[key] = {
              groupName: row.groupName,
              pickupTime: row.pickupTime,
              items: [],
            };
          }
          const item: FormItem = {
            id: generateId(),
            name: row.name,
            price: row.price,
            category: row.category || null,
            quantity: row.quantity || "",
          };
          groupMap[key].items.push(item);
        }

        resolve(Object.values(groupMap));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export function generateSampleExcel(): void {
  const rows = [
    { 'Group Name': 'Breakfast', 'Pickup Time': '8:00 AM - 11:00 AM', 'Item Name': 'Idli', 'Price': 50, 'Category': 'South Indian', 'Quantity': '2 Pieces' },
    { 'Group Name': 'Breakfast', 'Pickup Time': '8:00 AM - 11:00 AM', 'Item Name': 'Dosa', 'Price': 60, 'Category': 'South Indian', 'Quantity': '1 Piece' },
    { 'Group Name': 'Lunch', 'Pickup Time': '12:00 PM - 3:00 PM', 'Item Name': 'Rice', 'Price': 80, 'Category': 'Main Course', 'Quantity': '0.5 kg' },
    { 'Group Name': 'Lunch', 'Pickup Time': '12:00 PM - 3:00 PM', 'Item Name': 'Biryani', 'Price': 150, 'Category': 'Rice Items', 'Quantity': '1 Plate' },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Group Name
    { wch: 25 }, // Pickup Time
    { wch: 20 }, // Item Name
    { wch: 10 }, // Price
    { wch: 10 }, // Quantity
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Menu Items');
  XLSX.writeFile(wb, 'sample-menu-items.xlsx');
}
