'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { accountApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import {
  User, Mail, Lock, Trash2, Monitor, Smartphone,
  Camera, X, Check, Eye, EyeOff, AlertTriangle,
  LogOut, Globe, RefreshCw, Shield, HardDrive, Folder,
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
  return `${Math.floor(h / 24)}d ago`;
}

function DeviceIcon({ info }: { info: string }) {
  const isMobile = /iPhone|iPad|Android|Mobile/.test(info);
  return isMobile
    ? <Smartphone size={18} color="var(--primary-light)" />
    : <Monitor    size={18} color="var(--primary-light)" />;
}

// ── Password strength bar ─────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4'];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? colors[score] : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <p style={{ fontSize: '0.72rem', color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, icon: Icon, active, onClick }: any) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: active ? 600 : 500, fontSize: '0.875rem', background: active ? 'var(--primary)' : 'transparent', color: active ? 'white' : 'var(--text-muted)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      <Icon size={15} />
      {label}
    </button>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '24px', marginBottom: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{title}</p>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — PROFILE
// ════════════════════════════════════════════════════════════════════════════════
function ProfileTab({ overview }: { overview: any }) {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const profileMut = useMutation({
    mutationFn: () => accountApi.updateProfile({ firstName, lastName }),
    onSuccess: (res) => {
      setUser(res.data.data);
      qc.invalidateQueries({ queryKey: ['account-overview'] });
      toast.success('Profile updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const avatarMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return accountApi.uploadAvatar(fd);
    },
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Avatar updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const removeAvatarMut = useMutation({
    mutationFn: () => accountApi.deleteAvatar(),
    onSuccess: (res) => { setUser(res.data.data); toast.success('Avatar removed'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return; }
    avatarMut.mutate(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const isDirty  = firstName !== user?.firstName || lastName !== user?.lastName;

  return (
    <>
      {/* Avatar */}
      <Section title="Profile Photo" subtitle="JPEG, PNG, WebP or GIF · max 5 MB">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

          {/* Avatar circle — drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ position: 'relative', width: 84, height: 84, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, outline: dragOver ? '3px dashed var(--primary)' : '3px solid var(--border)', transition: 'outline 0.15s' }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                {initials}
              </div>
            )}
            {/* Overlay on hover */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: avatarMut.isPending ? 1 : 0, transition: 'opacity 0.15s' }}
              className="avatar-overlay">
              {avatarMut.isPending
                ? <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <Camera size={20} color="white" />
              }
            </div>
            <style>{`.avatar-overlay { opacity: 0; } div:hover > .avatar-overlay { opacity: 1 !important; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => fileRef.current?.click()} disabled={avatarMut.isPending}>
              {avatarMut.isPending ? 'Uploading...' : 'Upload photo'}
            </button>
            {user?.avatarUrl && (
              <button onClick={() => removeAvatarMut.mutate()} disabled={removeAvatarMut.isPending}
                style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                {removeAvatarMut.isPending ? 'Removing...' : 'Remove photo'}
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Name */}
      <Section title="Personal Information" subtitle="Update your display name">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Field label="First Name">
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
          </Field>
          <Field label="Last Name">
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
          </Field>
        </div>

        <Field label="Email Address">
          <input className="input" value={user?.email ?? ''} disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: 4 }}>
            Change your email in the Email tab below
          </p>
        </Field>

        <button className="btn-primary" style={{ marginTop: 4, padding: '9px 22px', fontSize: '0.875rem', opacity: (!isDirty || profileMut.isPending) ? 0.6 : 1 }}
          disabled={!isDirty || profileMut.isPending}
          onClick={() => profileMut.mutate()}>
          {profileMut.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </Section>

      {/* Account stats */}
      <Section title="Account Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: HardDrive, color: '#6366f1', label: 'Storage Used',    value: formatBytes(overview?.totalStorageBytes ?? 0) },
            { icon: Folder,    color: '#10b981', label: 'Folders',          value: overview?._count?.folders ?? 0 },
            { icon: Shield,    color: '#06b6d4', label: 'Active Sessions',  value: overview?.activeSessionCount ?? 0 },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Icon size={16} color={color} />
              </div>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>{value}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — EMAIL & PASSWORD
// ════════════════════════════════════════════════════════════════════════════════
function EmailPasswordTab() {
  const { user, setUser } = useAuthStore();

  // Email form
  const [newEmail, setNewEmail]   = useState('');
  const [emailPw,  setEmailPw]    = useState('');
  const [showEPw,  setShowEPw]    = useState(false);

  // Password form
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurr,   setShowCurr]   = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  const emailMut = useMutation({
    mutationFn: () => accountApi.updateEmail({ newEmail, password: emailPw }),
    onSuccess: (res) => {
      setUser(res.data.data);
      setNewEmail(''); setEmailPw('');
      toast.success('Email updated! Please verify your new address.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update email'),
  });

  const passwordMut = useMutation({
    mutationFn: () => accountApi.changePassword({ currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password changed! Other devices have been logged out.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const pwMatch = newPw && confirmPw && newPw === confirmPw;
  const pwReady = currentPw && newPw.length >= 8 && pwMatch;

  return (
    <>
      {/* Email */}
      <Section title="Change Email" subtitle="You'll need to verify the new address">
        <Field label="Current Email">
          <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.6 }} />
        </Field>
        <Field label="New Email Address">
          <input className="input" type="email" placeholder="new@example.com"
            value={newEmail} onChange={e => setNewEmail(e.target.value)} />
        </Field>
        <Field label="Confirm with Password">
          <div style={{ position: 'relative' }}>
            <input className="input" type={showEPw ? 'text' : 'password'} placeholder="Your current password"
              value={emailPw} onChange={e => setEmailPw(e.target.value)}
              style={{ paddingRight: 36 }} />
            <button onClick={() => setShowEPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showEPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        <button className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem', opacity: (!newEmail || !emailPw || emailMut.isPending) ? 0.6 : 1 }}
          disabled={!newEmail || !emailPw || emailMut.isPending}
          onClick={() => emailMut.mutate()}>
          {emailMut.isPending ? 'Updating...' : 'Update Email'}
        </button>
      </Section>

      {/* Password */}
      <Section title="Change Password" subtitle="Must be 8+ chars with uppercase, lowercase, and a number">

        <Field label="Current Password">
          <div style={{ position: 'relative' }}>
            <input className="input" type={showCurr ? 'text' : 'password'} placeholder="••••••••"
              value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              style={{ paddingRight: 36 }} />
            <button onClick={() => setShowCurr(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showCurr ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="New Password">
          <div style={{ position: 'relative' }}>
            <input className="input" type={showNew ? 'text' : 'password'} placeholder="••••••••"
              value={newPw} onChange={e => setNewPw(e.target.value)}
              style={{ paddingRight: 36 }} />
            <button onClick={() => setShowNew(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <PasswordStrength password={newPw} />
        </Field>

        <Field label="Confirm New Password">
          <div style={{ position: 'relative' }}>
            <input className="input" type={showConf ? 'text' : 'password'} placeholder="••••••••"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              style={{ paddingRight: 36, borderColor: confirmPw && !pwMatch ? 'rgba(239,68,68,0.5)' : undefined }} />
            <button onClick={() => setShowConf(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmPw && !pwMatch && (
            <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>Passwords do not match</p>
          )}
          {pwMatch && (
            <p style={{ color: '#10b981', fontSize: '0.72rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} /> Passwords match
            </p>
          )}
        </Field>

        <button className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem', opacity: (!pwReady || passwordMut.isPending) ? 0.6 : 1 }}
          disabled={!pwReady || passwordMut.isPending}
          onClick={() => passwordMut.mutate()}>
          {passwordMut.isPending ? 'Changing...' : 'Change Password'}
        </button>
      </Section>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — SESSIONS
// ════════════════════════════════════════════════════════════════════════════════
function SessionsTab() {
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => accountApi.getSessions().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => accountApi.revokeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Session revoked'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const revokeAllMut = useMutation({
    mutationFn: () => accountApi.revokeAllSessions(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(res.data.message);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const others = sessions.filter((s: any) => !s.isCurrent);

  return (
    <Section
      title="Active Sessions"
      subtitle="Devices currently signed into your account"
    >
      {/* Revoke all button */}
      {others.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => revokeAllMut.mutate()} disabled={revokeAllMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            <LogOut size={13} />
            {revokeAllMut.isPending ? 'Revoking...' : `Sign out ${others.length} other device${others.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No active sessions found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map((session: any) => (
            <div key={session.id}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: session.isCurrent ? 'rgba(99,102,241,0.06)' : 'var(--surface-2)', border: `1px solid ${session.isCurrent ? 'rgba(99,102,241,0.25)' : 'var(--border)'}` }}>

              <div style={{ width: 40, height: 40, borderRadius: 12, background: session.isCurrent ? 'rgba(99,102,241,0.12)' : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DeviceIcon info={session.deviceInfo ?? ''} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem', truncate: true }}>
                    {session.deviceInfo || 'Unknown Device'}
                  </p>
                  {session.isCurrent && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', align: 'center', gap: 12 }}>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={10} /> {session.ipAddress || 'Unknown IP'}
                  </p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                    · {timeAgo(session.lastUsedAt)}
                  </p>
                </div>
              </div>

              {!session.isCurrent && (
                <button onClick={() => revokeMut.mutate(session.id)} disabled={revokeMut.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  <X size={12} />
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Section>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4 — DANGER ZONE
// ════════════════════════════════════════════════════════════════════════════════
function DangerZoneTab() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => accountApi.deleteAccount({ password, confirmation: 'DELETE MY ACCOUNT' }),
    onSuccess: () => {
      toast.success('Account permanently deleted');
      logout();
      router.push('/login');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete account'),
  });

  const confirmTyped = confirm === 'DELETE MY ACCOUNT';
  const canDelete    = password && confirmTyped;

  return (
    <>
      <div className="card" style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} color="#ef4444" />
              </div>
              <p style={{ color: '#ef4444', fontWeight: 700 }}>Delete Account</p>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', maxWidth: 460, lineHeight: 1.5 }}>
              Permanently delete your account and all associated data — files, folders, subscriptions, and payment history. <strong style={{ color: 'var(--text)' }}>This action cannot be undone.</strong>
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0 }}>
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Delete Account</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>This cannot be undone</p>
              </div>
            </div>

            {/* Warning box */}
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 18, display: 'flex', gap: 10 }}>
              <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: '#ef4444', fontSize: '0.8rem', lineHeight: 1.5 }}>
                All your files, folders, subscriptions, payments, and account data will be permanently erased. There is no recovery.
              </p>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Confirm with your password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="Your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: 36 }} />
                <button onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirmation phrase */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Type <strong style={{ color: '#ef4444', fontFamily: 'monospace' }}>DELETE MY ACCOUNT</strong> to confirm
              </label>
              <input className="input" placeholder="DELETE MY ACCOUNT"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={{ borderColor: confirm && !confirmTyped ? 'rgba(239,68,68,0.5)' : undefined }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { setShowModal(false); setPassword(''); setConfirm(''); }}>
                Cancel
              </button>
              <button
                disabled={!canDelete || deleteMut.isPending}
                onClick={() => deleteMut.mutate()}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', background: canDelete ? '#ef4444' : 'rgba(239,68,68,0.2)', color: canDelete ? 'white' : '#ef4444', opacity: deleteMut.isPending ? 0.7 : 1 }}>
                {deleteMut.isPending ? 'Deleting...' : '🗑 Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
type TabId = 'profile' | 'email-password' | 'sessions' | 'danger';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const { data: overview } = useQuery({
    queryKey: ['account-overview'],
    queryFn:  () => accountApi.getOverview().then(r => r.data.data),
  });

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'profile',       label: 'Profile',        icon: User    },
    { id: 'email-password', label: 'Email & Password', icon: Lock   },
    { id: 'sessions',      label: 'Sessions',       icon: Monitor },
    { id: 'danger',        label: 'Danger Zone',    icon: Trash2  },
  ];

  return (
    <AuthGuard>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 700 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
              Account Settings
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Manage your profile, credentials, devices, and account data
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <Tab key={t.id} label={t.label} icon={t.icon}
                active={activeTab === t.id}
                onClick={() => setActiveTab(t.id)} />
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'profile'        && <ProfileTab       overview={overview} />}
          {activeTab === 'email-password' && <EmailPasswordTab />}
          {activeTab === 'sessions'       && <SessionsTab      />}
          {activeTab === 'danger'         && <DangerZoneTab    />}

        </div>
      </AppLayout>
    </AuthGuard>
  );
}
