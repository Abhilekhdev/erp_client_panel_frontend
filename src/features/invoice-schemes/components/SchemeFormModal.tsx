import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/axios';
import { createInvoiceScheme, getInvoiceScheme, updateInvoiceScheme } from '../invoice-schemes.api';
import type { SchemeType } from '../invoice-schemes.types';

const SEPARATOR = '-';
const TOTAL_DIGITS = [4, 5, 6, 7, 8, 9, 10];
const CURRENT_YEAR = new Date().getFullYear();

function preview(type: SchemeType | '', prefix: string, start: string, digits: number): string {
  if (!type) return 'Not selected';
  const num = String(Number(start) || 0).padStart(digits, '0');
  return type === 'year' ? `${prefix}${CURRENT_YEAR}${SEPARATOR}${num}` : `${prefix}${num}`;
}

interface FormState {
  name: string;
  scheme_type: SchemeType | '';
  prefix: string;
  start_number: string;
  total_digits: number;
  is_default: boolean;
}

const EMPTY: FormState = {
  name: '',
  scheme_type: '',
  prefix: '',
  start_number: '0',
  total_digits: 4,
  is_default: false,
};

export function SchemeFormModal({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: number | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['invoice-scheme', editingId],
    queryFn: () => getInvoiceScheme(editingId as number),
    enabled: open && editingId != null,
  });

  useEffect(() => {
    if (!open) return;
    if (editingId == null) {
      setForm(EMPTY);
      setError('');
    }
  }, [open, editingId]);

  useEffect(() => {
    if (detail) {
      setForm({
        name: detail.name,
        scheme_type: detail.schemeType,
        prefix: detail.prefix ?? '',
        start_number: String(detail.startNumber ?? 0),
        total_digits: detail.totalDigits ?? 4,
        is_default: detail.isDefault,
      });
      setError('');
    }
  }, [detail]);

  const previewText = useMemo(
    () => preview(form.scheme_type, form.prefix, form.start_number, form.total_digits),
    [form.scheme_type, form.prefix, form.start_number, form.total_digits],
  );

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        scheme_type: (form.scheme_type || 'blank') as SchemeType,
        prefix: form.prefix || null,
        start_number: Number(form.start_number) || 0,
        total_digits: form.total_digits,
        is_default: form.is_default,
      };
      return editingId != null ? updateInvoiceScheme(editingId, body) : createInvoiceScheme(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-schemes'] });
      qc.invalidateQueries({ queryKey: ['business-location-options'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save invoice scheme')),
  });

  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.scheme_type) return setError('Please select an invoice format');
    setError('');
    save.mutate();
  };

  const cards: { value: SchemeType; format: string }[] = [
    { value: 'blank', format: 'XXXX' },
    { value: 'year', format: `${CURRENT_YEAR}${SEPARATOR}XXXX` },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId != null ? 'Edit invoice scheme' : 'Add new invoice scheme'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onSubmit} isLoading={save.isPending} disabled={isLoading}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Format type cards + preview */}
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((c) => {
            const active = form.scheme_type === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, scheme_type: c.value }))}
                className={cn(
                  'relative rounded-lg border-2 p-3 text-left transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                )}
              >
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">Format</span>
                <div className="mt-1 break-all font-mono text-sm font-medium">{c.format}</div>
                {active && (
                  <Check className="absolute right-2 top-2 h-4 w-4 text-primary" strokeWidth={3} />
                )}
              </button>
            );
          })}
          <div className="rounded-lg border bg-muted/40 p-3">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Preview</span>
            <div className="mt-1 break-all font-mono text-sm font-medium">{previewText}</div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="scheme-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="scheme-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name"
            autoFocus
          />
        </div>

        {/* Format settings — shown once a type is selected (mirrors #invoice_format_settings) */}
        {form.scheme_type && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheme-prefix">Prefix</Label>
              <Input
                id="scheme-prefix"
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                placeholder="e.g. #"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheme-start">Start from</Label>
              <Input
                id="scheme-start"
                type="number"
                min={0}
                value={form.start_number}
                onChange={(e) => setForm((f) => ({ ...f, start_number: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheme-digits">Number of digits</Label>
              <Select
                id="scheme-digits"
                value={String(form.total_digits)}
                onChange={(e) => setForm((f) => ({ ...f, total_digits: Number(e.target.value) }))}
              >
                {TOTAL_DIGITS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            {editingId == null && (
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                />
                Set as default
              </label>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
