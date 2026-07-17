import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  downloadTemplate,
  getImportColumns,
  importContacts,
  type ImportIssue,
  type ImportReport,
} from '../contacts-import.api';

const REQUIREMENT_BADGE: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'warning' }> = {
  required: { label: 'Required', variant: 'destructive' },
  supplier: { label: 'Supplier only', variant: 'warning' },
  'documented-only': { label: 'Recommended', variant: 'warning' },
  optional: { label: 'Optional', variant: 'secondary' },
};

function IssueList({ issues, tone }: { issues: ImportIssue[]; tone: 'error' | 'warning' }) {
  const isError = tone === 'error';
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border">
      <Table>
        <THead>
          <TR>
            <TH className="w-20">Row</TH>
            <TH className="w-48">Column</TH>
            <TH>{isError ? 'Problem' : 'Note'}</TH>
          </TR>
        </THead>
        <TBody>
          {issues.map((i, idx) => (
            <TR key={`${i.row}-${i.column}-${idx}`}>
              <TD className="font-mono text-xs">{i.row}</TD>
              <TD className="text-xs font-medium">{i.column}</TD>
              <TD className={isError ? 'text-sm text-destructive' : 'text-sm text-amber-600 dark:text-amber-400'}>
                {i.message}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

/**
 * Contacts → Import.
 *
 * Two deliberate departures from GOURI, both of which it has no answer for: a **preview** before
 * anything is written, and **every** bad row listed at once (GOURI aborts on the first, so a file
 * with 50 problems takes 50 uploads to discover them all).
 */
export function ContactsImportPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');

  const { data: columns } = useQuery({ queryKey: ['contacts-import-columns'], queryFn: getImportColumns });

  const run = useMutation({
    mutationFn: ({ f, dryRun }: { f: File; dryRun: boolean }) => importContacts(f, dryRun),
    onSuccess: (r) => {
      setReport(r);
      setError('');
    },
    onError: (e) => {
      setReport(null);
      setError(getApiErrorMessage(e));
    },
  });

  const pick = (f: File | null) => {
    setFile(f);
    setReport(null);
    setError('');
  };

  const clean = report !== null && report.errors.length === 0;
  const done = report?.imported !== null && report?.imported !== undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Import Contacts"
        description="Bulk-create suppliers and customers from a spreadsheet."
        breadcrumbs={[{ label: 'Contacts' }, { label: 'Import' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadTemplate('xlsx')}>
              <Download className="h-4 w-4" /> Template (.xlsx)
            </Button>
            <Button variant="outline" onClick={() => downloadTemplate('csv')}>
              <Download className="h-4 w-4" /> Template (.csv)
            </Button>
          </div>
        }
      />

      {/* Step 1 — file */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Choose your file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Drop your .xlsx or .csv here, or click to browse</p>
                <p className="text-xs text-muted-foreground">Up to 5 MB / 5,000 rows. Use the template above.</p>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!file || run.isPending}
              onClick={() => file && run.mutate({ f: file, dryRun: true })}
              variant={clean && !done ? 'outline' : 'default'}
            >
              <Upload className="h-4 w-4" /> {run.isPending ? 'Checking…' : 'Check file'}
            </Button>
            {clean && !done && (
              <Button disabled={run.isPending} onClick={() => file && run.mutate({ f: file, dryRun: false })}>
                <CheckCircle2 className="h-4 w-4" /> Import {report.validRows} contact
                {report.validRows === 1 ? '' : 's'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — report */}
      {report && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <div className="flex flex-col gap-3 rounded-lg bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Imported {report.imported} contact{report.imported === 1 ? '' : 's'} successfully.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/customers')}>
                    View customers
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/suppliers')}>
                    View suppliers
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{report.totalRows} rows read</Badge>
                <Badge variant={report.errors.length ? 'destructive' : 'success'}>
                  {report.validRows} ready to import
                </Badge>
                {report.errorRows > 0 && <Badge variant="destructive">{report.errorRows} rows with problems</Badge>}
                {report.warnings.length > 0 && <Badge variant="warning">{report.warnings.length} notes</Badge>}
              </div>
            )}

            {report.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-destructive">
                  Fix these and upload again — nothing has been imported.
                </p>
                <IssueList issues={report.errors} tone="error" />
              </div>
            )}

            {report.warnings.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> These won’t stop the import
                </p>
                <IssueList issues={report.warnings} tone="warning" />
              </div>
            )}

            {!done && report.preview.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Preview (first {report.preview.length})</p>
                <div className="rounded-lg border">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="w-16">Row</TH>
                        <TH>Name</TH>
                        <TH>Type</TH>
                        <TH>Mobile</TH>
                        <TH>Contact ID</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {report.preview.map((p) => (
                        <TR key={p.row}>
                          <TD className="font-mono text-xs text-muted-foreground">{p.row}</TD>
                          <TD className="text-sm font-medium">{p.name}</TD>
                          <TD className="text-sm capitalize">{p.type}</TD>
                          <TD className="text-sm">{p.mobile}</TD>
                          <TD className="font-mono text-xs">{p.contactId}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions — rendered from the same spec the parser uses, so they cannot disagree. */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">File format — 27 columns, in this order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Col</TH>
                  <TH>Header</TH>
                  <TH className="w-36">Requirement</TH>
                  <TH>Notes</TH>
                </TR>
              </THead>
              <TBody>
                {(columns ?? []).map((c) => {
                  const badge = REQUIREMENT_BADGE[c.requirement];
                  return (
                    <TR key={c.index}>
                      <TD className="font-mono text-xs text-muted-foreground">{c.index}</TD>
                      <TD className="text-sm font-medium">{c.header}</TD>
                      <TD>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">{c.help || '—'}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
