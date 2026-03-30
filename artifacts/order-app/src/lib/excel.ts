import * as XLSX from 'xlsx';
import type { FormItem } from '@workspace/api-client-react';
import { generateId } from './utils';

export async function parseExcelItems(file: File): Promise<FormItem[]> {
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
        
        const items: FormItem[] = [];

        for (const row of rawData) {
          // Robust key matching (ignore case and whitespace)
          const keys = Object.keys(row);
          let name = '';
          let price = 0;
          let category = '';

          for (const key of keys) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (normalizedKey.includes('name') || normalizedKey === 'item') {
              name = String(row[key]);
            } else if (normalizedKey.includes('price') || normalizedKey === 'cost') {
              price = Number(row[key]);
            } else if (normalizedKey.includes('category') || normalizedKey === 'type') {
              category = String(row[key]);
            }
          }

          if (name && !isNaN(price)) {
            items.push({
              id: generateId(),
              name: name.trim(),
              price: price,
              category: category ? category.trim() : null,
              maxQuantity: 10
            });
          }
        }

        resolve(items);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
