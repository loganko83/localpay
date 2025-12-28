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
      setError('인증 정보를 입력해주세요');
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
          가맹점 포털
        </h1>
        <p style={{ color: theme.textSecondary }}>LocalPay로 매장을 관리하세요</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="이메일 또는 가맹점 ID"
          type="email"
          icon="mail"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error && !email ? '이메일을 입력해주세요' : undefined}
        />

        <Input
          label="비밀번호"
          type="password"
          icon="lock"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error && !password ? '비밀번호를 입력해주세요' : undefined}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={rememberMe} onChange={setRememberMe} size="sm" />
            <span className="text-sm" style={{ color: theme.textSecondary }}>로그인 상태 유지</span>
          </label>
          <button
            type="button"
            className="text-sm hover:underline"
            style={{ color: theme.accent }}
          >
            비밀번호 찾기
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
          로그인
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
          <span className="text-sm">생체인증으로 로그인</span>
        </button>
      </div>

      {/* Register Link */}
      <div className="mt-8 text-center">
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          계정이 없으신가요?{' '}
          <button
            className="hover:underline"
            style={{ color: theme.accent }}
          >
            가맹점 계정 신청
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
        ← 앱 선택으로 돌아가기
      </button>
    </div>
  );
};

export default Login;
