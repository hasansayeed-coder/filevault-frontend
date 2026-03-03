'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';
import {
  Shield, ShieldCheck, ShieldOff, Smartphone,
  KeyRound, Copy, Check, RefreshCw,
  Eye, EyeOff, AlertTriangle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      (document.getElementById(`sotp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };
  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const next  = [...digits]; next[i] = char;
    onChange(next.join(''));
    if (char && i < 5) (document.getElementById(`sotp-${i + 1}`) as HTMLInputElement)?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { onChange(p); e.preventDefault(); }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input key={i} id={`sotp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
          autoFocus={autoFocus && i === 0}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          style={{ width: 44, height: 50, textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, borderRadius: 10, border: `2px solid ${d ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface-2)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary-light)')}
          onBlur={e  => (e.target.style.borderColor  = d ? 'var(--primary)' : 'var(--border)')}
        />
      ))}
    </div>
  );
}

// ── Backup Codes display ──────────────────────────────────────────────────────
function BackupCodesModal({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true); toast.success('Backup codes copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={16} color="#10b981" />
            </div>
            <div>
              <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Your Backup Codes</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Each code can only be used once</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, display: 'flex', gap: 8 }}>
          <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#f59e0b', fontSize: '0.78rem' }}>Save these somewhere safe — they won't be shown again after you close this dialog.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {codes.map((code, i) => (
            <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text)', textAlign: 'center' }}>
              {code}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyAll} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button onClick={onClose} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
            Done — I've saved them
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Setup flow (QR → Verify → Backup codes) ───────────────────────────────────
function SetupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep]               = useState<'qr' | 'verify'>('qr');
  const [otp, setOtp]                 = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes]     = useState(false);

  const { data: setupData, isLoading } = useQuery({
    queryKey: ['2fa-setup'],
    queryFn: () => authApi.setup2FA().then(r => r.data.data),
  });

  const confirmMut = useMutation({
    mutationFn: () => authApi.confirm2FA(otp),
    onSuccess: (res) => {
      setBackupCodes(res.data.data.backupCodes);
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('🔐 2FA enabled!');
      setShowCodes(true);
    },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Invalid code'); setOtp(''); },
  });

  if (showCodes) return <BackupCodesModal codes={backupCodes} onClose={onClose} />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="var(--primary-light)" />
            </div>
            <div>
              <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Enable 2FA</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Step {step === 'qr' ? 1 : 2} of 2</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Step pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {(['Scan QR Code', 'Verify Code'] as const).map((s, i) => {
            const active = (i === 0 && step === 'qr') || (i === 1 && step === 'verify');
            const done   = i === 0 && step === 'verify';
            return (
              <div key={s} style={{ flex: 1, padding: '6px', borderRadius: 8, textAlign: 'center', background: done ? 'rgba(16,185,129,0.1)' : active ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)', border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(99,102,241,0.3)' : 'var(--border)'}` }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#10b981' : active ? 'var(--primary-light)' : 'var(--text-subtle)' }}>
                  {done ? '✓ ' : ''}{s}
                </p>
              </div>
            );
          })}
        </div>

        {step === 'qr' ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 16 }}>
              Scan with <strong style={{ color: 'var(--text)' }}>Google Authenticator</strong>, <strong style={{ color: 'var(--text)' }}>Authy</strong>, or any TOTP app
            </p>

            {isLoading
              ? <div style={{ width: 180, height: 180, borderRadius: 12, background: 'var(--surface-2)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              : <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ padding: 10, borderRadius: 12, background: 'white', border: '3px solid var(--primary)', display: 'inline-block' }}>
                    <img src={setupData?.qrCode} alt="2FA QR Code" style={{ width: 170, height: 170, display: 'block' }} />
                  </div>
                </div>
            }

            {setupData?.secret && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', textAlign: 'center', marginBottom: 6 }}>Can't scan? Enter this key manually:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text)', letterSpacing: '0.08em', wordBreak: 'break-all' }}>{setupData.secret}</code>
                  <button onClick={() => { navigator.clipboard.writeText(setupData.secret); toast.success('Copied!'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-light)', flexShrink: 0 }}>
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', padding: '11px' }} onClick={() => setStep('verify')}>
              I've scanned it → Next
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 20 }}>
              Enter the 6-digit code from your authenticator app to activate 2FA
            </p>
            <OTPInput value={otp} onChange={setOtp} autoFocus />

            {confirmMut.isError && (
              <div style={{ marginTop: 14, padding: '9px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center' }}>
                <p style={{ color: '#ef4444', fontSize: '0.78rem' }}>⚠ Invalid code — try again</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('qr')}>← Back</button>
              <button className="btn-primary" style={{ flex: 2, opacity: otp.length !== 6 || confirmMut.isPending ? 0.6 : 1 }}
                disabled={otp.length !== 6 || confirmMut.isPending} onClick={() => confirmMut.mutate()}>
                {confirmMut.isPending ? 'Activating...' : 'Activate 2FA'}
              </button>
            </div>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Disable modal ─────────────────────────────────────────────────────────────
function DisableModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [otp, setOtp]         = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);

  const disableMut = useMutation({
    mutationFn: () => authApi.disable2FA(otp, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['2fa-status'] }); toast.success('2FA disabled'); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldOff size={16} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Disable 2FA</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>This will reduce your account security</p>
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
          <p style={{ color: '#ef4444', fontSize: '0.78rem' }}>⚠ Your account will be less secure without 2FA protection.</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Current Password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPw ? 'text' : 'password'} style={{ width: '100%', paddingRight: 36 }}
              placeholder="Confirm your password" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Authenticator Code</label>
          <OTPInput value={otp} onChange={setOtp} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button disabled={otp.length !== 6 || !password || disableMut.isPending}
            onClick={() => disableMut.mutate()}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', opacity: (otp.length !== 6 || !password) ? 0.5 : 1 }}>
            {disableMut.isPending ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Regenerate backup codes modal ─────────────────────────────────────────────
function RegenerateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [otp, setOtp]             = useState('');
  const [newCodes, setNewCodes]   = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);

  const regenMut = useMutation({
    mutationFn: () => authApi.regenerateBackupCodes(otp),
    onSuccess: (res) => {
      setNewCodes(res.data.data.backupCodes);
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
      setShowCodes(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (showCodes) return <BackupCodesModal codes={newCodes} onClose={onClose} />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} color="var(--primary-light)" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Regenerate Backup Codes</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Old codes will be invalidated immediately</p>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: 16 }}>
          Verify your identity first — enter the current code from your authenticator app.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Authenticator Code</label>
          <OTPInput value={otp} onChange={setOtp} autoFocus />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, opacity: otp.length !== 6 || regenMut.isPending ? 0.6 : 1 }}
            disabled={otp.length !== 6 || regenMut.isPending} onClick={() => regenMut.mutate()}>
            {regenMut.isPending ? 'Generating...' : 'Generate New Codes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  const { user } = useAuthStore();
  const [showSetup,   setShowSetup]   = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen,   setShowRegen]   = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => authApi.get2FAStatus().then(r => r.data.data),
  });

  const isEnabled = status?.twoFactorEnabled;
  const isAdmin   = user?.role === 'ADMIN';

  return (
    <AuthGuard>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 620 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Security</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Manage two-factor authentication and account security
            </p>
          </div>

          {/* Admin enforcement banner */}
          {isAdmin && !isEnabled && !isLoading && (
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 20, display: 'flex', gap: 10 }}>
              <AlertTriangle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>Required for Admin Accounts</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Admin accounts must have 2FA enabled. Please set it up now to protect the platform.
                </p>
              </div>
            </div>
          )}

          {/* 2FA status card */}
          <div className="card" style={{ padding: '22px 24px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: isEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isEnabled ? <ShieldCheck size={22} color="#10b981" /> : <Shield size={22} color="#64748b" />}
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700 }}>
                    {isLoading ? '...' : isEnabled ? '2FA Enabled' : '2FA Disabled'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                    {isLoading ? 'Loading...'
                      : isEnabled
                        ? `${status.backupCodesRemaining} backup codes remaining`
                        : 'Your account is not protected by 2FA'
                    }
                  </p>
                </div>
              </div>

              {!isLoading && (
                isEnabled
                  ? <button onClick={() => setShowDisable(true)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                      Disable
                    </button>
                  : <button className="btn-primary" onClick={() => setShowSetup(true)} style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
                      Enable 2FA
                    </button>
              )}
            </div>
          </div>

          {/* Management actions when enabled */}
          {isEnabled && (
            <div className="card" style={{ padding: '20px 24px', marginBottom: 14 }}>
              <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>Manage</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: 10, background: 'var(--surface-2)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KeyRound size={15} color="var(--primary-light)" />
                  </div>
                  <div>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>Backup Codes</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                      {status?.backupCodesRemaining} remaining — use when you lose your phone
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowRegen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={15} color="#10b981" />
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>Authenticator App</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Google Authenticator, Authy, or any TOTP-compatible app</p>
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>How 2FA Works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: Smartphone, color: '#6366f1', title: 'Install an authenticator app',    desc: 'Download Google Authenticator, Authy, or any TOTP app on your phone' },
                { icon: Shield,     color: '#10b981', title: 'Scan the QR code',                desc: 'Use the app to scan the QR code shown during setup to link your account' },
                { icon: KeyRound,   color: '#f59e0b', title: 'Enter your 6-digit code at login', desc: 'After your password, enter the rotating code from your authenticator' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.83rem' }}>{title}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modals */}
        {showSetup   && <SetupModal    onClose={() => setShowSetup(false)}   />}
        {showDisable && <DisableModal  onClose={() => setShowDisable(false)} />}
        {showRegen   && <RegenerateModal onClose={() => setShowRegen(false)} />}

      </AppLayout>
    </AuthGuard>
  );
}