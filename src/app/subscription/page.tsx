'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi, paymentApi, subscriptionApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Crown, Check, Folder, FileText, HardDrive,
  Layers, Image, Video, Music, File, Loader2,
} from 'lucide-react';

const TIER_CONFIG: Record<string, { color: string; gradient: string; label: string; price: string }> = {
  FREE:    { color: '#8888a8', gradient: 'from-gray-800 to-gray-900',      label: 'Free',    price: '$0'     },
  SILVER:  { color: '#94a3b8', gradient: 'from-slate-700 to-slate-900',    label: 'Silver',  price: '$9.99'  },
  GOLD:    { color: '#f59e0b', gradient: 'from-amber-800/50 to-gray-900',  label: 'Gold',    price: '$19.99' },
  DIAMOND: { color: '#818cf8', gradient: 'from-indigo-800/50 to-gray-900', label: 'Diamond', price: '$49.99' },
};

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image,
  VIDEO: Video,
  AUDIO: Music,
  PDF: File,
};

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll().then(r => r.data.data),
  });

  const { data: subData } = useQuery({
    queryKey: ['active-subscription'],
    queryFn: () => subscriptionApi.getActive().then(r => r.data.data),
  });

  const { data: history } = useQuery({
    queryKey: ['subscription-history'],
    queryFn: () => subscriptionApi.getHistory().then(r => r.data.data),
  });

  const selectFreePkg = useMutation({
    mutationFn: (packageId: string) => subscriptionApi.selectPackage(packageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-subscription'] });
      qc.invalidateQueries({ queryKey: ['subscription-history'] });
      toast.success('Free plan activated!');
      setLoadingId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to select plan');
      setLoadingId(null);
    },
  });

  const handleSelectPlan = async (pkg: any) => {
    if (loadingId) return;
    setLoadingId(pkg.id);

    if (pkg.name === 'FREE') {
      selectFreePkg.mutate(pkg.id);
      return;
    }

    try {
      const res = await paymentApi.createSession(pkg.id);
      const { url } = res.data.data;
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setLoadingId(null);
    }
  };

  const currentPkgId = subData?.subscription?.packageId;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              Subscription Plans
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Choose the plan that best fits your storage needs
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {(packages || []).map((pkg: any) => {
              const config = TIER_CONFIG[pkg.name] || TIER_CONFIG.FREE;
              const isActive = pkg.id === currentPkgId;
              const isLoading = loadingId === pkg.id;
              const isPaid = pkg.name !== 'FREE';

              return (
                <div
                  key={pkg.id}
                  className="card p-5 flex flex-col transition-all"
                  style={{
                    borderColor: isActive ? config.color : 'var(--border)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: config.color }}
                    >
                      <Check size={12} color="white" />
                    </div>
                  )}

                  <div className="mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${config.color}20` }}
                    >
                      <Crown size={18} color={config.color} />
                    </div>
                    <h3 className="font-bold text-lg" style={{ color: config.color }}>
                      {pkg.displayName}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1 mb-1">
                      <span className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                        {config.price}
                      </span>
                      {isPaid && (
                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          /month
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1 mb-5">
                    <div className="flex items-center gap-2">
                      <Folder size={13} color={config.color} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{pkg.maxFolders}</span> folders
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={13} color={config.color} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{pkg.totalFileLimit}</span> total files
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers size={13} color={config.color} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{pkg.maxNestingLevel}</span> nesting levels
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive size={13} color={config.color} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{pkg.maxFileSizeMB}MB</span> max file size
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={13} color={config.color} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{pkg.filesPerFolder}</span> files/folder
                      </span>
                    </div>
                    <div className="pt-1">
                      <p className="text-xs mb-1.5" style={{ color: 'var(--text-subtle)' }}>Allowed types:</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.allowedFileTypes.map((t: string) => {
                          const Icon = FILE_TYPE_ICONS[t] || File;
                          return (
                            <div key={t} className={`badge-${t.toLowerCase()} flex items-center gap-1 text-xs px-2 py-0.5 rounded-full`}>
                              <Icon size={10} />
                              {t}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    className={isActive ? 'btn-ghost w-full py-2 text-sm' : 'btn-primary w-full py-2 text-sm'}
                    onClick={() => !isActive && handleSelectPlan(pkg)}
                    disabled={isActive || !!loadingId}
                    style={
                      isActive
                        ? { borderColor: config.color, color: config.color }
                        : { opacity: loadingId && !isLoading ? 0.5 : 1 }
                    }
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        {isPaid ? 'Redirecting...' : 'Activating...'}
                      </span>
                    ) : isActive ? '✓ Current Plan'
                      : isPaid ? `Upgrade — ${config.price}/mo`
                      : 'Select Free Plan'}
                  </button>

                  {isPaid && !isActive && (
                    <p className="text-center text-xs mt-2" style={{ color: 'var(--text-subtle)' }}>
                      🔒 Secure payment via Stripe
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Subscription History */}
          {history && history.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Subscription History
              </h3>
              <div className="space-y-2">
                {history.map((sub: any) => {
                  const config = TIER_CONFIG[sub.package.name] || TIER_CONFIG.FREE;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Crown size={16} color={config.color} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {sub.package.displayName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                            Started {format(new Date(sub.startDate), 'MMM d, yyyy')}
                            {sub.endDate && ` · Ended ${format(new Date(sub.endDate), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: config.color }}>
                          {config.price}{sub.package.name !== 'FREE' && '/mo'}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: sub.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(100,100,120,0.15)',
                            color: sub.isActive ? '#10b981' : 'var(--text-subtle)',
                          }}
                        >
                          {sub.isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
} 