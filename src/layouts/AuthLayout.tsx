import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const highlights = [
  { icon: ShieldCheck, label: 'Enterprise-grade security & role-based access' },
  { icon: Zap, label: 'Real-time operations, notifications & queues' },
  { icon: BarChart3, label: 'Actionable analytics across every module' },
];

const bars = [42, 58, 35, 72, 50, 88, 64];

/** Fake analytics preview card — sells the "modern workspace" without any external asset. */
function PreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
      className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">Revenue overview</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">$248,900</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-300/30">
          <ArrowUpRight className="h-3.5 w-3.5" />
          18.2%
        </span>
      </div>

      {/* mini bar chart */}
      <div className="mt-5 flex h-24 items-end gap-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${h}%`, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.06, ease: 'easeOut' }}
            className="flex-1 rounded-md bg-gradient-to-t from-white/25 to-white/70"
          />
        ))}
      </div>

      {/* mini stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { icon: Boxes, label: 'Orders', value: '1,204' },
          { icon: Users, label: 'Active users', value: '312' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-white/60">
              <Icon className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ─────────── Brand panel ─────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-12 text-white lg:flex">
        {/* animated aurora orbs */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-[26rem] w-[26rem] rounded-full bg-sky-400/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* dotted grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          }}
        />

        {/* top: logo + badge */}
        <div className="relative flex items-center justify-between">
          <div className="w-fit rounded-xl bg-white px-5 py-3.5 shadow-lg shadow-black/10">
            <img src="/olympas-logo.png" alt="OlympasLLC" className="h-10 w-auto object-contain" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Enterprise ERP
          </span>
        </div>

        {/* middle: headline + preview */}
        <div className="relative space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-md space-y-4"
          >
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight">
              Run your entire business from one modern workspace.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              Sales, purchases, inventory, HR and accounts — unified, real-time, and beautifully simple.
            </p>
          </motion.div>

          <PreviewCard />

          <ul className="grid max-w-md gap-3">
            {highlights.map(({ icon: Icon, label }, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 text-sm text-white/85"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* bottom: module strip */}
        <p className="relative text-xs uppercase tracking-widest text-white/60">
          HRM · CRM · Sales · Purchase · Inventory · Accounts · Payroll
        </p>
      </div>

      {/* ─────────── Content panel ─────────── */}
      <div className="relative flex flex-col bg-muted/30 p-6">
        {/* soft top glow on the form side */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
        />
        <div className="relative flex items-center justify-between">
          <img
            src="/olympas-logo.png"
            alt="OlympasLLC"
            className="h-9 w-auto object-contain lg:invisible"
          />
          <ThemeToggle />
        </div>
        <div className="relative flex flex-1 items-center justify-center py-8">{children}</div>
      </div>
    </div>
  );
}
