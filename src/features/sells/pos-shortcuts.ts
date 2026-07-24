/**
 * Match a keyboard event against a GOURI-style shortcut combo string like "shift+e", "ctrl+shift+p"
 * or "f2". Mirrors what Mousetrap does on GOURI's POS, minus the library.
 */
export function matchShortcut(e: KeyboardEvent, combo: string | undefined): boolean {
  if (!combo) return false;
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  if (e.shiftKey !== mods.has('shift')) return false;
  if (e.ctrlKey !== mods.has('ctrl')) return false;
  if (e.altKey !== mods.has('alt')) return false;
  if (e.metaKey !== (mods.has('meta') || mods.has('cmd'))) return false;
  return e.key.toLowerCase() === key;
}

/** A function key (F1–F12) fires anywhere; a letter combo shouldn't hijack typing in a field. */
export function isFunctionKey(combo: string | undefined): boolean {
  return !!combo && /^f\d{1,2}$/i.test(combo.split('+').pop() ?? '');
}
