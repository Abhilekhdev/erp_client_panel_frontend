import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastApi {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT = {
  success: { icon: CheckCircle2, tint: 'text-emerald-400', bar: 'bg-emerald-500' },
  error: { icon: AlertCircle, tint: 'text-rose-400', bar: 'bg-rose-500' },
  info: { icon: Info, tint: 'text-sky-400', bar: 'bg-sky-500' },
} as const;

/**
 * App-wide toasts, rendered top-centre. Replaces `window.alert` for save/error feedback so a
 * successful save reads as a confirmation instead of a blocking browser dialog.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant, duration = 4000) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, message, variant, duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, d) => push(m, 'success', d),
      error: (m, d) => push(m, 'error', d ?? 6000), // errors linger a little longer
      info: (m, d) => push(m, 'info', d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* z-[9999] keeps toasts above modals/dialogs (which sit at z-50) so a save inside a modal is
          still confirmed on screen. `print:hidden` keeps them out of printed payslips/invoices. */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-4 print:hidden">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const { icon: Icon, tint, bar } = VARIANT[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                role="status"
                aria-live="polite"
                className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-lg bg-neutral-900 text-white shadow-2xl ring-1 ring-white/10"
              >
                <div className="flex items-start gap-3 px-4 py-3 pr-10">
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tint)} />
                  <p className="text-sm leading-snug">{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <motion.div
                  className={cn('absolute bottom-0 left-0 h-1', bar)}
                  initial={{ width: '100%' }}
                  animate={{ width: 0 }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
