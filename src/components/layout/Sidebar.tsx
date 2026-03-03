'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { trashApi } from '@/lib/api';
import {
  HardDrive, FolderOpen, LayoutDashboard, CreditCard,
  LogOut, ChevronRight, Users, Package, Search, BarChart2,
  Star, DollarSign, Activity, ShieldCheck, Settings, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {  ClipboardList } from 'lucide-react';
import { StickyNote } from 'lucide-react';




const userNav = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard'       },
  { href: '/dashboard/files',     icon: FolderOpen,      label: 'Files & Folders' },
  { href: '/dashboard/starred',   icon: Star,            label: 'Starred',        star: true     },
  { href: '/dashboard/search',    icon: Search,          label: 'Search Files'    },
  { href: '/dashboard/analytics', icon: BarChart2,       label: 'Analytics'       },
  { href: '/dashboard/trash',     icon: Trash2,          label: 'Trash',          trash: true    },
  { href: '/dashboard/security',  icon: ShieldCheck,     label: 'Security',       security: true },
  { href: '/dashboard/settings',  icon: Settings,        label: 'Settings',       settings: true },
  { href: '/subscription',        icon: CreditCard,      label: 'Subscription'    },
  { href: '/dashboard/activity', icon: ClipboardList, label: 'Activity Log', activity: true },
];

const adminNav = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard'            },
  { href: '/admin/revenue',      icon: DollarSign,      label: 'Revenue',   revenue: true   },
  { href: '/admin/analytics',    icon: Activity,        label: 'Analytics', analytics: true },
  { href: '/admin/packages',     icon: Package,         label: 'Packages'             },
  { href: '/admin/users',        icon: Users,           label: 'Users'                },
  { href: '/dashboard/security', icon: ShieldCheck,     label: 'Security',  security: true  },
  { href: '/dashboard/settings', icon: Settings,        label: 'Settings',  settings: true  },
  { href: '/dashboard/activity', icon: ClipboardList, label: 'Activity Log', activity: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();

  const isAdmin  = user?.role === 'ADMIN';
  const navItems = isAdmin ? adminNav : userNav;

  // Live trash count for badge
  const { data: trashCountData } = useQuery({
    queryKey: ['trash-count'],
    queryFn:  () => trashApi.getCount().then(r => r.data.data.count as number),
    refetchInterval: 60000, // refresh every minute
    enabled: !isAdmin,
  });
  const trashCount = trashCountData ?? 0;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside className="flex flex-col h-full"
      style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 p-5 mb-2"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--primary)' }}>
          <HardDrive size={16} color="white" />
        </div>
        <span className="font-bold text-base" style={{ color: 'var(--text)' }}>FileVault</span>
        {isAdmin && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)' }}>
            Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(({ href, icon: Icon, label, star, revenue, analytics, security, settings, trash, activity , notes }: any) => {
            const active =
              pathname === href ||
              (href !== '/dashboard' &&
               href !== '/admin/dashboard' &&
               pathname.startsWith(href));

            const accentColor = star      ? '#f59e0b'
                              : revenue   ? '#10b981'
                              : analytics ? '#6366f1'
                              : security  ? '#06b6d4'
                              : settings  ? '#a78bfa'
                              : trash     ? '#f87171'
                              : activity  ? '#38bdf8'
                              : notes    ? '#f59e0b'
                              : 'var(--primary-light)';

            const inactiveHint = star      ? 'rgba(245,158,11,0.6)'
                               : revenue   ? 'rgba(16,185,129,0.6)'
                               : analytics ? 'rgba(99,102,241,0.6)'
                               : security  ? 'rgba(6,182,212,0.6)'
                               : settings  ? 'rgba(167,139,250,0.6)'
                               : trash     ? 'rgba(248,113,113,0.6)'
                               : activity  ? 'rgba(56,189,248,0.6)'
                               : notes    ? 'rgba(245,158,11,0.6)'
                               : undefined;

            const activeColor = active ? accentColor : inactiveHint ?? 'var(--text-muted)';

            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${active ? 'nav-active' : ''}`}
                  style={{
                    color:      activeColor,
                    fontSize:   '0.875rem',
                    fontWeight: active ? 600 : 500,
                    background: active && (star || revenue || analytics || security || settings || trash || activity || notes)
  ? `${accentColor}10` : undefined,
                  }}
                >
                  <Icon size={16} color={activeColor} fill={star && active ? '#f59e0b' : 'none'} />
                  <span className="flex-1">{label}</span>

                  {/* Trash count badge */}
                  {trash && trashCount > 0 && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
                      background: active ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.15)',
                      color: '#f87171',
                    }}>
                      {trashCount > 99 ? '99+' : trashCount}
                    </span>
                  )}

                  {active && !trash && <ChevronRight size={14} />}
                  {active && trash && trashCount === 0 && <ChevronRight size={14} />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User card + logout */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard/settings">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'var(--surface-2)' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={initials}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--primary)', color: 'white' }}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>
                {user?.email}
              </p>
            </div>
          </div>
        </Link>

        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.color      = '#ef4444';
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.color      = 'var(--text-muted)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}