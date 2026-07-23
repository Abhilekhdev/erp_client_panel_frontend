/**
 * Download an array of rows as a CSV file — the port of GOURI's report "CSV" export button.
 * `headers` are the column labels; `rows` are arrays aligned to those columns.
 */
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number): string => {
    const s = String(v ?? '');
    // Quote when the value contains a comma, quote or newline; double up embedded quotes.
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
