import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { loginApi, signupApi, logoutApi } from '../api/auth';
import { getApiErrorMessage } from '../utils/apiError';

export function useAuth() {
  const { isAuthenticated, email, login, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (emailInput: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await loginApi(emailInput, password);
      login(data.email);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Login failed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (
    emailInput: string,
    password: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError('');
    try {
      const data = await signupApi(emailInput, password);
      login(data.email);
      return data.otaApiKey;
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Signup failed');
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore logout errors
    }
    logout();
  };

  return {
    isAuthenticated,
    email,
    loading,
    error,
    handleLogin,
    handleSignup,
    handleLogout,
  };
}
