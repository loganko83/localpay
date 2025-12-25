import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Toggle } from '../../components/common';
import { useAuthStore } from '../../store';

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
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
          <span className="material-symbols-outlined text-background text-4xl">storefront</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Merchant Portal</h1>
        <p className="text-text-secondary">Manage your store with LocalPay</p>
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
            <span className="text-sm text-text-secondary">Keep me logged in</span>
          </label>
          <button type="button" className="text-sm text-primary hover:underline">
            Forgot Password?
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
          Login
        </Button>
      </form>

      {/* Biometric Login */}
      <div className="mt-6 text-center">
        <button className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
          <span className="material-symbols-outlined">fingerprint</span>
          <span className="text-sm">Login with Biometrics</span>
        </button>
      </div>

      {/* Register Link */}
      <div className="mt-8 text-center">
        <p className="text-text-secondary text-sm">
          Don't have an account?{' '}
          <button className="text-primary hover:underline">
            Apply for Merchant Account
          </button>
        </p>
      </div>

      {/* Back to App Selector */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
      >
        ← Back to App Selection
      </button>
    </div>
  );
};

export default Login;
