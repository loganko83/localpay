import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input, Modal } from '../../components/common';
import { useEmployees, useInviteEmployee, type Employee } from '../../services/api';

import { theme } from '../../styles/theme';

const statusFilters = ['전체', '활성', '대기 중', '해제됨'];

const Employees: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePhone, setNewEmployeePhone] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<'manager' | 'cashier'>('cashier');

  // API hooks
  const statusMap: Record<string, 'active' | 'pending' | 'revoked' | undefined> = {
    '전체': undefined,
    '활성': 'active',
    '대기 중': 'pending',
    '해제됨': 'revoked'
  };

  const { data: employeesData, isLoading } = useEmployees({
    status: statusMap[activeFilter],
    search: searchQuery || undefined,
  });
  const inviteMutation = useInviteEmployee();

  const employees = employeesData?.employees ?? [];
  const counts = employeesData?.counts ?? { active: 0, pending: 0, revoked: 0, total: 0 };

  const filteredEmployees = employees;

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
              {counts.active}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>활성</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#ffa502' }}>
              {counts.pending}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>대기 중</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold" style={{ color: theme.textMuted }}>
              {counts.revoked}
            </p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>해제됨</p>
          </Card>
        </div>
      </div>

      {/* Employee List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }}></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card padding="lg" className="text-center">
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: theme.textMuted }}>group</span>
            <p className="text-sm" style={{ color: theme.textSecondary }}>등록된 직원이 없습니다</p>
          </Card>
        ) : filteredEmployees.map((emp) => (
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
                <p className="text-xs truncate" style={{ color: theme.textSecondary }}>{emp.email || '-'}</p>
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
          <Input
            label="이름"
            placeholder="직원 이름을 입력하세요"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            placeholder="이메일 주소를 입력하세요"
            value={newEmployeeEmail}
            onChange={(e) => setNewEmployeeEmail(e.target.value)}
          />
          <Input
            label="전화번호"
            placeholder="010-0000-0000"
            value={newEmployeePhone}
            onChange={(e) => setNewEmployeePhone(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>역할</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: '매니저', value: 'manager' as const }, { label: '캐셔', value: 'cashier' as const }].map((role) => (
                <button
                  key={role.value}
                  onClick={() => setNewEmployeeRole(role.value)}
                  className="p-3 rounded-xl text-sm font-medium transition-colors border"
                  style={{
                    backgroundColor: newEmployeeRole === role.value ? theme.accentSoft : theme.card,
                    color: newEmployeeRole === role.value ? theme.accent : theme.text,
                    borderColor: newEmployeeRole === role.value ? theme.accent : 'transparent',
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled={!newEmployeeName || !newEmployeeEmail || inviteMutation.isPending}
            onClick={async () => {
              try {
                await inviteMutation.mutateAsync({
                  name: newEmployeeName,
                  email: newEmployeeEmail,
                  role: newEmployeeRole,
                });
                setShowAddModal(false);
                setNewEmployeeName('');
                setNewEmployeeEmail('');
                setNewEmployeePhone('');
                setNewEmployeeRole('cashier');
              } catch (error) {
                console.error('Failed to invite employee:', error);
              }
            }}
          >
            {inviteMutation.isPending ? '전송 중...' : '초대장 보내기'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Employees;
