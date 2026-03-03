'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, HardDrive, User, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      toast.error('Password must be 8+ chars with uppercase and number');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      toast.success('Account created! Please check your email to verify.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setFormData(p => ({ ...p, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-lg animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <HardDrive size={18} color="white" />
          </div>
          <span className="font-bold text-xl" style={{ color: 'var(--text)' }}>FileVault</span>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Create account</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Start managing your files with FileVault</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input className="input pl-8" placeholder="John" value={formData.firstName} onChange={e => update('firstName', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" placeholder="Doe" value={formData.lastName} onChange={e => update('lastName', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
              <input type="email" className="input pl-8" placeholder="you@example.com" value={formData.email} onChange={e => update('email', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-8 pr-10"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={formData.password}
                onChange={e => update('password', e.target.value)}
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input type="password" className="input" placeholder="Repeat your password" value={formData.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}