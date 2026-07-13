import type { PermCheckbox, PermGroup } from '../roles.types';

interface Props {
  catalog: PermGroup[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/** Grouped permission form (checkboxes + mutually-exclusive radio groups + per-group "select all"). */
export function PermissionGroups({ catalog, selected, onChange }: Props) {
  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const selectRadio = (options: { value: string }[], value: string) => {
    const next = new Set(selected);
    options.forEach((o) => next.delete(o.value));
    next.add(value);
    onChange(next);
  };

  // Radio groups are mutually exclusive but ALSO optional — an HTML radio can't be un-checked once
  // picked, so a "None" choice is the only way to REMOVE the permission again (e.g. drop supplier.view).
  const clearRadio = (options: { value: string }[]) => {
    const next = new Set(selected);
    options.forEach((o) => next.delete(o.value));
    onChange(next);
  };
  const noneSelected = (options: { value: string }[]) => !options.some((o) => selected.has(o.value));

  const checkboxesOf = (g: PermGroup) => g.items.filter((i): i is PermCheckbox => i.type === 'checkbox');
  const allChecked = (g: PermGroup) => {
    const cbs = checkboxesOf(g);
    return cbs.length > 0 && cbs.every((c) => selected.has(c.value));
  };
  const toggleAll = (g: PermGroup) => {
    const cbs = checkboxesOf(g);
    const all = allChecked(g);
    const next = new Set(selected);
    cbs.forEach((c) => (all ? next.delete(c.value) : next.add(c.value)));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {catalog.map((g) => (
        <div key={g.key} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <h4 className="text-sm font-semibold">{g.label}</h4>
            {checkboxesOf(g).length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allChecked(g)}
                  onChange={() => toggleAll(g)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Select all
              </label>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((item, idx) =>
              item.type === 'checkbox' ? (
                <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(item.value)}
                    onChange={() => toggle(item.value)}
                    className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                  />
                  <span>{item.label}</span>
                </label>
              ) : (
                <div
                  key={`radio-${g.key}-${idx}`}
                  className="space-y-1.5 rounded-lg bg-muted/40 p-2.5 sm:col-span-2 lg:col-span-3"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`${g.key}-${item.name}`}
                      checked={noneSelected(item.options)}
                      onChange={() => clearRadio(item.options)}
                      className="h-4 w-4 shrink-0 border-input accent-primary"
                    />
                    <span className="text-muted-foreground">None</span>
                  </label>
                  {item.options.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`${g.key}-${item.name}`}
                        checked={selected.has(o.value)}
                        onChange={() => selectRadio(item.options, o.value)}
                        className="h-4 w-4 shrink-0 border-input accent-primary"
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
