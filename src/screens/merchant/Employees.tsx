import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input, Modal } from '../../components/common';
import { Employee } from '../../types';

import { theme } from '../../styles/theme';

const mockEmployees: Employee[] = [
  {
    id: '1',
    merchantId: 'merchant-1',
    name: 'Kim Min-jun',
    email: 'minjun@store42.com',
    phone: '010-1234-5678',
    role: 'manager',
    permissions: ['full_access'],
    status: 'active',
    lastActiveAt: new Date().toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    merchantId: 'merchant-1',
    name: 'Park Soo-yeon',
    email: 'sooyeon@store42.com',
    role: 'cashier',
    permissions: ['pos_only'],
    status: 'active',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    merchantId: 'merchant-1',
    name: 'Lee Jae-hoon',
    email: 'jaehoon@store42.com',
    role: 'cashier',
    permissions: ['pos_only'],
    status: 'pending',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    merchantId: 'merchant-1',
    name: 'Choi Yuna',
    email: 'yuna@store42.com',
    role: 'cashier',
    permissions: ['pos_only', 'view_reports'],
    status: 'active',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    merchantId: 'merchant-1',
    name: 'Han Ji-min',
    email: 'jimin@store42.com',
    role: 'cashier',
    permissions: ['pos_only'],
    status: 'revoked',
    createdAt: '2023-12-01',
  },
];

const statusFilters = ['전체', '활성', '대기 중', '해제됨'];

const Employees: React.FC = () => {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [activeFilter, setActiveFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredEmployees = employees.filter((emp) => {
    const statusMap: Record<string, string> = {
      '전체': 'all',
      '활성': 'active',
      '대기 중': 'pending',
      '해제됨': 'revoked'
    };
    if (activeFilter !== '전체' && emp.status !== statusMap[activeFilter]) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return emp.name.toLowerCase().includes(query) || emp.email.toLowerCase().includes(query);
    }
    return true;
  });

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'revoked': return 'error';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: Employee['role']) => {
    switch (role) {
      case 'owner': return '대표';
      case 'manager': return '매니저';
      case 'cashier': return '캐셔';
      default: return role;
    }
  };

  const getPermissionLabel = (permissions: Employee['permissions']) => {
    if (permissions.includes('full_access')) return '전체 권한';
    if (permissions.includes('view_reports')) return 'POS + 리포트';
    return 'POS 전용';
  };

  return (
    <div className="flex flex-col pb-24">
      <Header title="팀원 관리" />

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="직원 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeFilter === filter ? theme.accent : theme.card,
                color: activeFilter === filter ? theme.bg : theme.textSecondary,
              }}
              onMouseEnter={(e) => {
                if (activeFilter !== filter) {
                  e.currentTarget.style.color = theme.text;
                }
              }}
              onMouseLeave={(e) => {
                if (activeFilter !== filter) {
                  e.currentTarget.style.color = theme.textSecondary;
                }
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold" style={{ color: theme.accent }}>
              {employees.filter((e) => e.status === 'active').length}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>활성</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#ffa502' }}>
              {employees.filter((e) => e.status === 'pending').length}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>대기 중</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold" style={{ color: theme.textMuted }}>
              {employees.filter((e) => e.status === 'revoked').length}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>해제됨</p>
          </Card>
        </div>
      </div>

      {/* Employee List */}
      <div className="px-4 space-y-3">
        {filteredEmployees.map((emp) => (
          <Card key={emp.id} variant="transaction" padding="md">
            <div className="flex items-center gap-3">
              <div className="relative">
                {emp.avatarUrl ? (
                  <img
                    src={emp.avatarUrl}
                    alt={emp.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.card }}
                  >
                    <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>person</span>
                  </div>
                )}
                {emp.status === 'active' && emp.lastActiveAt && (
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
                    style={{ backgroundColor: theme.accent, borderColor: theme.card }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{emp.name}</p>
                  <Badge variant={getStatusColor(emp.status)} size="sm">
                    {emp.status}
                  </Badge>
                </div>
                <p className="text-xs truncate" style={{ color: theme.textSecondary }}>{emp.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: theme.textMuted }}>{getRoleLabel(emp.role)}</span>
                  <span style={{ color: theme.textMuted }}>•</span>
                  <span className="text-xs" style={{ color: theme.textMuted }}>{getPermissionLabel(emp.permissions)}</span>
                </div>
              </div>

              <button
                className="p-2 rounded-full transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.card}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>more_vert</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Employee FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        style={{ backgroundColor: theme.accent }}
      >
        <span className="material-symbols-outlined text-2xl" style={{ color: theme.bg }}>person_add</span>
      </button>

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="팀원 추가"
      >
        <div className="space-y-4">
          <Input label="이름" placeholder="직원 이름을 입력하세요" />
          <Input label="이메일" type="email" placeholder="이메일 주소를 입력하세요" />
          <Input label="전화번호" placeholder="010-0000-0000" />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>역할</label>
            <div className="grid grid-cols-2 gap-2">
              {['매니저', '캐셔'].map((role) => (
                <button
                  key={role}
                  className="p-3 rounded-xl text-sm font-medium transition-colors border"
                  style={{
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.cardHover;
                    e.currentTarget.style.borderColor = theme.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.card;
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>권한</label>
            <div className="space-y-2">
              {['POS 전용', '리포트 보기', '전체 권한'].map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ backgroundColor: theme.card }}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    style={{ accentColor: theme.accent }}
                  />
                  <span className="text-sm" style={{ color: theme.text }}>{perm}</span>
                </label>
              ))}
            </div>
          </div>

          <Button variant="primary" fullWidth size="lg">
            초대장 보내기
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Employees;
