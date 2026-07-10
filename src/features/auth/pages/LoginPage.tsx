import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const status = useAppSelector((s) => s.auth.status);
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to your ERP workspace to continue.</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to OlympasLLC?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create a business account
        </Link>
      </p>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OlympasLLC · All rights reserved.
      </p>
    </motion.div>
  );
}
