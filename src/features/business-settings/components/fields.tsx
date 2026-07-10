import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Option } from '../business-settings.types';

/** Coerce any legacy 0/1/'1'/true value into a boolean checked-state. */
export function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

/** Section container — titled card with a responsive two-column field grid (ConnectCRM style). */
export function SettingsCard({
  title,
  description,
  children,
  columns = 2,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const grid = columns === 1 ? 'sm:grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <Card className="mb-5">
      <CardContent className="pt-6">
        {title && (
          <div className="mb-4 border-b pb-3">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className={`grid gap-x-5 gap-y-4 ${grid}`}>{children}</div>
      </CardContent>
    </Card>
  );
}

/** Label + control + inline help/error wrapper. */
function FieldShell({
  label,
  htmlFor,
  required,
  help,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface BaseProps {
  name: string;
  label?: string;
  help?: string;
  required?: boolean;
  className?: string;
}

/** Text / number input bound to RHF. */
export function TextField({
  name,
  label,
  help,
  required,
  className,
  type = 'text',
  placeholder,
  step,
  readOnly,
}: BaseProps & { type?: string; placeholder?: string; step?: string; readOnly?: boolean }) {
  const { register } = useFormContext();
  return (
    <FieldShell label={label} htmlFor={name} required={required} help={help} className={className}>
      <Input id={name} type={type} step={step} placeholder={placeholder} readOnly={readOnly} {...register(name)} />
    </FieldShell>
  );
}

/** Native select bound to RHF. */
export function SelectField({
  name,
  label,
  help,
  required,
  className,
  options,
  placeholder,
}: BaseProps & { options: Option[]; placeholder?: string }) {
  const { register } = useFormContext();
  return (
    <FieldShell label={label} htmlFor={name} required={required} help={help} className={className}>
      <Select id={name} {...register(name)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </Select>
    </FieldShell>
  );
}

/** Checkbox bound to RHF, tolerant of legacy 0/1 stored values. Spans the full grid row. */
export function CheckboxField({ name, label, help }: BaseProps) {
  const { watch, setValue } = useFormContext();
  const checked = truthy(watch(name));
  return (
    <label className="flex cursor-pointer items-start gap-2.5 self-start py-1 sm:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setValue(name, e.target.checked, { shouldDirty: true })}
        className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
      />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {help && <span className="mt-0.5 block text-xs text-muted-foreground">{help}</span>}
      </span>
    </label>
  );
}
