'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AxiosError } from 'axios';

export default function Login() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      // The auth context will handle the redirect to dashboard
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof AxiosError && error.response) {
        // Handle API error responses
        if (error.response.status === 401) {
          setErrors({
            form: 'Invalid email or password',
          });
        } else if (error.response.data?.message) {
          setErrors({
            form: error.response.data.message,
          });
        } else {
          setErrors({
            form: 'An error occurred during login. Please try again.',
          });
        }
      } else {
        setErrors({
          form: 'An error occurred during login. Please try again.',
        });
      }
      
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-primary">PCS Draw</h1>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-text">Welcome Back</h2>
          <p className="mt-2 text-text-secondary">Sign in to your account</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.form && (
            <div className="bg-error-10 text-error p-3 rounded-md text-sm">
              {errors.form}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`input w-full ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="error-message">{errors.email}</p>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`input w-full ${errors.password ? 'input-error' : ''}`}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="error-message">{errors.password}</p>
              )}
            </div>
            
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-text">
                Remember me
              </label>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="btn btn-primary w-full py-3"
              disabled={isLoading || authLoading}
            >
              {(isLoading || authLoading) ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary-dark font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}