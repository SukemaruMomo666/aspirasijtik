import { useAuthStore } from '../store/authStore';
import { adminAPI } from '../services/api';
import { LoginResponse } from '../types';

export const useAuth = () => {
  const { admin, token, isLoading, error, setAdmin, setToken, setLoading, setError, logout } =
    useAuthStore();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.login(email, password);
      const data = response.data as LoginResponse;
      setToken(data.token);
      setAdmin(data.admin);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login gagal';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
    }
  };

  const isAuthenticated = !!token && !!admin;

  return {
    admin,
    token,
    isLoading,
    error,
    isAuthenticated,
    setAdmin,
    login,
    logout: handleLogout,
  };
};
