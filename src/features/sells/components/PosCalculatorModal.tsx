import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

const KEYS = ['C', '÷', '×', '⌫', '7', '8', '9', '−', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '%'];

/** GOURI's POS toolbar calculator — a simple on-screen calculator for quick cash math. */
export function PosCalculatorModal({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');

  const evaluate = (raw: string): string => {
    try {
      const js = raw.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-').replace(/%/g, '/100');
      if (!/^[\d+\-*/.() ]+$/.test(js)) return 'Error';
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict";return (${js})`)();
      return Number.isFinite(val) ? String(Math.round(val * 1e6) / 1e6) : 'Error';
    } catch {
      return 'Error';
    }
  };

  const press = (k: string) => {
    if (k === 'C') { setExpr(''); setResult(''); return; }
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (k === '=') { setResult(evaluate(expr)); return; }
    setExpr((e) => e + k);
  };

  return (
    <Modal open onClose={onClose} title="Calculator" className="max-w-xs">
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/40 p-3 text-right">
          <div className="min-h-[1.25rem] text-sm text-muted-foreground tabular-nums">{expr || '0'}</div>
          <div className="text-2xl font-semibold tabular-nums">{result || '0'}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((k) => (
            <Button
              key={k}
              type="button"
              variant={k === '=' ? 'default' : k === 'C' ? 'destructive' : 'outline'}
              className={k === '=' ? 'row-span-1' : ''}
              onClick={() => press(k)}
            >
              {k}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
