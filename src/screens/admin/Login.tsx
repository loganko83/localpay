/**
 * Admin Login Screen
 * Backend-integrated authentication for admin users
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Toggle } from '../../components/common';
import { useAuthStore } from '../../store';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, isLoading, error: authError, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Please enter your credentials');
      return;
    }

    const success = await loginWithCredentials({
      email,
      password,
      userType: 'admin',
    });

    if (success) {
      navigate('/admin');
    }
  };

  const error = localError || authError;

  return (
    <div className="flex-1 flex flex-col justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
          <span className="material-symbols-outlined text-white text-4xl">admin_panel_settings</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
        <p className="text-text-secondary">LocalPay Platform Management</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Admin Email"
          type="email"
          icon="mail"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error && !email ? 'Email is required' : undefined}
        />

        <Input
          label="Password"
          type="password"
          icon="lock"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error && !password ? 'Password is required' : undefined}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={rememberMe} onChange={setRememberMe} size="sm" />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <button type="button" className="text-sm text-primary hover:underline">
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          loading={isLoading}
        >
          Login to Admin Portal
        </Button>
      </form>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-surface rounded-xl border border-surface-highlight">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-yellow-500">warning</span>
          <div>
            <p className="text-sm font-medium text-white">Security Notice</p>
            <p className="text-xs text-text-secondary mt-1">
              This is a restricted area. All activities are logged and monitored.
              Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>

      {/* Back to App Selector */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
      >
        &larr; Back to app selection
      </button>
    </div>
  );
};

export default Login;
