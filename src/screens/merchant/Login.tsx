import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Toggle } from '../../components/common';
import { useAuthStore } from '../../store';

import { theme } from '../../styles/theme';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, setUserType } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock login - accept any credentials for demo
    if (email && password) {
      const mockMerchant = {
        id: 'merchant-1',
        name: 'Store Owner',
        email: email,
        businessNumber: '123-45-67890',
        storeName: 'Jeonju Store #42',
        category: 'Restaurant',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      setUserType('merchant');
      login(mockMerchant, 'merchant');
      navigate('/merchant');
    } else {
      setError('Please enter your credentials');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center justify-center h-20 w-20 rounded-2xl mb-4"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}, #d63447)`
          }}
        >
          <span
            className="material-symbols-outlined text-4xl"
            style={{ color: theme.text }}
          >
            storefront
          </span>
        </div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: theme.text }}
        >
          Merchant Portal
        </h1>
        <p style={{ color: theme.textSecondary }}>Manage your store with LocalPay</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email or Merchant ID"
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
            <span className="text-sm" style={{ color: theme.textSecondary }}>Keep me logged in</span>
          </label>
          <button
            type="button"
            className="text-sm hover:underline"
            style={{ color: theme.accent }}
          >
            Forgot Password?
          </button>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: theme.accent }}>{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          loading={isLoading}
        >
          Login
        </Button>
      </form>

      {/* Biometric Login */}
      <div className="mt-6 text-center">
        <button
          className="inline-flex items-center gap-2 transition-colors"
          style={{ color: theme.textSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
          onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
        >
          <span className="material-symbols-outlined">fingerprint</span>
          <span className="text-sm">Login with Biometrics</span>
        </button>
      </div>

      {/* Register Link */}
      <div className="mt-8 text-center">
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          Don't have an account?{' '}
          <button
            className="hover:underline"
            style={{ color: theme.accent }}
          >
            Apply for Merchant Account
          </button>
        </p>
      </div>

      {/* Back to App Selector */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-center text-sm transition-colors"
        style={{ color: theme.textMuted }}
        onMouseEnter={(e) => e.currentTarget.style.color = theme.textSecondary}
        onMouseLeave={(e) => e.currentTarget.style.color = theme.textMuted}
      >
        ← Back to App Selection
      </button>
    </div>
  );
};

export default Login;
