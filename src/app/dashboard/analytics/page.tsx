'use client';

import { useQuery } from '@tanstack/react-query';
import { fileApi, subscriptionApi, folderApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { HardDrive, Image, Video, Music, FileText, Folder, TrendingUp, BarChart2 } from 'lucide-react';

const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981',
  VIDEO: '#ef4444',
  AUDIO: '#f59e0b',
  PDF:   '#3b82f6',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Pure CSS Donut Chart ──────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>No data yet</p>
      </div>
    );
  }

  let offset = 0;
  const radius = 70;
  const cx = 90, cy = 90;
  const circumference = 2 * Math.PI * radius;

  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const gap  = circumference - dash;
      const slice = { ...d, dash, gap, offset: offset * circumference };
      offset += pct;
      return slice;
    });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      {/* SVG Donut */}
      <svg width={180} height={180} style={{ flexShrink: 0 }}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={22} />
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={22}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.5s' }}
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-subtle)" fontSize="11">files</text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {data.map(d => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>{d.label}</span>
              <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600 }}>{d.value}</span>
              <span style={{
                background: `${d.color}20`, color: d.color,
                fontSize: '0.7rem', fontWeight: 700,
                padding: '1px 7px', borderRadius: 999,
              }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bar Chart for monthly uploads ─────────────────────────────────────────────
function BarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, paddingBottom: 24, position: 'relative' }}>
      {/* Y grid lines */}
      {[0, 25, 50, 75, 100].map(pct => (
        <div key={pct} style={{
          position: 'absolute',
          bottom: 24 + (pct / 100) * 116,
          left: 0, right: 0,
          borderTop: '1px dashed var(--border)',
          zIndex: 0,
        }} />
      ))}

      {data.map((d, i) => {
        const h = max > 0 ? Math.max((d.count / max) * 116, d.count > 0 ? 4 : 0) : 0;
        return (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 1 }}
            title={`${d.month}: ${d.count} file${d.count !== 1 ? 's' : ''}`}
          >
            <span style={{
              fontSize: '0.65rem', color: 'var(--text-subtle)',
              opacity: d.count > 0 ? 1 : 0,
            }}>
              {d.count > 0 ? d.count : ''}
            </span>
            <div style={{
              width: '100%', height: h,
              background: d.count > 0
                ? 'linear-gradient(180deg, #818cf8, #6366f1)'
                : 'var(--surface-2)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.4s ease',
              minHeight: 2,
            }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-subtle)', marginTop: 2 }}>
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Horizontal bar for folder usage ──────────────────────────────────────────
function FolderBar({ name, count, max, color }: { name: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {name}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {count} file{count !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 999,
          transition: 'width 0.5s ease',
          minWidth: count > 0 ? 8 : 0,
        }} />
      </div>
    </div>
  );
}

// ── Storage usage bar ─────────────────────────────────────────────────────────
function UsageBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const danger = pct > 80;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatBytes(used)} used</span>
        <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{formatBytes(total)} total</span>
      </div>
      <div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: danger ? '#ef4444' : color,
          borderRadius: 999, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: danger ? '#ef4444' : 'var(--text-subtle)', fontSize: '0.75rem', fontWeight: 600 }}>
          {pct.toFixed(1)}% used
        </span>
        {danger && (
          <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>⚠ Almost full!</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { data: allFiles, isLoading: loadingFiles } = useQuery({
    queryKey: ['all-files-analytics'],
    queryFn: () => fileApi.getAll().then(r => r.data.data),
  });

  const { data: subData } = useQuery({
    queryKey: ['active-subscription'],
    queryFn: () => subscriptionApi.getActive().then(r => r.data.data),
  });

  const { data: foldersData } = useQuery({
    queryKey: ['folders-analytics'],
    queryFn: () => folderApi.getAll('').then(r => r.data.data),
  });

  const files: any[] = allFiles || [];
  const pkg   = subData?.subscription?.package;
  const stats = subData?.stats;

  // ── Compute: file type breakdown ──
  const typeBreakdown = ['IMAGE', 'VIDEO', 'AUDIO', 'PDF'].map(type => ({
    label: type.charAt(0) + type.slice(1).toLowerCase() + 's',
    value: files.filter(f => f.fileType === type).length,
    color: FILE_TYPE_COLORS[type],
  }));

  // ── Compute: storage by type ──
  const storageByType = ['IMAGE', 'VIDEO', 'AUDIO', 'PDF'].map(type => ({
    label: type,
    bytes: files.filter(f => f.fileType === type).reduce((s: number, f: any) => s + f.size, 0),
    color: FILE_TYPE_COLORS[type],
  }));
  const totalStorage = storageByType.reduce((s, d) => s + d.bytes, 0);

  // ── Compute: monthly uploads (last 6 months) ──
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: MONTHS[d.getMonth()],
      count: files.filter(f => {
        const c = new Date(f.createdAt);
        return c >= d && c < next;
      }).length,
    };
  });

  // ── Compute: top folders by file count ──
  const folderFileCounts = (foldersData || [])
    .map((folder: any) => ({
      name: folder.name,
      count: files.filter(f => f.folderId === folder.id).length,
    }))
    .filter((f: any) => f.count > 0)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  const maxFolderCount = folderFileCounts[0]?.count || 1;

  // ── Compute: avg file size ──
  const avgSize = files.length > 0
    ? files.reduce((s, f) => s + f.size, 0) / files.length
    : 0;

  // ── Storage limit in bytes ──
  const storageLimitBytes = pkg ? pkg.maxFileSizeMB * pkg.totalFileLimit * 1024 * 1024 : 0;

  const FOLDER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loadingFiles) {
    return (
      <AuthGuard>
        <AppLayout>
          <div style={{ padding: 32 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 200, borderRadius: 16, background: 'var(--surface-2)', marginBottom: 16, opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8" style={{ maxWidth: 1000 }}>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              Storage Analytics
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Visual breakdown of your storage usage and upload activity
            </p>
          </div>

          {/* No data */}
          {files.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <BarChart2 size={56} style={{ color: 'var(--text-subtle)', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>No files uploaded yet</p>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>Upload files to see your analytics</p>
            </div>
          )}

          {files.length > 0 && (
            <>
              {/* ── Row 1: Summary cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#6366f1" />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Files</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{files.length}</p>
                  {pkg && <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginTop: 4 }}>of {pkg.totalFileLimit} allowed</p>}
                </div>

                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HardDrive size={16} color="#f59e0b" />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Storage</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{formatBytes(totalStorage)}</p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginTop: 4 }}>across all files</p>
                </div>

                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={16} color="#10b981" />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Avg File Size</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{formatBytes(avgSize)}</p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginTop: 4 }}>per file average</p>
                </div>
              </div>

              {/* ── Row 2: Donut + Monthly bar ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

                {/* Donut — file type breakdown */}
                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                    <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                      Files by Type
                    </h3>
                  </div>
                  <DonutChart data={typeBreakdown} />
                </div>

                {/* Monthly uploads bar chart */}
                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                    <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                      Monthly Uploads
                    </h3>
                    <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginLeft: 'auto' }}>
                      Last 6 months
                    </span>
                  </div>
                  <BarChart data={monthlyData} />
                </div>
              </div>

              {/* ── Row 3: Storage by type + Subscription usage ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

                {/* Storage by type horizontal bars */}
                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                      Storage by Type
                    </h3>
                  </div>
                  {storageByType.every(d => d.bytes === 0) ? (
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>No data yet</p>
                  ) : (
                    storageByType.map(d => (
                      <FolderBar
                        key={d.label}
                        name={d.label}
                        count={d.bytes}
                        max={totalStorage}
                        color={d.color}
                      />
                    ))
                  )}
                  {/* Override label to show bytes */}
                  {storageByType.filter(d => d.bytes > 0).map(d => null)}
                </div>

                {/* Subscription usage */}
                {pkg && (
                  <div className="card p-5">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                        Plan Usage — {pkg.displayName}
                      </h3>
                    </div>

                    {/* Folders */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Folder size={13} /> Folders
                        </span>
                        <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600 }}>
                          {stats?.totalFolders || 0} / {pkg.maxFolders}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(((stats?.totalFolders || 0) / pkg.maxFolders) * 100, 100)}%`,
                          background: '#6366f1', borderRadius: 999,
                        }} />
                      </div>
                    </div>

                    {/* Files */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FileText size={13} /> Files
                        </span>
                        <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600 }}>
                          {stats?.totalFiles || 0} / {pkg.totalFileLimit}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(((stats?.totalFiles || 0) / pkg.totalFileLimit) * 100, 100)}%`,
                          background: '#10b981', borderRadius: 999,
                        }} />
                      </div>
                    </div>

                    {/* Max file size */}
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', marginBottom: 10 }}>
                      <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginBottom: 2 }}>Max file size</p>
                      <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>{pkg.maxFileSizeMB} MB per file</p>
                    </div>

                    {/* Nesting */}
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                      <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginBottom: 2 }}>Max nesting level</p>
                      <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>{pkg.maxNestingLevel} levels deep</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Row 4: Most used folders ── */}
              {folderFileCounts.length > 0 && (
                <div className="card p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                    <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                      Most Used Folders
                    </h3>
                    <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginLeft: 'auto' }}>
                      by file count
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                    {folderFileCounts.map((f: any, i: number) => (
                      <div key={f.name} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                              background: `${FOLDER_COLORS[i % FOLDER_COLORS.length]}20`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Folder size={11} color={FOLDER_COLORS[i % FOLDER_COLORS.length]} />
                            </span>
                            <span style={{
                              color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
                            }}>
                              {f.name}
                            </span>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0, marginLeft: 8 }}>
                            {f.count} file{f.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(f.count / maxFolderCount) * 100}%`,
                            background: FOLDER_COLORS[i % FOLDER_COLORS.length],
                            borderRadius: 999,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}