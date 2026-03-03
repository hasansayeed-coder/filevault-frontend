'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, packagesApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { format } from 'date-fns';
import {
  Search, CheckCircle, XCircle, Crown, File, Folder,
  Shield, ShieldOff, KeyRound, ChevronDown, X, AlertTriangle,
  HardDrive, Image, Video, Music, FileText, BarChart2,
  ChevronRight, Eye, EyeOff,
} from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  FREE: 'var(--text-subtle)', SILVER: '#94a3b8', GOLD: '#f59e0b', DIAMOND: 'var(--primary-light)',
};
const TIER_BG: Record<string, string> = {
  FREE: 'rgba(100,116,139,0.12)', SILVER: 'rgba(148,163,184,0.12)',
  GOLD: 'rgba(245,158,11,0.12)', DIAMOND: 'rgba(99,102,241,0.12)',
};
const TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};
const TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Plan Change Modal ─────────────────────────────────────────────────────────
function PlanModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedPkg, setSelectedPkg] = useState('');

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll().then(r => r.data.data),
  });

  const currentPlan = user.subscriptions?.find((s: any) => s.isActive)?.package?.name || 'FREE';

  const changePlan = useMutation({
    mutationFn: () => adminApi.changeUserPlan(user.id, selectedPkg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-details', user.id] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Change Plan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
              {user.firstName} {user.lastName}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {(packages || []).map((pkg: any) => {
            const isCurrent = pkg.name === currentPlan;
            const isSelected = pkg.id === selectedPkg;
            const color = TIER_COLORS[pkg.name] || 'var(--text-muted)';
            return (
              <div
                key={pkg.id}
                onClick={() => !isCurrent && setSelectedPkg(pkg.id)}
                style={{
                  padding: '12px 14px', borderRadius: 10, cursor: isCurrent ? 'default' : 'pointer',
                  border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                  background: isSelected ? TIER_BG[pkg.name] : isCurrent ? 'var(--surface-2)' : 'transparent',
                  opacity: isCurrent ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Crown size={16} color={color} />
                  <div>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem' }}>{pkg.displayName}</p>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: 1 }}>
                      {pkg.totalFileLimit} files · {pkg.maxFileSizeMB}MB max
                    </p>
                  </div>
                </div>
                {isCurrent && (
                  <span style={{ fontSize: '0.7rem', color, background: TIER_BG[pkg.name], padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    CURRENT
                  </span>
                )}
                {isSelected && !isCurrent && (
                  <CheckCircle size={15} color={color} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!selectedPkg || changePlan.isPending}
            onClick={() => changePlan.mutate()}
            style={{ opacity: !selectedPkg ? 0.5 : 1 }}
          >
            {changePlan.isPending ? 'Changing...' : 'Change Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Suspend Modal ─────────────────────────────────────────────────────────────
function SuspendModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const isSuspended = user.isSuspended;

  const suspendMut = useMutation({
    mutationFn: () => adminApi.toggleSuspend(user.id, reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-details', user.id] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isSuspended ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isSuspended ? <ShieldOff size={18} color="#10b981" /> : <Shield size={18} color="#ef4444" />}
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>
              {isSuspended ? 'Unsuspend User' : 'Suspend User'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.firstName} {user.lastName}</p>
          </div>
        </div>

        {!isSuspended ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
              The user will be immediately locked out of their account.
            </p>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 80, resize: 'vertical', marginBottom: 16, fontSize: '0.875rem' }}
              placeholder="Reason for suspension (optional)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
            <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Currently suspended</p>
            {user.suspendedReason && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Reason: {user.suspendedReason}</p>}
            {user.suspendedAt && <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginTop: 4 }}>Since {format(new Date(user.suspendedAt), 'MMM d, yyyy')}</p>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            onClick={() => suspendMut.mutate()}
            disabled={suspendMut.isPending}
            style={{
              padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', border: 'none',
              background: isSuspended ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: isSuspended ? '#10b981' : '#ef4444',
            }}
          >
            {suspendMut.isPending ? 'Processing...' : isSuspended ? 'Unsuspend User' : 'Suspend User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);

  const resetMut = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
  });

  const valid   = password.length >= 8 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyRound size={18} color="var(--primary-light)" />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>Reset Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.firstName} {user.lastName}</p>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              style={{ width: '100%', paddingRight: 36 }}
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Confirm Password
          </label>
          <input
            className="input"
            type={showPw ? 'text' : 'password'}
            style={{ width: '100%', borderColor: mismatch ? '#ef4444' : undefined }}
            placeholder="Re-enter password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
          {mismatch && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Passwords do not match</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!valid || resetMut.isPending}
            onClick={() => resetMut.mutate()}
            style={{ opacity: !valid ? 0.5 : 1 }}
          >
            {resetMut.isPending ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Storage Details Modal ─────────────────────────────────────────────────────
function StorageModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { data: storage, isLoading } = useQuery({
    queryKey: ['admin-storage', user.id],
    queryFn: () => adminApi.getStorageDetails(user.id).then(r => r.data.data),
  });

  const maxBytes = (storage?.activePlan?.maxFileSizeMB || 0) * 1024 * 1024 * (storage?.activePlan?.totalFileLimit || 1);
  const usedPct  = maxBytes > 0 ? Math.min(100, (storage?.totalBytes || 0) / maxBytes * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={18} color="var(--primary-light)" />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>Storage Details</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.firstName} {user.lastName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : storage && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Files', value: storage.totalFiles, icon: File },
                { label: 'Folders', value: storage.totalFolders, icon: Folder },
                { label: 'Storage Used', value: formatBytes(storage.totalBytes), icon: HardDrive },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ padding: '12px', borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
                  <Icon size={14} color="var(--text-subtle)" style={{ margin: '0 auto 6px' }} />
                  <p style={{ color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700 }}>{value}</p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Active plan */}
            {storage.activePlan && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: TIER_BG[storage.activePlan.name] || 'var(--surface-2)', border: `1px solid ${TIER_COLORS[storage.activePlan.name]}30`, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Crown size={14} color={TIER_COLORS[storage.activePlan.name]} />
                <span style={{ color: TIER_COLORS[storage.activePlan.name], fontWeight: 600, fontSize: '0.875rem' }}>
                  {storage.activePlan.displayName}
                </span>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                  · {storage.activePlan.totalFileLimit} file limit · {storage.activePlan.maxFileSizeMB}MB max size
                </span>
              </div>
            )}

            {/* By type breakdown */}
            {storage.byType.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 10 }}>
                  Storage by Type
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {storage.byType.map((t: any) => {
                    const Icon  = TYPE_ICONS[t.fileType] || File;
                    const color = TYPE_COLORS[t.fileType] || '#6366f1';
                    const pct   = storage.totalBytes > 0 ? (t.bytes / storage.totalBytes) * 100 : 0;
                    return (
                      <div key={t.fileType}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Icon size={13} color={color} />
                            <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500 }}>{t.fileType}</span>
                            <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>({t.count} files)</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatBytes(t.bytes)}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Largest files */}
            {storage.largestFiles?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                  Largest Files
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {storage.largestFiles.map((f: any, i: number) => {
                    const Icon  = TYPE_ICONS[f.fileType] || File;
                    const color = TYPE_COLORS[f.fileType] || '#6366f1';
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', width: 14, textAlign: 'center' }}>{i + 1}</span>
                        <Icon size={13} color={color} />
                        <span style={{ color: 'var(--text)', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', flexShrink: 0 }}>{formatBytes(f.size)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── User Detail Drawer ────────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onChangePlan, onSuspend, onResetPw, onStorage }: any) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: () => adminApi.getUserDetails(userId).then(r => r.data.data),
  });

  if (isLoading || !user) return null;

  const currentSub = user.subscriptions?.find((s: any) => s.isActive);
  const planColor  = TIER_COLORS[currentSub?.package?.name || 'FREE'];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
        width: 400, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem' }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{user.firstName} {user.lastName}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: user.isEmailVerified ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: user.isEmailVerified ? '#10b981' : '#ef4444' }}>
              {user.isEmailVerified ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {user.isEmailVerified ? 'Email verified' : 'Unverified'}
            </span>
            {user.isSuspended && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Shield size={11} /> Suspended
              </span>
            )}
            {currentSub && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: TIER_BG[currentSub.package.name], color: planColor }}>
                <Crown size={11} color={planColor} /> {currentSub.package.displayName}
              </span>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'Files', value: user._count?.files || 0, icon: File },
              { label: 'Folders', value: user._count?.folders || 0, icon: Folder },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ padding: '12px', borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
                <Icon size={14} color="var(--text-subtle)" style={{ margin: '0 auto 6px' }} />
                <p style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 700 }}>{value}</p>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 10 }}>
            Admin Actions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <button
              onClick={() => onChangePlan(user)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' }}
            >
              <Crown size={15} color="#f59e0b" />
              <span style={{ flex: 1 }}>Change Plan</span>
              <ChevronRight size={14} color="var(--text-subtle)" />
            </button>
            <button
              onClick={() => onStorage(user)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' }}
            >
              <BarChart2 size={15} color="var(--primary-light)" />
              <span style={{ flex: 1 }}>View Storage Details</span>
              <ChevronRight size={14} color="var(--text-subtle)" />
            </button>
            <button
              onClick={() => onResetPw(user)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' }}
            >
              <KeyRound size={15} color="var(--primary-light)" />
              <span style={{ flex: 1 }}>Reset Password</span>
              <ChevronRight size={14} color="var(--text-subtle)" />
            </button>
            <button
              onClick={() => onSuspend(user)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: user.isSuspended ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${user.isSuspended ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, cursor: 'pointer', color: user.isSuspended ? '#10b981' : '#ef4444', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' }}
            >
              {user.isSuspended ? <ShieldOff size={15} /> : <Shield size={15} />}
              <span style={{ flex: 1 }}>{user.isSuspended ? 'Unsuspend User' : 'Suspend User'}</span>
              <ChevronRight size={14} color={user.isSuspended ? '#10b981' : '#ef4444'} />
            </button>
          </div>

          {/* Subscription history */}
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 10 }}>
            Subscription History
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(user.subscriptions || []).length === 0 && (
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No subscriptions</p>
            )}
            {(user.subscriptions || []).map((sub: any) => {
              const color = TIER_COLORS[sub.package.name] || 'var(--text-subtle)';
              return (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Crown size={13} color={color} />
                    <span style={{ color, fontWeight: 600, fontSize: '0.8rem' }}>{sub.package.displayName}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                      {format(new Date(sub.startDate), 'MMM d, yyyy')}
                      {sub.endDate && ` – ${format(new Date(sub.endDate), 'MMM d, yyyy')}`}
                    </p>
                    {sub.isActive && <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>● Active</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: 20 }}>
            Joined {format(new Date(user.createdAt), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [planModal, setPlanModal]     = useState<any>(null);
  const [suspendModal, setSuspendModal] = useState<any>(null);
  const [resetPwModal, setResetPwModal] = useState<any>(null);
  const [storageModal, setStorageModal] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminApi.getUsers({ search, page, limit: 10 }).then(r => r.data),
  });

  const openActions = (user: any) => {
    setPlanModal(null); setSuspendModal(null); setResetPwModal(null); setStorageModal(null);
    setSelectedUserId(user.id);
  };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="p-8" style={{ maxWidth: 960 }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>User Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {data?.pagination?.total || 0} registered users
            </p>
          </div>

          {/* Search */}
          <div className="relative" style={{ marginBottom: 20 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              className="input pl-9"
              style={{ maxWidth: 380 }}
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Plan', 'Status', 'Files', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                )}
                {!isLoading && (data?.data || []).map((user: any) => {
                  const sub      = user.subscriptions?.[0];
                  const planName = sub?.package?.name || 'FREE';
                  const color    = TIER_COLORS[planName];
                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid var(--border)', background: selectedUserId === user.id ? 'rgba(99,102,241,0.04)' : undefined, transition: 'background 0.15s' }}
                    >
                      {/* User */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: user.isSuspended ? '#ef444420' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: user.isSuspended ? '#ef4444' : 'white', flexShrink: 0 }}>
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <p style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600 }}>{user.firstName} {user.lastName}</p>
                            <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: TIER_BG[planName], color }}>
                          <Crown size={10} color={color} />
                          {sub?.package?.displayName || 'Free'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {user.isSuspended ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <Shield size={10} /> Suspended
                          </span>
                        ) : user.isEmailVerified ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <AlertTriangle size={10} /> Unverified
                          </span>
                        )}
                      </td>

                      {/* Files */}
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {user._count?.files || 0}
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button
                            onClick={() => openActions(user)}
                            style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--primary-light)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Manage
                          </button>
                          <button
                            title="Change Plan"
                            onClick={() => setPlanModal(user)}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Crown size={13} color="#f59e0b" />
                          </button>
                          <button
                            title={user.isSuspended ? 'Unsuspend' : 'Suspend'}
                            onClick={() => setSuspendModal(user)}
                            style={{ width: 28, height: 28, borderRadius: 7, background: user.isSuspended ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {user.isSuspended ? <ShieldOff size={13} color="#10b981" /> : <Shield size={13} color="#ef4444" />}
                          </button>
                          <button
                            title="Reset Password"
                            onClick={() => setResetPwModal(user)}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <KeyRound size={13} color="var(--primary-light)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                  Page {page} of {data.pagination.totalPages} · {data.pagination.total} users
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }} disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawers & Modals */}
        {selectedUserId && (
          <UserDetailDrawer
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onChangePlan={(u: any) => { setPlanModal(u); setSelectedUserId(null); }}
            onSuspend={(u: any) => { setSuspendModal(u); setSelectedUserId(null); }}
            onResetPw={(u: any) => { setResetPwModal(u); setSelectedUserId(null); }}
            onStorage={(u: any) => { setStorageModal(u); setSelectedUserId(null); }}
          />
        )}
        {planModal    && <PlanModal          user={planModal}    onClose={() => setPlanModal(null)}    />}
        {suspendModal && <SuspendModal       user={suspendModal} onClose={() => setSuspendModal(null)} />}
        {resetPwModal && <ResetPasswordModal user={resetPwModal} onClose={() => setResetPwModal(null)} />}
        {storageModal && <StorageModal       user={storageModal} onClose={() => setStorageModal(null)} />}

      </AppLayout>
    </AuthGuard>
  );
}