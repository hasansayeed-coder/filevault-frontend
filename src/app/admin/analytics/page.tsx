'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import {
  HardDrive, Users, Upload, Crown, TrendingUp,
  Image, Video, Music, FileText, AlertTriangle,
  CheckCircle, UserX, BarChart2, Activity, Database,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const TIER_COLORS: Record<string, string> = {
  FREE: '#64748b', SILVER: '#94a3b8', GOLD: '#f59e0b', DIAMOND: '#818cf8',
};
const TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};
const TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};

// ── Sparkline bar chart (reusable) ────────────────────────────────────────────
function BarChart({
  data, valueKey, color, height = 80, showLabels = false, labelStep = 5,
}: {
  data: any[]; valueKey: string; color: string;
  height?: number; showLabels?: boolean; labelStep?: number;
}) {
  if (!data?.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No data</div>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: height + (showLabels ? 20 : 0), paddingTop: 4 }}>
      {data.map((d, i) => {
        const pct      = (d[valueKey] / max) * 100;
        const showLabel = showLabels && i % labelStep === 0;
        const isLast   = i === data.length - 1;
        return (
          <div key={d.date || i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
            title={`${d.label}: ${d[valueKey]}`}>
            <div style={{
              width: '100%', minHeight: 2,
              height: `${Math.max(pct, 2)}%`,
              maxHeight: height,
              background: isLast ? color : `${color}88`,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.5s ease',
            }} />
            {showLabels && (
              <div style={{ fontSize: '0.55rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center', opacity: showLabel ? 1 : 0 }}>
                {showLabel ? d.label : '·'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>No data</span>
    </div>
  );

  let cumulative = 0;
  const r  = 45;
  const cx = 60;
  const cy = 60;

  const paths = segments.map(seg => {
    const pct        = seg.value / total;
    const startAngle = (cumulative * 360 - 90) * (Math.PI / 180);
    cumulative      += pct;
    const endAngle   = (cumulative * 360 - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: seg.color, label: seg.label, pct: Math.round(pct * 100) };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
      <circle cx={cx} cy={cy} r={28} fill="var(--surface)" />
    </svg>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, color }: { icon: any; title: string; sub?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{title}</p>
        {sub && <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <p style={{ color, fontSize: '1.15rem', fontWeight: 800 }}>{value}</p>
      <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 500 }}>{label}</p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SystemAnalyticsPage() {
  const [regView, setRegView]       = useState<'daily' | 'weekly'>('daily');
  const [uploadView, setUploadView] = useState<'count' | 'bytes'>('count');

  const { data, isLoading } = useQuery({
    queryKey: ['system-analytics'],
    queryFn: () => adminApi.getSystemAnalytics().then(r => r.data.data),
    staleTime: 60_000,
  });

  const regData    = regView === 'daily' ? data?.dailyRegistrations : data?.weeklyRegistrations;
  const uploadData = data?.dailyUploads;

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          .analytics-section { animation: fadeUp 0.4s ease forwards; }
        `}</style>

        <div style={{ padding: '32px', maxWidth: 1100 }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
              System Analytics
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Platform-wide storage, subscriptions, registrations & upload trends
            </p>
          </div>

          {/* ── Platform summary cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { icon: Users,     label: 'Total Users',      value: data?.totalUsers,    color: '#6366f1', sub: `${data?.regThisMonth || 0} this month` },
              { icon: Upload,    label: 'Total Files',       value: data?.totalFiles,    color: '#10b981', sub: `avg ${data?.avgFilesPerUser || 0} per user` },
              { icon: HardDrive, label: 'Total Storage',     value: formatBytes(data?.totalStorageBytes || 0), color: '#f59e0b', sub: `avg ${formatBytes(data?.avgStoragePerUser || 0)} per user` },
              { icon: Activity,  label: 'Active Subscribers', value: data?.tierStats?.reduce((s: number, t: any) => s + t.count, 0) || 0, color: '#818cf8', sub: data?.mostPopularTier ? `Most popular: ${data.mostPopularTier.displayName}` : 'No subscriptions yet' },
            ].map(({ icon: Icon, label, value, color, sub }) => (
              <div key={label} className="card analytics-section" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={color} />
                  </div>
                </div>
                {isLoading
                  ? <Skeleton h={32} w="60%" />
                  : <p style={{ color: 'var(--text)', fontSize: '1.6rem', fontWeight: 800, marginBottom: 3 }}>{value ?? '—'}</p>
                }
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Row 1: Storage + Tier Popularity ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>

            {/* Storage breakdown */}
            <div className="card analytics-section" style={{ padding: '20px 24px' }}>
              <SectionHeader icon={Database} title="Storage Breakdown" sub="Total storage used across all users" color="#f59e0b" />

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} h={14} />)}
                </div>
              ) : (
                <>
                  {/* Total + per type */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
                      <p style={{ color: '#f59e0b', fontSize: '1.2rem', fontWeight: 800 }}>{formatBytes(data?.totalStorageBytes || 0)}</p>
                      <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>Total Used</p>
                    </div>
                    {(data?.storageByType || []).map((s: any) => {
                      const Icon  = TYPE_ICONS[s.fileType] || FileText;
                      const color = TYPE_COLORS[s.fileType] || '#6366f1';
                      return (
                        <div key={s.fileType} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
                          <Icon size={14} color={color} style={{ margin: '0 auto 4px' }} />
                          <p style={{ color, fontSize: '0.9rem', fontWeight: 700 }}>{formatBytes(s.bytes)}</p>
                          <p style={{ color: 'var(--text-subtle)', fontSize: '0.65rem' }}>{s.fileType}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {(data?.storageByType || []).map((s: any) => {
                      const Icon  = TYPE_ICONS[s.fileType] || FileText;
                      const color = TYPE_COLORS[s.fileType] || '#6366f1';
                      return (
                        <div key={s.fileType}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon size={12} color={color} />
                              <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500 }}>{s.fileType}</span>
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>({s.count} files)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color, fontSize: '0.75rem', fontWeight: 700 }}>{s.pct}%</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatBytes(s.bytes)}</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${s.pct}%`, background: color, borderRadius: 999, transition: 'width 0.7s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top storage users */}
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                    Top Storage Users
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(data?.topStorageUsers || []).slice(0, 5).map((u: any, i: number) => {
                      const maxBytes = data?.topStorageUsers?.[0]?.bytes || 1;
                      const pct = Math.round((u.bytes / maxBytes) * 100);
                      return (
                        <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', width: 14, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ color: 'var(--text)', fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0, marginLeft: 8 }}>{formatBytes(u.bytes)}</span>
                            </div>
                            <div style={{ height: 3, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: 999 }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Tier popularity */}
            <div className="card analytics-section" style={{ padding: '20px 24px' }}>
              <SectionHeader icon={Crown} title="Subscription Tiers" sub="Most popular plan among active users" color="#818cf8" />

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} h={14} />)}
                </div>
              ) : (
                <>
                  {/* Donut + legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                    <DonutChart
                      size={110}
                      segments={(data?.tierStats || []).map((t: any) => ({
                        value: t.count,
                        color: TIER_COLORS[t.name] || '#64748b',
                        label: t.displayName,
                      }))}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(data?.tierStats || []).map((t: any) => {
                        const color = TIER_COLORS[t.name] || '#64748b';
                        return (
                          <div key={t.packageId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{t.displayName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color, fontWeight: 700, fontSize: '0.8rem' }}>{t.count}</span>
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>({t.pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!data?.tierStats?.length) && (
                        <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No active subscriptions</p>
                      )}
                    </div>
                  </div>

                  {/* Most popular highlight */}
                  {data?.mostPopularTier && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: `${TIER_COLORS[data.mostPopularTier.name] || '#64748b'}12`, border: `1px solid ${TIER_COLORS[data.mostPopularTier.name] || '#64748b'}30` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Crown size={13} color={TIER_COLORS[data.mostPopularTier.name]} />
                        <span style={{ color: TIER_COLORS[data.mostPopularTier.name], fontWeight: 700, fontSize: '0.875rem' }}>
                          Most Popular: {data.mostPopularTier.displayName}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {data.mostPopularTier.count} active subscribers · {data.mostPopularTier.pct}% of total
                      </p>
                    </div>
                  )}

                  {/* Health stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <UserX size={11} color="#ef4444" />
                        <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>Suspended</span>
                      </div>
                      <p style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 800 }}>{data?.suspendedUsers || 0}</p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <AlertTriangle size={11} color="#f59e0b" />
                        <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>Unverified</span>
                      </div>
                      <p style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: 800 }}>{data?.unverifiedUsers || 0}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Row 2: Registrations ── */}
          <div className="card analytics-section" style={{ padding: '20px 24px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <SectionHeader icon={Users} title="New User Registrations" sub="Signups over time" color="#6366f1" />
              <div style={{ display: 'flex', gap: 4 }}>
                {(['daily', 'weekly'] as const).map(v => (
                  <button key={v} onClick={() => setRegView(v)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', background: regView === v ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)', color: regView === v ? '#818cf8' : 'var(--text-muted)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <StatPill label="Today"      value={isLoading ? '—' : data?.regToday}     color="#6366f1" />
              <StatPill label="This Week"  value={isLoading ? '—' : data?.regThisWeek}  color="#818cf8" />
              <StatPill label="This Month" value={isLoading ? '—' : data?.regThisMonth} color="#a5b4fc" />
            </div>

            {isLoading
              ? <Skeleton h={100} />
              : <BarChart data={regData || []} valueKey="count" color="#6366f1" height={100} showLabels labelStep={regView === 'daily' ? 5 : 2} />
            }
          </div>

          {/* ── Row 3: Upload Trends ── */}
          <div className="card analytics-section" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <SectionHeader icon={Upload} title="File Upload Trends" sub="Last 30 days upload activity" color="#10b981" />
              <div style={{ display: 'flex', gap: 4 }}>
                {([['count', 'File Count'], ['bytes', 'Storage']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setUploadView(v)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: uploadView === v ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)', color: uploadView === v ? '#10b981' : 'var(--text-muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20 }}>
              {/* Chart */}
              <div>
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  <StatPill label="Files (30d)"   value={isLoading ? '—' : uploadsRaw30d(data?.dailyUploads)}            color="#10b981" />
                  <StatPill label="Storage (30d)" value={isLoading ? '—' : formatBytes(uploadBytes30d(data?.dailyUploads))} color="#10b981" />
                  <StatPill label="Peak Day"      value={isLoading ? '—' : data?.peakUploadDay ? `${data.peakUploadDay.count} files` : 'N/A'} color="#10b981" />
                </div>
                {isLoading
                  ? <Skeleton h={100} />
                  : <BarChart data={uploadData || []} valueKey={uploadView} color="#10b981" height={100} showLabels labelStep={5} />
                }
                {data?.peakUploadDay && (
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: 8, textAlign: 'right' }}>
                    Peak: {data.peakUploadDay.label} — {data.peakUploadDay.count} files ({formatBytes(data.peakUploadDay.bytes)})
                  </p>
                )}
              </div>

              {/* Upload by type */}
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 12 }}>
                  By Type (30d)
                </p>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} h={12} />)}
                  </div>
                ) : (data?.uploadsByType || []).length === 0 ? (
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No uploads</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(data?.uploadsByType || []).map((u: any) => {
                      const Icon  = TYPE_ICONS[u.fileType] || FileText;
                      const color = TYPE_COLORS[u.fileType] || '#6366f1';
                      const maxCount = Math.max(...(data?.uploadsByType || []).map((x: any) => x.count), 1);
                      const pct = Math.round((u.count / maxCount) * 100);
                      return (
                        <div key={u.fileType}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Icon size={11} color={color} />
                              <span style={{ color: 'var(--text)', fontSize: '0.75rem' }}>{u.fileType}</span>
                            </div>
                            <span style={{ color, fontWeight: 700, fontSize: '0.75rem' }}>{u.count}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </AppLayout>
    </AuthGuard>
  );
}

// Helper functions to compute 30-day totals without importing lodash
function uploadsRaw30d(dailyUploads: any[] | undefined) {
  if (!dailyUploads) return 0;
  return dailyUploads.reduce((sum: number, d: any) => sum + d.count, 0);
}
function uploadBytes30d(dailyUploads: any[] | undefined) {
  if (!dailyUploads) return 0;
  return dailyUploads.reduce((sum: number, d: any) => sum + d.bytes, 0);
}