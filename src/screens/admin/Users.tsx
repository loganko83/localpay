import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Input, Button } from '../../components/common';

const mockMerchants = [
  { id: '1', name: 'Jeonju Bibimbap', walletAddress: '0x1a2b...3c4d', status: 'active' as const, lastTx: '2 min ago', type: 'Restaurant' },
  { id: '2', name: 'Jeonju Coffee', walletAddress: '0x5e6f...7g8h', status: 'pending' as const, lastTx: 'Pending', type: 'Cafe' },
  { id: '3', name: 'Jeonju Hanok Mart', walletAddress: '0x9i0j...1k2l', status: 'active' as const, lastTx: '1 hour ago', type: 'Retail' },
  { id: '4', name: 'Hanok Village Hotel', walletAddress: '0x3m4n...5o6p', status: 'suspended' as const, lastTx: '3 days ago', type: 'Hospitality' },
  { id: '5', name: 'Jeonju Bakery', walletAddress: '0x7q8r...9s0t', status: 'pending' as const, lastTx: 'Pending', type: 'Food' },
];

const pendingApplications = [
  { id: 'p1', name: 'New Cafe Hanok', businessNumber: '123-45-67890', appliedAt: '2 hours ago', documents: 3 },
  { id: 'p2', name: 'Jeonju Fish Market', businessNumber: '234-56-78901', appliedAt: '5 hours ago', documents: 4 },
];

const Users: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'citizens' | 'merchants'>('merchants');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    pending: 12,
    active: 1204,
    suspended: 5,
  };

  const filteredMerchants = mockMerchants.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(query) || m.walletAddress.toLowerCase().includes(query);
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="User Management" />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-surface rounded-xl">
          <button
            onClick={() => setActiveTab('citizens')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'citizens' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
            }`}
          >
            Citizens
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'merchants' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
            }`}
          >
            Merchants
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="Search by wallet ID or business number..."
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
          <p className="text-xs text-text-secondary">Pending</p>
        </Card>
        <Card
          padding="sm"
          className={`text-center cursor-pointer ${statusFilter === 'active' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        >
          <p className="text-2xl font-bold text-primary">{stats.active.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">Active</p>
        </Card>
        <Card
          padding="sm"
          className={`text-center cursor-pointer ${statusFilter === 'suspended' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'suspended' ? 'all' : 'suspended')}
        >
          <p className="text-2xl font-bold text-red-500">{stats.suspended}</p>
          <p className="text-xs text-text-secondary">Suspended</p>
        </Card>
      </div>

      {/* Pending Applications */}
      {(statusFilter === 'all' || statusFilter === 'pending') && pendingApplications.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-sm font-bold text-white mb-3">Pending Applications</h3>
          <div className="space-y-3">
            {pendingApplications.map((app) => (
              <Card key={app.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{app.name}</p>
                    <p className="text-xs text-text-secondary">
                      {app.businessNumber} • Applied {app.appliedAt}
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">{app.documents} docs</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1">
                    <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                    Approve
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1">
                    <span className="material-symbols-outlined text-[16px] mr-1">close</span>
                    Decline
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
          {activeTab === 'merchants' ? 'Registered Merchants' : 'Registered Citizens'}
        </h3>
        <div className="space-y-3">
          {filteredMerchants.map((merchant) => (
            <Card key={merchant.id} variant="transaction" padding="md">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-surface-highlight flex items-center justify-center">
                  <span className="material-symbols-outlined text-text-secondary">storefront</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{merchant.name}</p>
                    <Badge variant={getStatusColor(merchant.status)} size="sm">
                      {merchant.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary font-mono">{merchant.walletAddress}</span>
                    <button className="text-text-muted hover:text-white">
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {merchant.type} • Last tx: {merchant.lastTx}
                  </p>
                </div>
                <button className="p-2 rounded-full hover:bg-surface-highlight transition-colors">
                  <span className="material-symbols-outlined text-text-secondary">more_vert</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Users;
