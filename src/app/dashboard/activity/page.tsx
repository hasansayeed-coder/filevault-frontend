'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import {
  ClipboardList, Download, Search, Filter,
  LogIn, LogOut, Upload, Trash2, Edit, Move,
  FolderPlus, Shield, Key, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Action metadata ───────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  LOGIN:               { label: 'Logged in',          icon: LogIn,      color: '#10b981' },
  LOGOUT:              { label: 'Logged out',          icon: LogOut,     color: '#64748b' },
  REGISTER:            { label: 'Registered',          icon: Shield,     color: '#6366f1' },
  LOGIN_FAILED:        { label: 'Login failed',        icon: LogIn,      color: '#ef4444' },
  PASSWORD_CHANGED:    { label: 'Password changed',    icon: Key,        color: '#f59e0b' },
  EMAIL_CHANGED:       { label: 'Email changed',       icon: Edit,       color: '#f59e0b' },
  TWO_FA_ENABLED:      { label: '2FA enabled',         icon: Shield,     color: '#10b981' },
  TWO_FA_DISABLED:     { label: '2FA disabled',        icon: Shield,     color: '#ef4444' },
  FILE_UPLOAD:         { label: 'File uploaded',       icon: Upload,     color: '#6366f1' },
  FILE_DELETE:         { label: 'File trashed',        icon: Trash2,     color: '#f87171' },
  FILE_RESTORE:        { label: 'File restored',       icon: Upload,     color: '#10b981' },
  FILE_PERMANENT_DELETE:{ label: 'File deleted',       icon: Trash2,     color: '#ef4444' },
  FILE_RENAME:         { label: 'File renamed',        icon: Edit,       color: '#a78bfa' },
  FILE_MOVE:           { label: 'File moved',          icon: Move,       color: '#38bdf8' },
  FILE_DOWNLOAD:       { label: 'File downloaded',     icon: Download,   color: '#06b6d4' },
  FILE_STAR:           { label: 'File starred',        icon: Star,       color: '#f59e0b' },
  FILE_UNSTAR:         { label: 'File unstarred',      icon: Star,       color: '#64748b' },
  FOLDER_CREATE:       { label: 'Folder created',      icon: FolderPlus, color: '#10b981' },
  FOLDER_DELETE:       { label: 'Folder deleted',      icon: Trash2,     color: '#f87171' },
  FOLDER_RENAME:       { label: 'Folder renamed',      icon: Edit,       color: '#a78bfa' },
  TRASH_EMPTIED:       { label: 'Trash emptied',       icon: Trash2,     color: '#ef4444' },
  ACCOUNT_SUSPENDED:   { label: 'Account suspended',   icon: Shield,     color: '#ef4444' },
  ACCOUNT_UNSUSPENDED: { label: 'Account unsuspended', icon: Shield,     color: '#10b981' },
  PASSWORD_RESET_ADMIN:{ label: 'Password reset (admin)', icon: Key,     color: '#f59e0b' },
};

function ActionBadge({ action }: { action: string }) {
  const meta  = ACTION_META[action] ?? { label: action, icon: ClipboardList, color: '#64748b' };
  const Icon  = meta.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} color={meta.color} />
      </div>
      <span style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500 }}>{meta.label}</span>
    </div>
  );
}

function timeFormat(date: string) {
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_GROUPS = [
  { label: 'All actions', value: '' },
  { label: 'Logins',      value: 'LOGIN' },
  { label: 'Uploads',     value: 'FILE_UPLOAD' },
  { label: 'Deletes',     value: 'FILE_DELETE' },
  { label: 'Renames',     value: 'FILE_RENAME' },
  { label: 'Downloads',   value: 'FILE_DOWNLOAD' },
  { label: 'Security',    value: 'TWO_FA_ENABLED' },
];

// ── CSV download helper ───────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [actionFilter, setAction]   = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [exporting,  setExporting]  = useState(false);

  const params = {
    page,
    ...(search      && { search }),
    ...(actionFilter && { action: actionFilter }),
    ...(fromDate    && { from: fromDate }),
    ...(toDate      && { to: toDate }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-activity', params],
    queryFn:  () => activityApi.getMyActivity(params).then(r => r.data.data),
  });

  const logs       = data?.logs       ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res  = await activityApi.exportMyCSV(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      downloadBlob(blob, `activity-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 900 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} color="#38bdf8" />
                </div>
                <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700 }}>Activity Log</h1>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {pagination.total} total events · your account history
              </p>
            </div>
            <button onClick={handleExport} disabled={exporting || logs.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', opacity: (exporting || logs.length === 0) ? 0.5 : 1 }}>
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Filters */}
          <div className="card" style={{ padding: '16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" placeholder="Search file or folder name..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 30, width: '100%' }} />
            </div>

            {/* Action filter */}
            <div style={{ position: 'relative' }}>
              <Filter size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <select className="input" value={actionFilter}
                onChange={e => { setAction(e.target.value); setPage(1); }}
                style={{ paddingLeft: 28, minWidth: 140 }}>
                {ACTION_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            {/* Date range */}
            <input className="input" type="date" value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1); }}
              style={{ minWidth: 130 }} title="From date" />
            <input className="input" type="date" value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1); }}
              style={{ minWidth: 130 }} title="To date" />

            {(search || actionFilter || fromDate || toDate) && (
              <button onClick={() => { setSearch(''); setAction(''); setFromDate(''); setToDate(''); setPage(1); }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Clear
              </button>
            )}
          </div>

          {/* Log table */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 30, height: 30, border: '3px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--text-muted)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <ClipboardList size={28} color="#38bdf8" />
              </div>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>No activity found</p>
              <p style={{ fontSize: '0.875rem' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 170px', gap: 12, padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Action', 'Entity', 'IP Address', 'Date'].map(h => (
                  <span key={h} style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>

              {logs.map((log: any, i: number) => (
                <div key={log.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 170px', gap: 12, padding: '12px 16px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>

                  <ActionBadge action={log.action} />

                  <div style={{ minWidth: 0 }}>
                    {log.entityName ? (
                      <>
                        <p style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.entityName}</p>
                        <p style={{ color: 'var(--text-subtle)', fontSize: '0.68rem' }}>{log.entityType}</p>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>{log.entityType ?? '—'}</span>
                    )}
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {log.ipAddress ?? '—'}
                  </span>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {timeFormat(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', opacity: page === pagination.totalPages ? 0.4 : 1 }}>
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