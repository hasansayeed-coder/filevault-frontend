'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Link, Copy, Check, Lock, Clock,
  Eye, Trash2, X, Share2, Loader2,
} from 'lucide-react';
import { shareApi } from '@/lib/api';
import { format } from 'date-fns';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: { id: string; name: string; fileType: string } | null;
}

const EXPIRY_OPTIONS = [
  { label: '1 hour',  value: '1'     },
  { label: '24 hours', value: '24'   },
  { label: '7 days',  value: '168'   },
  { label: 'Never',   value: 'never' },
];

export default function ShareModal({ isOpen, onClose, file }: ShareModalProps) {
  const qc = useQueryClient();
  const [expiryHours, setExpiryHours] = useState('24');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  // Fetch existing share for this file
  const { data: existingShare, isLoading: loadingExisting } = useQuery({
    queryKey: ['file-share', file?.id],
    queryFn: () => shareApi.getFileShare(file!.id).then(r => r.data.data),
    enabled: !!file?.id && isOpen,
  });

  useEffect(() => {
    if (existingShare) setShareData(existingShare);
    else setShareData(null);
  }, [existingShare]);

  const createShare = useMutation({
    mutationFn: () => shareApi.create({
      fileId: file!.id,
      expiryHours,
      password: usePassword ? password : undefined,
    }),
    onSuccess: (res) => {
      setShareData(res.data.data);
      qc.invalidateQueries({ queryKey: ['file-share', file?.id] });
      toast.success('Share link created!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create share link');
    },
  });

  const revokeShare = useMutation({
    mutationFn: () => shareApi.revoke(file!.id),
    onSuccess: () => {
      setShareData(null);
      qc.invalidateQueries({ queryKey: ['file-share', file?.id] });
      toast.success('Share link revoked');
    },
    onError: () => toast.error('Failed to revoke share link'),
  });

  const handleCopy = () => {
    if (!shareData?.shareUrl) return;
    navigator.clipboard.writeText(shareData.shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setPassword('');
    setUsePassword(false);
    setExpiryHours('24');
    onClose();
  };

  if (!isOpen || !file) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface)',
          borderRadius: 16, padding: 24,
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Share2 size={17} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem' }}>
                Share File
              </h3>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                {file.name}
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {loadingExisting ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : shareData ? (
          /* Existing share — show link */
          <div>
            {/* Share URL box */}
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 16,
            }}>
              <Link size={14} color="#6366f1" style={{ flexShrink: 0 }} />
              <p style={{
                color: 'var(--text)', fontSize: '0.8rem',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shareData.shareUrl}
              </p>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                  border: 'none', borderRadius: 6, padding: '4px 10px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  color: copied ? '#10b981' : '#6366f1', fontSize: '0.75rem', fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Share stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10, marginBottom: 16,
            }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.25rem' }}>
                  {shareData.accessCount}
                </p>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>Views</p>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.8rem' }}>
                  {shareData.hasPassword ? '🔒 Yes' : '🔓 No'}
                </p>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>Password</p>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.8rem' }}>
                  {shareData.expiresAt
                    ? format(new Date(shareData.expiresAt), 'MMM d')
                    : 'Never'}
                </p>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>Expires</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => revokeShare.mutate()}
                disabled={revokeShare.isPending}
                style={{
                  padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.875rem', fontWeight: 500,
                }}
              >
                <Trash2 size={14} />
                Revoke
              </button>
            </div>

            <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', textAlign: 'center', marginTop: 12 }}>
              Created {format(new Date(shareData.createdAt || new Date()), 'MMM d, yyyy')} · Want different settings?{' '}
              <button
                onClick={() => setShareData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '0.75rem' }}
              >
                Create new link
              </button>
            </p>
          </div>
        ) : (
          /* Create new share */
          <div>
            {/* Expiry */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 8 }}>
                <Clock size={13} style={{ display: 'inline', marginRight: 5 }} />
                Link Expiry
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiryHours(opt.value)}
                    style={{
                      padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${expiryHours === opt.value ? '#6366f1' : 'var(--border)'}`,
                      background: expiryHours === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: expiryHours === opt.value ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password toggle */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
                  <Lock size={13} style={{ display: 'inline', marginRight: 5 }} />
                  Password Protection
                </label>
                <button
                  onClick={() => { setUsePassword(!usePassword); setPassword(''); }}
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    background: usePassword ? '#6366f1' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3,
                    left: usePassword ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              {usePassword && (
                <input
                  className="input"
                  type="password"
                  placeholder="Enter password for this link"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {/* Create button */}
            <button
              className="btn-primary w-full"
              style={{ padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => createShare.mutate()}
              disabled={createShare.isPending || (usePassword && !password.trim())}
            >
              {createShare.isPending ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</>
              ) : (
                <><Share2 size={15} /> Generate Share Link</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}