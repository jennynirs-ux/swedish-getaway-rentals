// @ts-nocheck
/**
 * Generic CSV export utility for admin data tables.
 * Handles escaping, BOM for Excel compatibility, and download trigger.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape fields containing commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(rows: CsvRow[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => escapeCsvField(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(c => escapeCsvField(row[c.key])).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(csv: string, filename: string): void {
  // UTF-8 BOM for Excel compatibility with Swedish characters (å, ä, ö)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv(
  rows: CsvRow[],
  columns: { key: string; label: string }[],
  filename: string
): void {
  const csv = generateCsv(rows, columns);
  downloadCsv(csv, filename);
}
