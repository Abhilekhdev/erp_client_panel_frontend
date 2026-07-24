import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Method-specific payment detail fields, revealed by the chosen payment method — mirrors GOURI's
 * `transaction_payment/payment_type_details` partial. Card PAN / expiry / CVV are intentionally not
 * collected (the schema deliberately doesn't store them); we keep only holder / transaction no /
 * type, plus cheque no, bank account no, and a generic transaction no for other methods.
 *
 * Fully controlled: the parent owns the values (snake_case keys that match the payment DTO) and
 * receives a partial patch on every edit.
 */
export interface PaymentMethodValues {
  method: string;
  card_holder_name?: string;
  card_transaction_number?: string;
  card_type?: string;
  cheque_number?: string;
  bank_account_number?: string;
  transaction_no?: string;
}

// Methods that carry no extra detail fields (nothing to render).
const PLAIN_METHODS = new Set(['cash', 'advance']);

export function PaymentMethodFields({
  values,
  onChange,
  idPrefix = 'pay',
  className,
}: {
  values: PaymentMethodValues;
  onChange: (patch: Partial<PaymentMethodValues>) => void;
  idPrefix?: string;
  className?: string;
}) {
  const method = values.method;
  if (PLAIN_METHODS.has(method)) return null;

  if (method === 'card') {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
        <Detail
          id={`${idPrefix}-card-holder`}
          label="Card holder name"
          value={values.card_holder_name ?? ''}
          onChange={(v) => onChange({ card_holder_name: v })}
        />
        <Detail
          id={`${idPrefix}-card-txn`}
          label="Card transaction no."
          value={values.card_transaction_number ?? ''}
          onChange={(v) => onChange({ card_transaction_number: v })}
        />
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-card-type`}>Card type</Label>
          <Select
            id={`${idPrefix}-card-type`}
            value={values.card_type ?? ''}
            onChange={(e) => onChange({ card_type: e.target.value })}
          >
            <option value="">Select…</option>
            <option value="credit">Credit Card</option>
            <option value="debit">Debit Card</option>
            <option value="visa">Visa</option>
            <option value="master">MasterCard</option>
          </Select>
        </div>
      </div>
    );
  }

  if (method === 'cheque') {
    return (
      <div className={className}>
        <Detail
          id={`${idPrefix}-cheque`}
          label="Cheque no."
          value={values.cheque_number ?? ''}
          onChange={(v) => onChange({ cheque_number: v })}
        />
      </div>
    );
  }

  if (method === 'bank_transfer') {
    return (
      <div className={className}>
        <Detail
          id={`${idPrefix}-bank`}
          label="Bank account number"
          value={values.bank_account_number ?? ''}
          onChange={(v) => onChange({ bank_account_number: v })}
        />
      </div>
    );
  }

  // other / custom_pay_* — a single reference/transaction number.
  return (
    <div className={className}>
      <Detail
        id={`${idPrefix}-txn`}
        label="Transaction no."
        value={values.transaction_no ?? ''}
        onChange={(v) => onChange({ transaction_no: v })}
      />
    </div>
  );
}

function Detail({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} />
    </div>
  );
}
