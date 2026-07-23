import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import { usePermissions } from '@/features/auth/usePermission';
import {
  createClaimCategory,
  deleteClaimCategory,
  getClaimCategoryParents,
  listClaimCategories,
  updateClaimCategory,
  type ClaimCategory,
} from '../claims.api';

const BLANK = { name: '', code: '', asSub: false, parentId: '' as number | '' };

export function ClaimCategoriesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canAdd = has('essentials.add_claim_reimbursement_category');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['claim-categories', page, pageSize, search],
    queryFn: () => listClaimCategories({ page, pageSize, search }),
  });
  // Parent dropdown is only needed (and only permitted) for those who can add.
  const { data: parents } = useQuery({
    queryKey: ['claim-category-parents'],
    queryFn: getClaimCategoryParents,
    enabled: canAdd,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['claim-categories'] });
    qc.invalidateQueries({ queryKey: ['claim-category-parents'] });
    qc.invalidateQueries({ queryKey: ['claim-meta'] });
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        code: form.code,
        parentId: form.asSub ? form.parentId : ('' as const),
      };
      return editId ? updateClaimCategory(editId, body) : createClaimCategory(body);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
    onError: (e) => setFormError(getApiErrorMessage(e, 'Could not save category')),
  });

  const openAdd = () => {
    setEditId(null);
    setForm(BLANK);
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (c: ClaimCategory) => {
    setEditId(c.id);
    setForm({ name: c.name, code: c.code, asSub: c.isSubCategory, parentId: c.parentId ?? '' });
    setFormError('');
    setFormOpen(true);
  };
  const submit = () => {
    if (!form.name.trim()) return setFormError('Category name is required');
    if (form.asSub && !form.parentId) return setFormError('Select a parent category');
    setFormError('');
    save.mutate();
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteClaimCategory(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete category')),
  });

  const columns: Column<ClaimCategory>[] = [
    {
      key: 'name',
      header: 'Category name',
      // GOURI prefixes a sub-category's name with "--".
      render: (c) => (
        <span className={c.isSubCategory ? 'pl-4 text-muted-foreground' : 'font-medium'}>
          {c.isSubCategory ? `— ${c.name}` : c.name}
        </span>
      ),
    },
    { key: 'code', header: 'Code', render: (c) => c.code || '—' },
    { key: 'parent', header: 'Parent', render: (c) => c.parentName || '—' },
    {
      key: 'actions',
      header: 'Action',
      hideable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c) =>
        canAdd ? (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" title="Edit" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              title="Delete"
              onClick={() => window.confirm(`Delete category "${c.name}"?`) && remove.mutate(c.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Claim Categories"
        breadcrumbs={[{ label: 'Claims' }, { label: 'Claim Categories' }]}
        actions={
          canAdd ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(c) => c.id}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search name / code…"
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={save.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Category name <span className="text-destructive">*</span>
            </Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="asSub"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.asSub}
              onChange={(e) => setForm((f) => ({ ...f, asSub: e.target.checked }))}
            />
            <Label htmlFor="asSub" className="cursor-pointer">
              Add as sub-category
            </Label>
          </div>
          {form.asSub && (
            <div className="space-y-2">
              <Label>
                Parent category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(form.parentId)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, parentId: e.target.value ? Number(e.target.value) : '' }))
                }
              >
                <option value="">Select parent…</option>
                {(parents ?? [])
                  .filter((p) => p.id !== editId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
