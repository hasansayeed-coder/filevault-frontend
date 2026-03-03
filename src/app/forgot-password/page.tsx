'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { HardDrive, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('If your email exists, a reset link has been sent');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <HardDrive size={18} color="white" />
          </div>
          <span className="font-bold text-xl" style={{ color: 'var(--text)' }}>FileVault</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Mail size={28} color="#10b981" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Check your inbox</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              We've sent a password reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>
            </p>
            <Link href="/login">
              <button className="btn-primary w-full py-3">Back to Login</button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Reset password</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter your email to receive a reset link</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                  <input type="email" className="input pl-8" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <Link href="/login" className="flex items-center justify-center gap-2 mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}