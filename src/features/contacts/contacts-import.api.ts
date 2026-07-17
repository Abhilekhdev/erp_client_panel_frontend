import { api } from '@/lib/api/axios';

export interface ImportColumn {
  index: number;
  header: string;
  key: string;
  requirement: 'required' | 'optional' | 'supplier' | 'documented-only';
  help: string;
}

export interface ImportIssue {
  row: number;
  column: string;
  message: string;
}

export interface ImportReport {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  preview: { row: number; type: string; name: string; mobile: string; contactId: string }[];
  /** Null on a dry run — nothing was written. */
  imported: number | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getImportColumns(): Promise<ImportColumn[]> {
  const { data } = await api.get<Envelope<{ data: ImportColumn[] }>>('/contacts/import/columns');
  return data.data.data;
}

/** The template is generated per request, so it can never drift from the parser. */
export async function downloadTemplate(format: 'xlsx' | 'csv'): Promise<void> {
  const res = await api.get('/contacts/import/template', {
    params: { format },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import_contacts_template.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * `dryRun` validates and reports without writing. The file is re-sent on confirm rather than parked
 * on the server — an abandoned preview leaves nothing behind.
 */
export async function importContacts(file: File, dryRun: boolean): Promise<ImportReport> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<Envelope<ImportReport>>('/contacts/import', form, {
    params: dryRun ? { dryRun: 'true' } : {},
  });
  return data.data;
}
