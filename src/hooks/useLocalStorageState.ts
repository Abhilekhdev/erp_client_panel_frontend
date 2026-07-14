import { useEffect, useState } from 'react';

/**
 * useState that persists to localStorage. Purely client-side (no backend).
 * When `key` is empty the value is kept in memory only (persistence disabled).
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (!key) return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [key, state]);

  return [state, setState];
}
