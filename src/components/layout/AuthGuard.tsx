'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, rehydrate } = useAuthStore();

  useEffect(() => {
    rehydrate(); // restore auth from localStorage on every page load
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
      }
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}