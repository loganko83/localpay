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

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email && password) {
      const mockAdmin = {
        id: 'admin-1',
        name: 'System Admin',
        email: email,
        role: 'super_admin' as const,
        permissions: ['manage_users', 'manage_merchants', 'issue_vouchers', 'process_settlements', 'view_analytics', 'system_config'] as ('manage_users' | 'manage_merchants' | 'issue_vouchers' | 'process_settlements' | 'view_analytics' | 'system_config')[],
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setUserType('admin');
      login(mockAdmin, 'admin');
      navigate('/admin');
    } else {
      setError('자격 증명을 입력해주세요');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
          <span className="material-symbols-outlined text-white text-4xl">admin_panel_settings</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">관리자 포털</h1>
        <p className="text-text-secondary">LocalPay 플랫폼 관리</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="관리자 이메일"
          type="email"
          icon="mail"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="비밀번호"
          type="password"
          icon="lock"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={rememberMe} onChange={setRememberMe} size="sm" />
            <span className="text-sm text-text-secondary">로그인 상태 유지</span>
          </label>
          <button type="button" className="text-sm text-primary hover:underline">
            비밀번호 찾기
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
          관리자 포털 로그인
        </Button>
      </form>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-surface rounded-xl border border-surface-highlight">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-yellow-500">warning</span>
          <div>
            <p className="text-sm font-medium text-white">보안 안내</p>
            <p className="text-xs text-text-secondary mt-1">
              제한된 영역입니다. 모든 활동이 기록되고 모니터링됩니다.
              무단 접근은 금지되어 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Back to App Selector */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
      >
        ← 앱 선택으로 돌아가기
      </button>
    </div>
  );
};

export default Login;
