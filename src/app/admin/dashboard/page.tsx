'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { Users, FileText, Folder, HardDrive, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TIER_COLORS: Record<string, string> = {
  FREE: 'var(--text-subtle)',
  SILVER: '#94a3b8',
  GOLD: '#f59e0b',
  DIAMOND: 'var(--primary-light)',
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data.data),
  });

  if (isLoading) return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    </AuthGuard>
  );

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="p-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Overview of FileVault platform</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, label: 'Total Users', value: data?.totalUsers, color: '#6366f1' },
              { icon: FileText, label: 'Total Files', value: data?.totalFiles, color: '#10b981' },
              { icon: Folder, label: 'Total Folders', value: data?.totalFolders, color: '#f59e0b' },
              { icon: HardDrive, label: 'Storage Used', value: formatBytes(data?.totalStorageBytes || 0), color: '#3b82f6' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}>
                  <Icon size={18} color={color} />
                </div>
                <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text)' }}>{value ?? '-'}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package distribution */}
            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Plan Distribution</h3>
              <div className="space-y-3">
                {(data?.packageStats || []).map((p: any) => {
                  const color = TIER_COLORS[p.name] || 'var(--text-muted)';
                  const total = data?.totalUsers || 1;
                  const pct = Math.round((p.activeSubscribers / total) * 100);
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <Crown size={14} color={color} />
                          <span style={{ color: 'var(--text)' }}>{p.displayName}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{p.activeSubscribers} users</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent users */}
            <div className="card p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Recent Users</h3>
              <div className="space-y-2">
                {(data?.recentUsers || []).map((user: any) => {
                  const sub = user.subscriptions?.[0];
                  const color = TIER_COLORS[sub?.package?.name || 'FREE'];
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary)', color: 'white' }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{user.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {sub && (
                          <span className="text-xs font-medium" style={{ color }}>{sub.package.displayName}</span>
                        )}
                        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}