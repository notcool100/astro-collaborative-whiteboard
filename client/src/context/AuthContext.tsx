'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User } from '@/services/api';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string; preferences?: Record<string, any> }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check if token is valid
  const isTokenValid = (token: string): boolean => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < currentTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  // Load user from token on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token || !isTokenValid(token)) {
          setIsLoading(false);
          return;
        }
        
        const response = await authApi.getCurrentUser();
        setUser(response.data.data.user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.login({ email, password });
      const { user, token, refreshToken } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);
      router.push('/dashboard');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.register({ name, email, password });
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      
      setUser(user);
      setIsAuthenticated(true);
      router.push('/dashboard');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      router.push('/login');
    }
  };

  // Update profile function
  const updateProfile = async (data: { name?: string; avatar?: string; preferences?: Record<string, any> }) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.updateProfile(data);
      setUser(response.data.data.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}