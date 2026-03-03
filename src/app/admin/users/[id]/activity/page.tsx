'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { ClipboardList, Download, ArrowLeft, Search } from 'lucide-react';
import toast from 'react-hot-toast';

// Re-use the same ACTION_META and helpers from the user page
const ACTION_META: Record<string, { label: string; color: string }> = {
  LOGIN: { label: 'Logged in', color: '#10b981' },
  LOGOUT: { label: 'Logged out', color: '#64748b' },
  LOGIN_FAILED: { label: 'Login failed', color: '#ef4444' },
  FILE_UPLOAD: { label: 'File uploaded', color: '#6366f1' },
  FILE_DELETE: { label: 'File trashed', color: '#f87171' },
  FILE_RESTORE: { label: 'File restored', color: '#10b981' },
  FILE_PERMANENT_DELETE: { label: 'File deleted', color: '#ef4444' },
  FILE_RENAME: { label: 'File renamed', color: '#a78bfa' },
  FILE_MOVE: { label: 'File moved', color: '#38bdf8' },
  FILE_DOWNLOAD: { label: 'File downloaded', color: '#06b6d4' },
  FILE_STAR: { label: 'File starred', color: '#f59e0b' },
  FOLDER_CREATE: { label: 'Folder created', color: '#10b981' },
  FOLDER_DELETE: { label: 'Folder deleted', color: '#f87171' },
  FOLDER_RENAME: { label: 'Folder renamed', color: '#a78bfa' },
  TRASH_EMPTIED: { label: 'Trash emptied', color: '#ef4444' },
  PASSWORD_CHANGED: { label: 'Password changed', color: '#f59e0b' },
  TWO_FA_ENABLED: { label: '2FA enabled', color: '#10b981' },
  TWO_FA_DISABLED: { label: '2FA disabled', color: '#ef4444' },
  ACCOUNT_SUSPENDED: { label: 'Account suspended', color: '#ef4444' },
  ACCOUNT_UNSUSPENDED: { label: 'Account unsuspended', color: '#10b981' },
  PASSWORD_RESET_ADMIN: { label: 'Password reset (admin)', color: '#f59e0b' },
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUserActivityPage() {
  const { id: userId } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const params = { page, ...(search && { search }) };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', userId, params],
    queryFn:  () => activityApi.getUserActivity(userId, params).then(r => r.data.data),
  });

  const user       = data?.user;
  const logs       = data?.logs       ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res  = await activityApi.exportUserCSV(userId, params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      downloadBlob(blob, `activity-${user?.email ?? userId}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AuthGuard adminOnly>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 900 }}>

          {/* Back + header */}
          <button onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, padding: 0 }}>
            <ArrowLeft size={14} /> Back to Users
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} color="#38bdf8" />
                </div>
                <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700 }}>Activity Log</h1>
              </div>
              {user && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {user.firstName} {user.lastName} · {user.email} · {pagination.total} events
                </p>
              )}
            </div>
            <button onClick={handleExport} disabled={exporting || logs.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', opacity: (exporting || logs.length === 0) ? 0.5 : 1 }}>
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search entity name..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 30, width: '100%' }} />
          </div>

          {/* Log table */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 30, height: 30, border: '3px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No activity found</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 170px', gap: 12, padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Action', 'Entity', 'IP Address', 'Date'].map(h => (
                  <span key={h} style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {logs.map((log: any, i: number) => {
                const meta = ACTION_META[log.action] ?? { label: log.action, color: '#64748b' };
                return (
                  <div key={log.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 170px', gap: 12, padding: '12px 16px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>{meta.label}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: 'var(--text)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.entityName ?? '—'}</p>
                      <p style={{ color: 'var(--text-subtle)', fontSize: '0.68rem' }}>{log.entityType ?? ''}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.ipAddress ?? '—'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Page {page} of {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: page === pagination.totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AppLayout>
    </AuthGuard>
  );
}