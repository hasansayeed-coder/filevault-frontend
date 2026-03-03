import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  adminOnly?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false, adminOnly = false }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, rehydrate } = useAuthStore();

  useEffect(() => {
    rehydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
    }
    if ((requireAdmin || adminOnly) && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, requireAdmin, adminOnly]);

  return <>{children}</>;
}