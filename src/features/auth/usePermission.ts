import { useAppSelector } from '@/app/hooks';

/**
 * Permission checks that honour the Laravel `Gate::before` rule:
 * a tenant Admin (`isBusinessAdmin`) passes every check automatically.
 */
export function usePermissions() {
  const user = useAppSelector((s) => s.auth.user);
  const has = (permission: string): boolean => {
    if (!user) return false;
    if (user.isBusinessAdmin) return true;
    return user.permissions.includes(permission);
  };

  return {
    has,
    hasAny: (perms: string[]) => perms.some(has),
    hasAll: (perms: string[]) => perms.every(has),
    isBusinessAdmin: Boolean(user?.isBusinessAdmin),
  };
}
