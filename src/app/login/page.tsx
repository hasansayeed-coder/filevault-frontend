'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, Mail, Lock, Archive, Shield, KeyRound, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i]    = char;
    onChange(next.join(''));
    if (char && i < 5) {
      (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); e.preventDefault(); }
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={i === 0}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48, height: 56, textAlign: 'center',
            fontSize: '1.35rem', fontWeight: 700,
            borderRadius: 12, outline: 'none',
            border: `2px solid ${d ? 'var(--primary)' : 'var(--border)'}`,
            background: 'var(--surface-2)', color: 'var(--text)',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary-light)')}
          onBlur={e  => (e.target.style.borderColor = d ? 'var(--primary)' : 'var(--border)')}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router     = useRouter();
  const { setAuth } = useAuthStore();

  // Step 1 state
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);

  // Step 2 — 2FA challenge
  const [requires2FA, setRequires2FA] = useState(false);
  const [partialUser, setPartialUser] = useState<any>(null);
  const [otp, setOtp]                 = useState('');
  const [useBackup, setUseBackup]     = useState(false);
  const [backupCode, setBackupCode]   = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const finishLogin = (payload: any) => {
    setAuth(payload.user, payload.accessToken, payload.refreshToken);
    localStorage.setItem('accessToken',  payload.accessToken);
    localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.setItem('user',         JSON.stringify(payload.user));
    toast.success(`Welcome back, ${payload.user.firstName}!`);
    router.push(payload.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
  };

  // ── Step 1: credentials ────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) return;
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      const payload  = data.data;

      if (payload.requires2FA) {
        // Store short-lived temp token so the 2FA endpoint can authenticate
        localStorage.setItem('accessToken', payload.tempToken);
        setPartialUser(payload.user);
        setRequires2FA(true);
      } else {
        finishLogin(payload);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify 2FA ─────────────────────────────────────────────────────
  const handleVerify2FA = async () => {
    if (!useBackup && otp.length !== 6) return;
    if (useBackup && !backupCode.trim()) return;
    setError(''); setLoading(true);
    try {
      const { data } = useBackup
        ? await authApi.verify2FALogin('', backupCode.trim().toUpperCase())
        : await authApi.verify2FALogin(otp);
      finishLogin(data.data);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Invalid code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => { setEmail('admin@filevault.com'); setPassword('Admin@123'); };
  const fillUser  = () => { setEmail('user@filevault.com');  setPassword('User@123'); };

  // ────────────────────────────────────────────────────────────────────────────
  // 2FA SCREEN
  // ────────────────────────────────────────────────────────────────────────────
  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
          <div className="card" style={{ padding: '40px 36px' }}>

            {/* Shield icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={28} color="var(--primary-light)" />
              </div>
            </div>

            <h1 style={{ color: 'var(--text)', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>
              Two-Factor Auth
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginBottom: 28 }}>
              {partialUser?.email}
            </p>

            {!useBackup ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', marginBottom: 18 }}>
                  Enter the 6-digit code from your authenticator app
                </p>
                <OTPInput value={otp} onChange={setOtp} />
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', marginBottom: 12 }}>
                  Enter one of your 8-character backup codes
                </p>
                <input
                  className="input"
                  placeholder="e.g. A1B2C3D4"
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  autoFocus
                  style={{ textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: '1rem', textTransform: 'uppercase' }}
                />
              </>
            )}

            {error && (
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center' }}>
                <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠ {error}</p>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 22, padding: '12px', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}
              disabled={loading || (!useBackup && otp.length !== 6) || (useBackup && !backupCode.trim())}
              onClick={handleVerify2FA}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Verifying...
                  </span>
                : 'Verify & Sign In'
              }
            </button>

            {/* Toggle backup / authenticator */}
            <button
              onClick={() => { setUseBackup(v => !v); setOtp(''); setBackupCode(''); setError(''); }}
              style={{ width: '100%', marginTop: 12, padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-light)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <KeyRound size={13} />
              {useBackup ? 'Use authenticator code instead' : "Can't access your app? Use a backup code"}
            </button>

            {/* Back */}
            <button
              onClick={() => {
                setRequires2FA(false); setOtp(''); setBackupCode(''); setError('');
                localStorage.removeItem('accessToken');
              }}
              style={{ width: '100%', marginTop: 4, padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <ChevronLeft size={13} />
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NORMAL LOGIN SCREEN
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Archive size={20} color="white" />
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--text)' }}>FileVault</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text)' }}>
            Subscription-Based File Management
          </h2>
          <div className="space-y-4">
            {['Free, Silver, Gold & Diamond tiers', 'Enforced file type & size limits',
              'Nested folder management', 'Two-factor authentication'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-muted)' }}>{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Default credentials</p>
            <div className="space-y-2">
              {[
                { label: 'Admin', email: 'admin@filevault.com', pw: 'Admin@123', fn: fillAdmin },
                { label: 'User',  email: 'user@filevault.com',  pw: 'User@123',  fn: fillUser  },
              ].map(({ label, email: e, pw, fn }) => (
                <div key={label}
                  className="p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onClick={fn}>
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</p>
                  <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>{e} / {pw}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>© 2024 FileVault. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Welcome back</h1>
            <p style={{ color: 'var(--text-muted)' }}>Sign in to your FileVault account</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input className="input pl-10" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>

            <div>
              <label className="label">PASSWORD</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input className="input pl-10 pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <span style={{ color: '#ef4444', fontSize: 13 }}>⚠ {error}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm hover:underline" style={{ color: 'var(--primary-light)' }}>
                Forgot password?
              </Link>
            </div>

            <button type="button" className="btn-primary w-full py-3"
              onClick={handleLogin}
              disabled={loading || !email || !password}
              style={{ opacity: loading || !email || !password ? 0.6 : 1, fontSize: '1rem' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                : 'Sign In'
              }
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: 'var(--primary-light)' }}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}