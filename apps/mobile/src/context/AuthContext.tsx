import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, setAccessToken } from '../api/client';
import { storage } from '../utils/storage';
import type { LoginInput, RegisterInput } from '@kpss/shared';

interface AuthState {
  userId: string | null;
  email: string | null;
  name: string | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  restoreAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [auth, setAuth] = useState<AuthState>({
    userId: null,
    email: null,
    name: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore authentication on app start
  useEffect(() => {
    restoreAuth();
  }, []);

  const restoreAuth = async (): Promise<void> => {
    try {
      const token = await storage.getAccessToken();
      const userData = await storage.getUserData();

      if (token && userData) {
        setAccessToken(token);
        setAuth({
          userId: userData.userId,
          email: userData.email,
          name: userData.name,
          accessToken: token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuth((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to restore auth:', error);
      setAuth((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (input: LoginInput): Promise<void> => {
    const res = await authApi.login(input);
    if (res.success) {
      const { accessToken, user } = res.data;
      
      // Save to storage
      await storage.setAccessToken(accessToken);
      await storage.setUserData(user.id, user.email, user.name);
      
      // Update API client
      setAccessToken(accessToken);
      
      // Update context state
      setAuth({
        userId: user.id,
        email: user.email,
        name: user.name,
        accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      throw new Error(res.error?.message ?? 'Login failed');
    }
  };

  const register = async (input: RegisterInput): Promise<void> => {
    const res = await authApi.register(input);
    if (res.success) {
      const { accessToken, user } = res.data;
      
      // Save to storage
      await storage.setAccessToken(accessToken);
      await storage.setUserData(user.id, user.email, user.name);
      
      // Update API client
      setAccessToken(accessToken);
      
      // Update context state
      setAuth({
        userId: user.id,
        email: user.email,
        name: user.name,
        accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      throw new Error(res.error?.message ?? 'Registration failed');
    }
  };

  const logout = async (): Promise<void> => {
    // Clear storage
    await storage.clearAll();
    
    // Clear API client token
    setAccessToken(null);
    
    // Clear context state
    setAuth({
      userId: null,
      email: null,
      name: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout, restoreAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
