import * as XLSX from "xlsx";

/** Exports rows to an RTL Excel sheet with Hebrew headers. */
export function exportExcel(
  filename: string,
  rows: Array<Record<string, string | number>>,
  sheetName = "נתונים",
) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
