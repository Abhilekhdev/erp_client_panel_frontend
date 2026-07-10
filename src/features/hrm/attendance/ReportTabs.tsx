import { useQuery } from '@tanstack/react-query';
import { Download, Info } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAttendanceByDate, getAttendanceByShift } from '../attendance.api';

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

const IMPORT_COLUMNS = [
  ['1', 'Email', 'Required'],
  ['2', 'Clock in time', 'Required (Y-m-d H:i:s)'],
  ['3', 'Clock out time', 'Optional'],
  ['4', 'Activity Code', 'Optional'],
  ['5', 'Shift', 'Optional'],
  ['6', 'Clock in note', 'Optional'],
  ['7', 'Clock out note', 'Optional'],
  ['8', 'IP address', 'Optional'],
];

export function ImportTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span>Bulk Excel import is being finalised. The expected file format is below.</span>
      </div>
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-md bg-emerald-600/70 px-3 py-2 text-sm font-medium text-white opacity-60"
      >
        <Download className="h-4 w-4" />
        Download template
      </button>
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
