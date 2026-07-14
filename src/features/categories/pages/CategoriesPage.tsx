import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CornerDownRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  categoryDropdown,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type Category,
} from '../categories.api';

interface Editing {
  id?: number;
  name: string;
  shortCode: string;
  description: string;
  addAsSub: boolean;
  parentId: string;
}

const BLANK: Editing = { name: '', shortCode: '', description: '', addAsSub: false, parentId: '' };

export function CategoriesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('category.create');
  const canUpdate = has('category.update');
  const canDelete = has('category.delete');

  const { data: categories, isLoading } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: parentOptions } = useQuery({ queryKey: ['categories-dropdown'], queryFn: categoryDropdown });

  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['categories-dropdown'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const isSub = e.addAsSub && e.parentId !== '';
      const body = {
        name: e.name.trim(),
        short_code: e.shortCode.trim() || null,
        description: e.description.trim() || null,
        add_as_sub_category: isSub,
        parent_id: isSub ? Number(e.parentId) : null,
      };
      return e.id ? updateCategory(e.id, body) : createCategory(body);
    },
    onSuccess: () => {
      invalidate();
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save category')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: invalidate,
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete category')),
  });

  const startEdit = (c: Category) =>
    setEditing({
      id: c.id,
      name: c.name,
      shortCode: c.shortCode,
      description: c.description,
      addAsSub: c.parentId != null,
      parentId: c.parentId != null ? String(c.parentId) : '',
    });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    if (editing.addAsSub && editing.parentId === '') return setError('Select a parent category');
    setError('');
    save.mutate();
  };

  // Parent choices exclude the category being edited (can't be its own parent).
  const parentChoices = (parentOptions ?? []).filter((o) => o.id !== editing?.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Categories"
        description="Organise products into categories and sub-categories."
        breadcrumbs={[{ label: 'Products' }, { label: 'Categories' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit category' : 'New category'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Name<span className="text-destructive"> *</span>
              </Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="space-y-2">
              <Label>Category code</Label>
              <Input
                value={editing.shortCode}
                onChange={(e) => setEditing({ ...editing, shortCode: e.target.value })}
                placeholder="e.g. EL"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={editing.addAsSub}
                onChange={(e) => setEditing({ ...editing, addAsSub: e.target.checked })}
              />
              Add as sub-category
            </label>

            {editing.addAsSub && (
              <div className="space-y-2">
                <Label>Parent category</Label>
                <Select
                  value={editing.parentId}
                  onChange={(e) => setEditing({ ...editing, parentId: e.target.value })}
                >
                  <option value="">Select parent…</option>
                  {parentChoices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={onSave} isLoading={save.isPending}>
                {editing.id ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Name</TH>
              <TH>Code</TH>
              <TH>Description</TH>
              {(canUpdate || canDelete) && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (categories ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No categories yet.
                </TD>
              </TR>
            ) : (
              (categories ?? []).map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">
                    {c.isSubCategory ? (
                      <span className="flex items-center gap-1.5 pl-4 text-muted-foreground">
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span className="text-foreground">{c.name}</span>
                      </span>
                    ) : (
                      c.name
                    )}
                  </TD>
                  <TD>{c.shortCode || <span className="text-muted-foreground">—</span>}</TD>
                  <TD className="max-w-xs truncate text-muted-foreground">{c.description || '—'}</TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${c.name}"?`) && remove.mutate(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  )}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
