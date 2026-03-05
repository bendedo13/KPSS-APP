import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { authApi, setAccessToken } from '../api/client';
import type { LoginInput } from '@kpss/shared';

interface AuthState {
  userId: string | null;
  email: string | null;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [auth, setAuth] = useState<AuthState>({
    userId: null,
    email: null,
    accessToken: null,
  });

  const login = async (input: LoginInput): Promise<void> => {
    const res = await authApi.login(input);
    if (res.success) {
      setAccessToken(res.data.accessToken);
      setAuth({
        userId: res.data.user.id,
        email: res.data.user.email,
        accessToken: res.data.accessToken,
      });
    }
  };

  const logout = (): void => {
    setAccessToken(null);
    setAuth({ userId: null, email: null, accessToken: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
