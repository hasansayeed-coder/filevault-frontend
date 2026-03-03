import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    accessToken,
    isAuthenticated,
    setAuth,
    logout: logoutStore,
  } = useAuthStore();

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email, password });
      const { accessToken, refreshToken, user } = res.data.data;

      setAuth(user, accessToken, refreshToken);

      toast.success(`Welcome back, ${user.firstName}!`);

      // Redirect based on role
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }

      return { success: true };
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      await authApi.register({ email, password, firstName, lastName });
      toast.success('Registration successful! Please verify your email.');
      router.push('/login');
      return { success: true };
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    logoutStore();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const forgotPassword = async (email: string) => {
    try {
      await authApi.forgotPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to send reset email.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Password reset successfully! Please login.');
      router.push('/login');
      return { success: true };
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to reset password.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isUser = user?.role === 'USER';

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    isUser,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };
}
