'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import { format } from 'date-fns';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Crown, Search,
  ChevronLeft, ChevronRight, BarChart2, ArrowUpRight,
  ArrowDownRight, X, User,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  FREE: '#64748b', SILVER: '#94a3b8', GOLD: '#f59e0b', DIAMOND: '#818cf8',
};
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  SUCCEEDED: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle,    label: 'Succeeded' },
  FAILED:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle,        label: 'Failed'    },
  PENDING:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: RefreshCw,      label: 'Pending'   },
  REFUNDED:  { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: RefreshCw,      label: 'Refunded'  },
};

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function MrrChart({ data }: { data: { label: string; revenue: number }[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={d.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            title={`${d.label}: ${fmt(d.revenue)}`}
          >
            <div style={{ fontSize: '0.6rem', color: isLast ? '#818cf8' : 'var(--text-subtle)', fontWeight: isLast ? 700 : 400 }}>
              {d.revenue > 0 ? fmt(d.revenue).replace('$', '') : ''}
            </div>
            <div
              style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                height: `${Math.max(pct, 2)}%`,
                background: isLast
                  ? 'linear-gradient(180deg, #818cf8, #6366f1)'
                  : 'linear-gradient(180deg, rgba(99,102,241,0.5), rgba(99,102,241,0.2))',
                transition: 'height 0.6s ease',
                minHeight: 3,
              }}
            />
            <div style={{ fontSize: '0.6rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Payment Row ───────────────────────────────────────────────────────────────
function PaymentRow({ payment, onUserClick }: { payment: any; onUserClick: (userId: string) => void }) {
  const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = status.icon;
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '11px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {payment.user?.firstName?.[0]}{payment.user?.lastName?.[0]}
          </div>
          <div>
            <button
              onClick={() => onUserClick(payment.user?.id)}
              style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              {payment.user?.firstName} {payment.user?.lastName}
            </button>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>{payment.user?.email}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '11px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: `${TIER_COLORS[payment.package?.name] || '#64748b'}18`, color: TIER_COLORS[payment.package?.name] || '#64748b' }}>
          <Crown size={10} />
          {payment.package?.displayName || '—'}
        </span>
      </td>
      <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: '0.875rem', color: payment.status === 'SUCCEEDED' ? '#10b981' : payment.status === 'FAILED' ? '#ef4444' : 'var(--text)' }}>
        {payment.status === 'FAILED' ? '—' : fmt(payment.amount)}
      </td>
      <td style={{ padding: '11px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: status.bg, color: status.color }}>
          <StatusIcon size={10} />
          {status.label}
        </span>
      </td>
      <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
        {format(new Date(payment.createdAt), 'MMM d, yyyy · h:mm a')}
      </td>
      {payment.failureReason && (
        <td style={{ padding: '11px 16px', fontSize: '0.72rem', color: '#ef4444', maxWidth: 180 }}>
          <span title={payment.failureReason} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {payment.failureReason}
          </span>
        </td>
      )}
      {!payment.failureReason && <td style={{ padding: '11px 16px' }} />}
    </tr>
  );
}

// ── User Payments Drawer ──────────────────────────────────────────────────────
function UserPaymentsDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-payments', userId],
    queryFn: () => adminApi.getUserPayments(userId).then(r => r.data.data),
  });

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
        width: 440, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="var(--primary-light)" />
            </div>
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 700 }}>Payment History</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Per-user breakdown</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</div>}

          {data && (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Spent', value: fmt(data.totalSpent), color: '#10b981' },
                  { label: 'Payments',    value: data.totalPayments,   color: 'var(--primary-light)' },
                  { label: 'Succeeded',   value: data.payments.filter((p: any) => p.status === 'SUCCEEDED').length, color: '#10b981' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
                    <p style={{ color, fontSize: '1rem', fontWeight: 700 }}>{value}</p>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Payment list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.payments.map((p: any) => {
                  const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <div key={p.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: `1px solid ${status.color}20` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Crown size={13} color={TIER_COLORS[p.package?.name] || '#64748b'} />
                          <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem' }}>
                            {p.package?.displayName}
                          </span>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: status.bg, color: status.color }}>
                          <StatusIcon size={9} />
                          {status.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: p.status === 'SUCCEEDED' ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.875rem' }}>
                          {p.status === 'FAILED' ? '—' : fmt(p.amount)}
                        </span>
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                          {format(new Date(p.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {p.failureReason && (
                        <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>
                          ↳ {p.failureReason}
                        </p>
                      )}
                    </div>
                  );
                })}

                {data.payments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-subtle)' }}>
                    No payment history
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RevenueDashboard() {
  const [activeTab, setActiveTab]         = useState<'all' | 'failed'>('all');
  const [page, setPage]                   = useState(1);
  const [statusFilter, setStatusFilter]   = useState('ALL');
  const [search, setSearch]               = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['revenue-overview'],
    queryFn: () => adminApi.getRevenueOverview().then(r => r.data.data),
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-history', page, statusFilter, search, activeTab],
    queryFn: () => activeTab === 'failed'
      ? adminApi.getFailedPayments({ page, limit: 15 }).then(r => r.data)
      : adminApi.getPaymentHistory({ page, limit: 15, status: statusFilter !== 'ALL' ? statusFilter : undefined, search: search || undefined }).then(r => r.data),
  });

  const payments    = paymentsData?.data || [];
  const pagination  = paymentsData?.pagination;
  const growth      = overview?.growthPercent || 0;
  const isPositive  = growth >= 0;

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div style={{ padding: '32px', maxWidth: 1100 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
              Revenue Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Stripe payments, MRR trends, and failed payment tracking
            </p>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              {
                label: 'Total Revenue',
                value: fmt(overview?.totalRevenue || 0),
                icon: DollarSign,
                color: '#10b981',
                sub: `${overview?.succeededCount || 0} payments`,
              },
              {
                label: 'This Month',
                value: fmt(overview?.thisMonthRevenue || 0),
                icon: isPositive ? TrendingUp : TrendingDown,
                color: isPositive ? '#10b981' : '#ef4444',
                sub: growth !== 0
                  ? `${isPositive ? '+' : ''}${growth}% vs last month`
                  : 'No data last month',
                subColor: isPositive ? '#10b981' : '#ef4444',
              },
              {
                label: 'Failed Payments',
                value: overview?.failedCount || 0,
                icon: AlertTriangle,
                color: '#ef4444',
                sub: `${overview?.refundedCount || 0} refunded`,
              },
              {
                label: 'Last Month',
                value: fmt(overview?.lastMonthRevenue || 0),
                icon: BarChart2,
                color: '#818cf8',
                sub: 'Completed month',
              },
            ].map(({ label, value, icon: Icon, color, sub, subColor }) => (
              <div key={label} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={color} />
                  </div>
                </div>
                <p style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
                  {overviewLoading ? '—' : value}
                </p>
                <p style={{ color: subColor || 'var(--text-subtle)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {sub}
                  {subColor && (isPositive
                    ? <ArrowUpRight size={12} color={subColor} />
                    : <ArrowDownRight size={12} color={subColor} />
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* MRR Chart + Plan Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 24 }}>

            {/* MRR Chart */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem' }}>Monthly Revenue</p>
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>Last 12 months</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: isPositive ? '#10b981' : '#ef4444', fontWeight: 700, background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {growth > 0 ? '+' : ''}{growth}% MoM
                </span>
              </div>
              <MrrChart data={overview?.mrrChart || []} />
            </div>

            {/* Revenue by plan */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>Revenue by Plan</p>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginBottom: 16 }}>All-time breakdown</p>

              {overviewLoading ? (
                <div style={{ color: 'var(--text-subtle)', textAlign: 'center', padding: '24px 0' }}>Loading...</div>
              ) : (overview?.revenueByPlan || []).length === 0 ? (
                <div style={{ color: 'var(--text-subtle)', textAlign: 'center', padding: '24px 0', fontSize: '0.875rem' }}>No payments yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(overview?.revenueByPlan || [])
                    .sort((a: any, b: any) => b.revenue - a.revenue)
                    .map((p: any) => {
                      const total = overview?.totalRevenue || 1;
                      const pct   = Math.round((p.revenue / total) * 100);
                      const color = TIER_COLORS[p.name] || '#64748b';
                      return (
                        <div key={p.packageId}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Crown size={12} color={color} />
                              <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500 }}>{p.displayName}</span>
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>({p.count})</span>
                            </div>
                            <span style={{ color, fontSize: '0.8rem', fontWeight: 700 }}>{fmt(p.revenue)}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Payment History Table */}
          <div className="card" style={{ overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'failed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setPage(1); }}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                      cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                      background: activeTab === tab ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)',
                      color: activeTab === tab ? 'var(--primary-light)' : 'var(--text-muted)',
                    }}
                  >
                    {tab === 'all' ? 'All Payments' : `⚠ Failed (${overview?.failedCount || 0})`}
                  </button>
                ))}
              </div>

              {activeTab === 'all' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <option value="ALL">All Status</option>
                    <option value="SUCCEEDED">Succeeded</option>
                    <option value="FAILED">Failed</option>
                    <option value="PENDING">Pending</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>

                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 28, paddingTop: 6, paddingBottom: 6, width: 200, fontSize: '0.8rem' }}
                      placeholder="Search user..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Plan', 'Amount', 'Status', 'Date', 'Failure Reason'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        {activeTab === 'failed'
                          ? <CheckCircle size={32} color="#10b981" style={{ opacity: 0.5 }} />
                          : <DollarSign size={32} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                        }
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                          {activeTab === 'failed' ? 'No failed payments 🎉' : 'No payments found'}
                        </p>
                        <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                          {activeTab === 'failed'
                            ? 'All payments have succeeded so far'
                            : 'Payments will appear here once users subscribe'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <PaymentRow key={p.id} payment={p} onUserClick={setSelectedUserId} />
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                  Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total} payments
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: page === 1 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === pagination.totalPages}
                    style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: page === pagination.totalPages ? 0.4 : 1 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User payment drawer */}
        {selectedUserId && (
          <UserPaymentsDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}

      </AppLayout>
    </AuthGuard>
  );
}