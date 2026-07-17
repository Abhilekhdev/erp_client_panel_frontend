import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, Info, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  getAttendanceByDate,
  getAttendanceByShift,
  importAttendance,
  type ImportResult,
  type ImportRow,
} from '../attendance.api';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'px-3 py-2 text-sm border-t border-border align-top';

export function ByShiftTab() {
  const [date, setDate] = useState(today);
  const { data } = useQuery({ queryKey: ['att-by-shift', date], queryFn: () => getAttendanceByShift(date) });
  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Shift</th>
                <th className={th}>Present</th>
                <th className={th}>Absent</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length ? (
                data.rows.map((r) => (
                  <tr key={r.shift}>
                    <td className={`${td} font-medium`}>{r.shift}</td>
                    <td className={td}>
                      <span className="mr-2 font-semibold">{r.presentCount}</span>
                      <span className="flex flex-wrap gap-1">
                        {r.present.map((n) => <Badge key={n} variant="success">{n}</Badge>)}
                      </span>
                    </td>
                    <td className={td}>
                      <span className="mr-2 font-semibold">{r.absentCount}</span>
                      <span className="flex flex-wrap gap-1">
                        {r.absent.map((n) => <Badge key={n} variant="secondary">{n}</Badge>)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ByDateTab() {
  const [range, setRange] = useState({ start: daysAgo(6), end: today() });
  const { data } = useQuery({
    queryKey: ['att-by-date', range],
    queryFn: () => getAttendanceByDate(range.start, range.end),
  });
  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" className="w-44" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" className="w-44" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Present</th>
                <th className={th}>Absent</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length ? (
                data.rows.map((r) => (
                  <tr key={r.date}>
                    <td className={`${td} font-medium`}>{r.date}</td>
                    <td className={td}>{r.present}</td>
                    <td className={td}>{r.absent}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// A clear, standard date-time format with a concrete example (no more cryptic "Y-m-d H:i:s").
const DATETIME_HINT = 'YYYY-MM-DD HH:MM:SS (e.g. 2026-07-16 09:30:00)';

const IMPORT_COLUMNS = [
  ['1', 'Email', 'Required — the employee’s login email'],
  ['2', 'Clock in time', `Required — ${DATETIME_HINT}`],
  ['3', 'Clock out time', `Optional — ${DATETIME_HINT}`],
  ['4', 'Activity Code', 'Optional'],
  ['5', 'Shift', 'Optional — the shift name'],
  ['6', 'Clock in note', 'Optional'],
  ['7', 'Clock out note', 'Optional'],
  ['8', 'IP address', 'Optional'],
];

/** Build + download the attendance import template as a CSV (client-side only — no backend needed). */
function downloadAttendanceTemplate() {
  const headers = IMPORT_COLUMNS.map(([, name]) => name);
  const example = [
    'employee@example.com',
    '2026-07-16 09:30:00',
    '2026-07-16 18:00:00',
    '',
    'Morning Shift',
    '',
    '',
    '',
  ];
  const csv = [headers, example].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance-import-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse one CSV line into fields, honouring double-quoted values with escaped "" quotes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Turn the uploaded CSV text into import rows (template column order; header row auto-skipped). */
function csvToRows(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const first = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
  const startIdx = first[0] === 'email' ? 1 : 0; // skip header if present
  return lines.slice(startIdx).map((line) => {
    const c = parseCsvLine(line);
    return {
      email: c[0] ?? '',
      clockInTime: c[1] ?? '',
      clockOutTime: c[2] || undefined,
      activityCode: c[3] || undefined,
      shift: c[4] || undefined,
      clockInNote: c[5] || undefined,
      clockOutNote: c[6] || undefined,
      ipAddress: c[7] || undefined,
    };
  });
}

export function ImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const upload = useMutation({
    mutationFn: (rows: ImportRow[]) => importAttendance(rows),
    onSuccess: (r) => setResult(r),
    onError: (e) => setError(getApiErrorMessage(e, 'Could not import attendance')),
  });

  const onFile = async (file: File) => {
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = csvToRows(text);
      if (!rows.length) {
        setError('The file has no data rows.');
        return;
      }
      upload.mutate(rows);
    } catch {
      setError('Could not read the file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span>Download the template, fill one row per attendance record, then upload. Date-time columns use {DATETIME_HINT}.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={downloadAttendanceTemplate}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Download template
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import from CSV
        </button>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Imported {result.imported} record{result.imported === 1 ? '' : 's'}
            {result.failed > 0 && <span className="text-amber-600">· {result.failed} skipped</span>}
          </div>
          {result.errors.length > 0 && (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Col No.</th>
                <th className={th}>Column Name</th>
                <th className={th}>Instruction</th>
              </tr>
            </thead>
            <tbody>
              {IMPORT_COLUMNS.map(([no, name, ins]) => (
                <tr key={no}>
                  <td className={td}>{no}</td>
                  <td className={`${td} font-medium`}>{name}</td>
                  <td className={`${td} text-muted-foreground`}>{ins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
