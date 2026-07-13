import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const status = useAppSelector((s) => s.auth.status);
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
        <div className="mb-7 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Secure sign in
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to your ERP workspace to continue.</p>
        </div>

        <LoginForm />

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">New to OlympasLLC?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Link
          to="/register"
          className="mt-4 flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Create a business account
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OlympasLLC · All rights reserved.
      </p>
    </motion.div>
  );
}
