'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trashApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import {
  Trash2, RotateCcw, X, AlertTriangle, FileText,
  Image, Video, Music, RefreshCw, CheckSquare, Square,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function FileIcon({ fileType, size = 18 }: { fileType: string; size?: number }) {
  const icons: Record<string, any> = {
    IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
  };
  const Icon  = icons[fileType] ?? FileText;
  const colors: Record<string, string> = {
    IMAGE: '#6366f1', VIDEO: '#f59e0b', AUDIO: '#10b981', PDF: '#ef4444',
  };
  return <Icon size={size} color={colors[fileType] ?? '#64748b'} />;
}

// ── Confirm empty trash modal ─────────────────────────────────────────────────
function ConfirmEmptyModal({ count, onConfirm, onClose, loading }: {
  count: number; onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Empty Trash?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>This cannot be undone</p>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20, display: 'flex', gap: 8 }}>
          <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#ef4444', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {count} file{count !== 1 ? 's' : ''} will be <strong>permanently deleted</strong> from your account and cannot be recovered.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', background: '#ef4444', color: 'white', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Deleting...' : `Empty Trash (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrashPage() {
  const qc = useQueryClient();
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [filter,      setFilter]      = useState<string>('ALL');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn:  () => trashApi.getTrash().then(r => r.data.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['trash'] });
    qc.invalidateQueries({ queryKey: ['trash-count'] });
  };

  const restoreMut = useMutation({
    mutationFn: (id: string) => trashApi.restoreFile(id),
    onSuccess: () => { invalidate(); toast.success('File restored'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  const restoreAllMut = useMutation({
    mutationFn: () => trashApi.restoreAll(),
    onSuccess: (res) => { invalidate(); setSelected(new Set()); toast.success(res.data.message); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const permanentDeleteMut = useMutation({
    mutationFn: (id: string) => trashApi.permanentDelete(id),
    onSuccess: () => { invalidate(); toast.success('File permanently deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const emptyTrashMut = useMutation({
    mutationFn: () => trashApi.emptyTrash(),
    onSuccess: (res) => {
      invalidate(); setSelected(new Set()); setShowConfirm(false);
      toast.success(res.data.message);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  // Bulk actions on selected
  const restoreSelectedMut = useMutation({
    mutationFn: async () => {
      for (const id of selected) await trashApi.restoreFile(id);
    },
    onSuccess: () => { invalidate(); setSelected(new Set()); toast.success(`${selected.size} file(s) restored`); },
    onError: () => toast.error('Some files failed to restore'),
  });

  const deleteSelectedMut = useMutation({
    mutationFn: async () => {
      for (const id of selected) await trashApi.permanentDelete(id);
    },
    onSuccess: () => { invalidate(); setSelected(new Set()); toast.success(`${selected.size} file(s) permanently deleted`); },
    onError: () => toast.error('Some files failed to delete'),
  });

  const filteredFiles = filter === 'ALL' ? files : files.filter((f: any) => f.fileType === filter);
  const totalSize     = files.reduce((sum: number, f: any) => sum + f.size, 0);
  const allSelected   = filteredFiles.length > 0 && filteredFiles.every((f: any) => selected.has(f.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredFiles.map((f: any) => f.id)));
    }
  };

  const fileTypes = ['ALL', ...Array.from(new Set(files.map((f: any) => f.fileType as string)))] as string[];

  return (
    <AuthGuard>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 900 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={18} color="#f87171" />
                </div>
                <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700 }}>Recycle Bin</h1>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} · Auto-deleted after 30 days
              </p>
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => restoreAllMut.mutate()} disabled={restoreAllMut.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>
                  <RotateCcw size={13} />
                  {restoreAllMut.isPending ? 'Restoring...' : 'Restore All'}
                </button>
                <button onClick={() => setShowConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                  <Trash2 size={13} />
                  Empty Trash
                </button>
              </div>
            )}
          </div>

          {/* Info banner */}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Files in the recycle bin are automatically and permanently deleted after <strong style={{ color: 'var(--text)' }}>30 days</strong>. Restore files you want to keep.
            </p>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #f87171', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : files.length === 0 ? (
            /* Empty state */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Trash2 size={32} color="#f87171" />
              </div>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>Trash is empty</p>
              <p style={{ fontSize: '0.875rem' }}>Files you delete will appear here for 30 days before being permanently removed</p>
            </div>
          ) : (
            <>
              {/* Filter tabs + bulk actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {fileTypes.map(type => (
                    <button key={type} onClick={() => setFilter(type)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: filter === type ? '#f87171' : 'var(--surface-2)', color: filter === type ? 'white' : 'var(--text-muted)' }}>
                      {type === 'ALL' ? `All (${files.length})` : type}
                    </button>
                  ))}
                </div>

                {selected.size > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{selected.size} selected</span>
                    <button onClick={() => restoreSelectedMut.mutate()} disabled={restoreSelectedMut.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                      <RotateCcw size={11} /> Restore
                    </button>
                    <button onClick={() => deleteSelectedMut.mutate()} disabled={deleteSelectedMut.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                      <X size={11} /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* File list */}
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 120px 130px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <button onClick={toggleAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {allSelected
                      ? <CheckSquare size={15} color="var(--primary-light)" />
                      : <Square size={15} />}
                  </button>
                  {['Name', 'Type', 'Size', 'Deleted', 'Days Left'].map(h => (
                    <span key={h} style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                  ))}
                </div>

                {/* File rows */}
                {filteredFiles.map((file: any) => {
                  const isSelected = selected.has(file.id);
                  const urgent     = file.daysLeft <= 3;
                  const warning    = file.daysLeft <= 7 && !urgent;

                  return (
                    <div key={file.id}
                      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 120px 130px', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(99,102,241,0.04)' : 'transparent', alignItems: 'center', transition: 'background 0.1s' }}>

                      {/* Checkbox */}
                      <button onClick={() => toggleSelect(file.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? 'var(--primary-light)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        {isSelected ? <CheckSquare size={15} color="var(--primary-light)" /> : <Square size={15} />}
                      </button>

                      {/* Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileIcon fileType={file.fileType} size={15} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </p>
                          <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>
                            {file.folder?.name ?? 'Unknown folder'}
                          </p>
                        </div>
                      </div>

                      {/* Type */}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{file.fileType}</span>

                      {/* Size */}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatBytes(file.size)}</span>

                      {/* Deleted */}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{timeAgo(file.deletedAt)}</span>

                      {/* Days left + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                          background: urgent ? 'rgba(239,68,68,0.12)' : warning ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.1)',
                          color: urgent ? '#ef4444' : warning ? '#f59e0b' : 'var(--text-subtle)',
                        }}>
                          {file.daysLeft}d left
                        </span>

                        <button onClick={() => restoreMut.mutate(file.id)} disabled={restoreMut.isPending}
                          title="Restore"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <RotateCcw size={12} />
                        </button>

                        <button onClick={() => permanentDeleteMut.mutate(file.id)} disabled={permanentDeleteMut.isPending}
                          title="Permanently delete"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {showConfirm && (
          <ConfirmEmptyModal
            count={files.length}
            onConfirm={() => emptyTrashMut.mutate()}
            onClose={() => setShowConfirm(false)}
            loading={emptyTrashMut.isPending}
          />
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AppLayout>
    </AuthGuard>
  );
}
