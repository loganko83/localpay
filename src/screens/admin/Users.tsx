import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Input, Button } from '../../components/common';
import { useAdminDashboard } from '../../services/api';
import { merchantService } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../styles/theme';

const Users: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'citizens' | 'merchants'>('merchants');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dashboardData } = useAdminDashboard();
  const { data: merchantsData } = useQuery({
    queryKey: ['merchants', 'list'],
    queryFn: () => merchantService.listMerchants(),
    staleTime: 30000,
  });

  const merchants = merchantsData ?? [];

  const stats = {
    pending: dashboardData?.merchants?.pending ?? 0,
    active: dashboardData?.merchants?.verified ?? 0,
    suspended: 0,
  };

  // Filter merchants based on status and search
  const filteredMerchants = merchants.filter((m) => {
    const merchantStatus = m.isVerified ? 'active' : 'pending';
    if (statusFilter !== 'all' && merchantStatus !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return m.storeName.toLowerCase().includes(query) || m.businessNumber.toLowerCase().includes(query);
    }
    return true;
  });

  // Pending applications (merchants not yet verified)
  const pendingApplications = merchants
    .filter(m => !m.isVerified)
    .slice(0, 5)
    .map(m => ({
      id: m.id,
      name: m.storeName,
      businessNumber: m.businessNumber,
      appliedAt: new Date(m.createdAt).toLocaleDateString('ko-KR'),
      documents: 3,
    }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col pb-4" style={{ background: theme.bg }}>
      <Header title="사용자 관리" />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-surface rounded-xl">
          <button
            onClick={() => setActiveTab('citizens')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'citizens' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
              }`}
          >
            시민
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'merchants' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
              }`}
          >
            가맹점
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="지갑 ID 또는 사업자번호로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-3">
        <Card
          padding="sm"
          className={`text-center cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          <p className="text-xs text-text-secondary">대기 중</p>
        </Card>
        <Card
          padding="sm"
          className={`text-center cursor-pointer ${statusFilter === 'active' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        >
          <p className="text-2xl font-bold text-primary">{stats.active.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">활성</p>
        </Card>
        <Card
          padding="sm"
          className={`text-center cursor-pointer ${statusFilter === 'suspended' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'suspended' ? 'all' : 'suspended')}
        >
          <p className="text-2xl font-bold text-red-500">{stats.suspended}</p>
          <p className="text-xs text-text-secondary">정지</p>
        </Card>
      </div>

      {/* Pending Applications */}
      {(statusFilter === 'all' || statusFilter === 'pending') && pendingApplications.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-sm font-bold text-white mb-3">대기 중 신청</h3>
          <div className="space-y-3">
            {pendingApplications.map((app) => (
              <Card key={app.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{app.name}</p>
                    <p className="text-xs text-text-secondary">
                      {app.businessNumber} • 신청: {app.appliedAt}
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">{app.documents}개 문서</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1">
                    <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                    승인
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1">
                    <span className="material-symbols-outlined text-[16px] mr-1">close</span>
                    거절
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Merchant List */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">
          {activeTab === 'merchants' ? '등록된 가맹점' : '등록된 시민'}
        </h3>
        <div className="space-y-3">
          {filteredMerchants.map((merchant) => {
            const status = merchant.isVerified ? 'active' : 'pending';
            return (
              <Card key={merchant.id} variant="transaction" padding="md">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-surface-highlight flex items-center justify-center">
                    {merchant.imageUrl ? (
                      <img src={merchant.imageUrl} alt={merchant.storeName} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-text-secondary">storefront</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{merchant.storeName}</p>
                      <Badge variant={getStatusColor(status)} size="sm">
                        {status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary font-mono">{merchant.businessNumber}</span>
                      <button className="text-text-muted hover:text-white">
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {merchant.category} • 등록일: {new Date(merchant.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <button className="p-2 rounded-full hover:bg-surface-highlight transition-colors">
                    <span className="material-symbols-outlined text-text-secondary">more_vert</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Users;
