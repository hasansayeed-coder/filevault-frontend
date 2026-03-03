'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, fileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import FilePreviewModal from '@/components/files/FilePreviewModal';
import { formatDistanceToNow } from 'date-fns';
import {
  FolderOpen, FileText, HardDrive, Crown,
  ArrowRight, Image, Video, Music, File,
  Clock, Download, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TIER_COLORS: Record<string, string> = {
  FREE: 'var(--text-subtle)',
  SILVER: '#94a3b8',
  GOLD: '#f59e0b',
  DIAMOND: 'var(--primary-light)',
};

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};
const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{sub}</p>}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PaymentHandler() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    const pkg = searchParams.get('package');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      const activate = async () => {
        try {
          await paymentApi.activateSubscription(sessionId);
          toast.success(`🎉 ${pkg} plan activated successfully!`);
          qc.invalidateQueries({ queryKey: ['active-subscription'] });
          qc.invalidateQueries({ queryKey: ['subscription-history'] });
        } catch (err) {
          toast.error('Payment received but activation failed. Please contact support.');
        }
      };
      activate();
    }
    if (cancelled === 'true') {
      toast.error('Payment cancelled. You have not been charged.');
    }
  }, []);

  return null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [previewFile, setPreviewFile] = useState<any>(null);

  const { data: subData } = useQuery({
    queryKey: ['active-subscription'],
    queryFn: () => subscriptionApi.getActive().then(r => r.data.data),
  });

  const { data: recentFiles } = useQuery({
    queryKey: ['recent-files'],
    queryFn: () => fileApi.getAll().then(r => r.data.data.slice(0, 6)),
  });

  const subscription = subData?.subscription;
  const stats = subData?.stats;
  const pkg = subscription?.package;

  const folderPct = pkg ? Math.round((stats?.totalFolders / pkg.maxFolders) * 100) : 0;
  const filePct   = pkg ? Math.round((stats?.totalFiles   / pkg.totalFileLimit) * 100) : 0;

  const handleDownload = (file: any) => {
    const token = localStorage.getItem('accessToken');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/files/${file.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.originalName;
        a.click();
      });
  };

  return (
    <AuthGuard>
      <AppLayout>
        <Suspense fallback={null}>
          <PaymentHandler />
        </Suspense>

        <div className="p-8 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              Good day, {user?.firstName} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Here's an overview of your FileVault storage
            </p>
          </div>

          {/* No subscription warning */}
          {!subscription && (
            <div className="mb-6 p-4 rounded-xl flex items-center justify-between"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#f59e0b' }}>No Active Subscription</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Select a plan to start uploading files</p>
              </div>
              <Link href="/subscription">
                <button className="btn-primary text-sm py-2">Choose Plan</button>
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FolderOpen} label="Total Folders"  value={stats?.totalFolders || 0}              sub={pkg ? `of ${pkg.maxFolders} allowed`     : undefined} color="#6366f1" />
            <StatCard icon={FileText}   label="Total Files"    value={stats?.totalFiles   || 0}              sub={pkg ? `of ${pkg.totalFileLimit} allowed` : undefined} color="#10b981" />
            <StatCard icon={HardDrive}  label="Storage Used"   value={formatBytes(stats?.totalStorageBytes || 0)}                                                       color="#f59e0b" />
            <StatCard icon={Crown}      label="Current Plan"   value={pkg?.displayName    || 'None'}                                                                    color={TIER_COLORS[pkg?.name || 'FREE']} />
          </div>

          {/* Usage + Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {pkg && (
              <div className="card p-5">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Storage Usage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      <span>Folders</span>
                      <span>{stats?.totalFolders}/{pkg.maxFolders}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(folderPct, 100)}%`, background: folderPct > 80 ? '#ef4444' : 'var(--primary)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      <span>Files</span>
                      <span>{stats?.totalFiles}/{pkg.totalFileLimit}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(filePct, 100)}%`, background: filePct > 80 ? '#ef4444' : '#10b981' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Nesting Level</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Up to {pkg.maxNestingLevel} levels deep</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Max File Size</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{pkg.maxFileSizeMB} MB per file</p>
                  </div>
                </div>
              </div>
            )}

            {pkg && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Current Plan</h3>
                  <Link href="/subscription">
                    <button className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Upgrade <ArrowRight size={12} />
                    </button>
                  </Link>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${TIER_COLORS[pkg.name]}20` }}>
                    <Crown size={20} color={TIER_COLORS[pkg.name]} />
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: TIER_COLORS[pkg.name] }}>{pkg.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Active since {formatDistanceToNow(new Date(subscription.startDate), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Allowed file types:</p>
                  <div className="flex flex-wrap gap-2">
                    {pkg.allowedFileTypes.map((t: string) => (
                      <span key={t} className={`badge-${t.toLowerCase()} text-xs px-2 py-1 rounded-full font-medium`}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Files */}
          {recentFiles && recentFiles.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Clock size={16} color="#6366f1" />
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Files</h3>
                </div>
                <Link href="/dashboard/search">
                  <button className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View all <ArrowRight size={12} />
                  </button>
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentFiles.map((file: any) => {
                  const Icon  = FILE_TYPE_ICONS[file.fileType]  || File;
                  const color = FILE_TYPE_COLORS[file.fileType] || '#6366f1';
                  return (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'var(--surface-2)', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => setPreviewFile(file)}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-3, var(--surface))')}
                      onMouseOut={e  => (e.currentTarget.style.background  = 'var(--surface-2)')}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: `${color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={15} color={color} />
                      </div>

                      {/* Name + folder */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: 2,
                        }}>
                          {file.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {file.folder && (
                            <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <FolderOpen size={10} /> {file.folder.name}
                            </span>
                          )}
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </span>

                      {/* Type badge */}
                      <span style={{
                        background: `${color}20`, color,
                        fontSize: '0.68rem', fontWeight: 700,
                        padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                      }}>
                        {file.fileType}
                      </span>

                      {/* Quick actions */}
                      <div
                        style={{ display: 'flex', gap: 4, flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          title="Preview"
                          onClick={() => setPreviewFile(file)}
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'var(--surface)', border: 'none',
                            cursor: 'pointer', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          title="Download"
                          onClick={() => handleDownload(file)}
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'var(--surface)', border: 'none',
                            cursor: 'pointer', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* File Preview Modal */}
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      </AppLayout>
    </AuthGuard>
  );
}