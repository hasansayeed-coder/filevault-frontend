'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Crown, Check, X } from 'lucide-react';

const FILE_TYPES = ['IMAGE', 'VIDEO', 'PDF', 'AUDIO'];
const PACKAGE_NAMES = ['FREE', 'SILVER', 'GOLD', 'DIAMOND'];
const TIER_COLORS: Record<string, string> = {
  FREE: 'var(--text-subtle)', SILVER: '#94a3b8', GOLD: '#f59e0b', DIAMOND: 'var(--primary-light)',
};

const DEFAULT_FORM = {
  name: 'FREE', displayName: '', description: '',
  maxFolders: 10, maxNestingLevel: 3, allowedFileTypes: ['IMAGE', 'PDF'],
  maxFileSizeMB: 10, totalFileLimit: 50, filesPerFolder: 10,
};

export default function AdminPackagesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [form, setForm] = useState<any>(DEFAULT_FORM);

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll().then(r => r.data.data),
  });

  const createPkg = useMutation({
    mutationFn: (data: any) => packagesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); setModal(null); toast.success('Package created'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updatePkg = useMutation({
    mutationFn: ({ id, data }: any) => packagesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); setModal(null); toast.success('Package updated'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deletePkg = useMutation({
    mutationFn: (id: string) => packagesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); toast.success('Package deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const openCreate = () => { setForm(DEFAULT_FORM); setModal('create'); };
  const openEdit = (pkg: any) => {
    setEditingPkg(pkg);
    setForm({ ...pkg });
    setModal('edit');
  };

  const handleSubmit = () => {
    if (!form.displayName.trim()) return toast.error('Display name required');
    if (modal === 'create') createPkg.mutate(form);
    else updatePkg.mutate({ id: editingPkg.id, data: form });
  };

  const toggleFileType = (type: string) => {
    setForm((f: any) => ({
      ...f,
      allowedFileTypes: f.allowedFileTypes.includes(type)
        ? f.allowedFileTypes.filter((t: string) => t !== type)
        : [...f.allowedFileTypes, type],
    }));
  };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="p-8 max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Subscription Packages</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage the storage plans available to users</p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={16} /> New Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(packages || []).map((pkg: any) => {
              const color = TIER_COLORS[pkg.name] || 'var(--text-muted)';
              return (
                <div key={pkg.id} className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                        <Crown size={18} color={color} />
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color }}>{pkg.displayName}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {pkg._count?.userSubscriptions || 0} active subscribers
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="p-2 rounded-lg transition-all"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => openEdit(pkg)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-all"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          if (confirm(`Delete "${pkg.displayName}" package?`)) deletePkg.mutate(pkg.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {pkg.description && (
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{pkg.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Max Folders', pkg.maxFolders],
                      ['Nesting Levels', pkg.maxNestingLevel],
                      ['Total Files', pkg.totalFileLimit],
                      ['Files/Folder', pkg.filesPerFolder],
                      ['Max File Size', `${pkg.maxFileSizeMB}MB`],
                    ].map(([label, val]) => (
                      <div key={label as string} className="p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <p style={{ color: 'var(--text-subtle)' }}>{label}</p>
                        <p className="font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pkg.allowedFileTypes.map((t: string) => (
                      <span key={t} className={`badge-${t.toLowerCase()} text-xs px-2 py-0.5 rounded-full font-medium`}>{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
                  {modal === 'create' ? 'Create Package' : 'Edit Package'}
                </h3>
                <button onClick={() => setModal(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {modal === 'create' && (
                  <div>
                    <label className="label">Package Tier</label>
                    <select
                      className="input"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{ background: 'var(--surface-2)' }}
                    >
                      {PACKAGE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">Display Name</label>
                  <input className="input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Gold Plan" />
                </div>

                <div>
                  <label className="label">Description</label>
                  <input className="input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'maxFolders', label: 'Max Folders' },
                    { key: 'maxNestingLevel', label: 'Nesting Levels' },
                    { key: 'maxFileSizeMB', label: 'Max File Size (MB)', step: 0.1 },
                    { key: 'totalFileLimit', label: 'Total File Limit' },
                    { key: 'filesPerFolder', label: 'Files Per Folder' },
                  ].map(({ key, label, step }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input
                        type="number"
                        className="input"
                        value={form[key]}
                        min={1}
                        step={step || 1}
                        onChange={e => setForm({ ...form, [key]: parseFloat(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label">Allowed File Types</label>
                  <div className="flex gap-2">
                    {FILE_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleFileType(type)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border`}
                        style={{
                          background: form.allowedFileTypes.includes(type) ? `rgba(99,102,241,0.15)` : 'var(--surface-2)',
                          color: form.allowedFileTypes.includes(type) ? 'var(--primary-light)' : 'var(--text-muted)',
                          borderColor: form.allowedFileTypes.includes(type) ? 'var(--primary)' : 'var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        {form.allowedFileTypes.includes(type) && <Check size={12} />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={createPkg.isPending || updatePkg.isPending}>
                  {createPkg.isPending || updatePkg.isPending ? 'Saving...' : (modal === 'create' ? 'Create' : 'Save Changes')}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}