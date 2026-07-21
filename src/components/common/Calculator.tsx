import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Header calculator — port of GOURI's `layouts/partials/calculator.blade.php`
 * (`resources/plugins/calculator/calculator.js`).
 *
 * Same layout and keys: AC · CE · % · ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 + / 0 . =
 *
 * Two deliberate improvements over the legacy plugin:
 *  - It evaluates with a tiny shunting-yard parser instead of `eval()` on the input string.
 *  - Keyboard input works (digits, operators, Enter, Backspace, Escape) — legacy was click-only.
 *
 * AC clears everything; CE drops just the last entry (legacy wired BOTH to clearScreen()).
 */

type Token = number | string;

/** Tokenise "12+3.5*2" → [12,'+',3.5,'*',2]. Returns null on malformed input. */
function tokenize(src: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let n = '';
      while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++];
      const v = Number(n);
      if (!Number.isFinite(v)) return null;
      // Unary minus: "-5" or "3*-5" — fold the sign into the number.
      if (out.length >= 2 && out[out.length - 1] === '-' && typeof out[out.length - 2] === 'string') {
        out.pop();
        out.push(-v);
      } else if (out.length === 1 && out[0] === '-') {
        out.length = 0;
        out.push(-v);
      } else {
        out.push(v);
      }
    } else if ('+-*/%'.includes(c)) {
      out.push(c);
      i++;
    } else {
      return null;
    }
  }
  return out;
}

/** Evaluate a flat token list with correct precedence (× ÷ % before + −). */
function evaluate(src: string): number | null {
  const tokens = tokenize(src);
  if (!tokens || tokens.length === 0) return null;

  // Pass 1: high-precedence operators.
  const mid: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '*' || t === '/' || t === '%') {
      const left = mid.pop();
      const right = tokens[++i];
      if (typeof left !== 'number' || typeof right !== 'number') return null;
      if ((t === '/' || t === '%') && right === 0) return null; // divide by zero
      mid.push(t === '*' ? left * right : t === '/' ? left / right : left % right);
    } else {
      mid.push(t);
    }
  }

  // Pass 2: + and −.
  let acc = mid[0];
  if (typeof acc !== 'number') return null;
  for (let i = 1; i < mid.length; i += 2) {
    const op = mid[i];
    const right = mid[i + 1];
    if (typeof right !== 'number') return null;
    if (op === '+') acc += right;
    else if (op === '-') acc -= right;
    else return null;
  }
  return Number.isFinite(acc) ? acc : null;
}

const KEYS: { label: string; value?: string; kind?: 'op' | 'eq' | 'ac' | 'ce' }[] = [
  { label: 'AC', kind: 'ac' },
  { label: 'CE', kind: 'ce' },
  { label: '%', value: '%', kind: 'op' },
  { label: '÷', value: '/', kind: 'op' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '×', value: '*', kind: 'op' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '−', value: '-', kind: 'op' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '+', value: '+', kind: 'op' },
  { label: '0', value: '0' },
  { label: '.', value: '.' },
  { label: '=', kind: 'eq' },
];

export function Calculator({ autoFocus = true }: { autoFocus?: boolean }) {
  const [expr, setExpr] = useState('');
  const [error, setError] = useState(false);

  const press = useCallback((key: (typeof KEYS)[number]) => {
    setError(false);
    if (key.kind === 'ac') return setExpr('');
    if (key.kind === 'ce') return setExpr((e) => e.slice(0, -1));
    if (key.kind === 'eq') {
      setExpr((e) => {
        if (!e) return e;
        const r = evaluate(e);
        if (r == null) {
          setError(true);
          return e;
        }
        // Trim float noise: 0.1+0.2 → 0.3, not 0.30000000000000004.
        return String(Number(r.toFixed(10)));
      });
      return;
    }
    setExpr((e) => e + (key.value ?? ''));
  }, []);

  // Keyboard support (legacy was mouse-only).
  useEffect(() => {
    if (!autoFocus) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.]$/.test(k)) press({ label: k, value: k });
      else if ('+-*/%'.includes(k)) press({ label: k, value: k, kind: 'op' });
      else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        press({ label: '=', kind: 'eq' });
      } else if (k === 'Backspace') press({ label: 'CE', kind: 'ce' });
      else if (k === 'Escape') press({ label: 'AC', kind: 'ac' });
      else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, autoFocus]);

  return (
    <div className="w-60 select-none">
      <div
        className={cn(
          'mb-2 h-12 overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2 text-right font-mono text-lg leading-8',
          error && 'border-destructive text-destructive',
        )}
        aria-live="polite"
      >
        {error ? 'Error' : expr || '0'}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => press(k)}
            className={cn(
              'h-9 rounded-md text-sm font-medium transition-colors',
              k.kind === 'ac' && 'bg-destructive/10 text-destructive hover:bg-destructive/20',
              k.kind === 'ce' && 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400',
              k.kind === 'eq' && 'bg-primary text-primary-foreground hover:bg-primary/90',
              k.kind === 'op' && 'bg-accent text-accent-foreground hover:bg-accent/70',
              !k.kind && 'bg-muted hover:bg-accent',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Keyboard works · Enter = · Esc clears
      </p>
    </div>
  );
}
