import { api } from '@/lib/api/axios';

interface Envelope<T> { success: boolean; data: T; }

export interface ImportColumn {
  index: number;
  header: string;
  key: string;
  requirement: 'required' | 'optional';
  help: string;
}
export interface ImportIssue { row: number; column: string; message: string }
export interface ImportReport {
  totalRows: number;
  validRows: number;
  imported: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  preview?: { row: number; name: string; type: string }[];
}

/** Two catalogue imports share the same shape, keyed by base path. */
export interface ImportEndpoints {
  columns: string;
  template: string;
  upload: string;
}

export const PRODUCT_IMPORT: ImportEndpoints = {
  columns: '/products/import/columns',
  template: '/products/import/template',
  upload: '/products/import',
};
export const OPENING_STOCK_IMPORT: ImportEndpoints = {
  columns: '/products/import/opening-stock/columns',
  template: '/products/import/opening-stock/template',
  upload: '/products/import/opening-stock',
};

export async function getImportColumns(ep: ImportEndpoints): Promise<ImportColumn[]> {
  const { data } = await api.get<Envelope<{ data: ImportColumn[] }>>(ep.columns);
  return data.data.data;
}

export async function downloadImportTemplate(ep: ImportEndpoints, format: 'xlsx' | 'csv'): Promise<void> {
  const res = await api.get(`${ep.template}?format=${format}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ep.upload.replace(/\//g, '_')}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function runImport(ep: ImportEndpoints, file: File, dryRun: boolean): Promise<ImportReport> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post<Envelope<ImportReport>>(`${ep.upload}${dryRun ? '?dryRun=true' : ''}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
