import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { RegisterForm } from '../components/RegisterForm';

export function RegisterPage() {
  const status = useAppSelector((s) => s.auth.status);
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your business</h1>
        <p className="text-sm text-muted-foreground">
          Set up your workspace — you'll be the owner &amp; administrator.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </motion.div>
  );
}
