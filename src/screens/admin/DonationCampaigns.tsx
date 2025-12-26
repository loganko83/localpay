import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, Badge, Modal, Button, Input } from '../../components/common';
import { donationPlatformService, DonationCampaign, RegisteredCharity, CharityCategory, DonationType } from '../../services/donationPlatform';

type TabType = 'active' | 'pending' | 'completed' | 'rejected';
type ViewMode = 'campaigns' | 'organizations' | 'analytics' | 'receipts' | 'transparency';

interface CampaignFormData {
  charityId: string;
  title: string;
  description: string;
  targetAmount: number;
  endDate: string;
  category: CharityCategory;
  impactMetrics: string;
}

interface OrganizationFormData {
  name: string;
  registrationNumber: string;
  category: CharityCategory;
  donationType: DonationType;
  description: string;
  website: string;
}

const DonationCampaigns: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('campaigns');
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [organizations, setOrganizations] = useState<RegisteredCharity[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  void selectedCampaign; void setSelectedCampaign; // Reserved for future use

  const [campaignForm, setCampaignForm] = useState<CampaignFormData>({
    charityId: '',
    title: '',
    description: '',
    targetAmount: 0,
    endDate: '',
    category: 'WELFARE',
    impactMetrics: '',
  });

  const [orgForm, setOrgForm] = useState<OrganizationFormData>({
    name: '',
    registrationNumber: '',
    category: 'WELFARE',
    donationType: 'DESIGNATED',
    description: '',
    website: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const activeCampaigns = donationPlatformService.getActiveCampaigns();
    setCampaigns(activeCampaigns);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000) {
      return `₩${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `₩${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₩${(amount / 1000).toFixed(0)}K`;
    }
    return `₩${amount.toLocaleString()}`;
  };

  const getDaysRemaining = (endDate: number) => {
    const days = Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getProgressPercentage = (raised: number, target: number) => {
    return Math.min(100, Math.round((raised / target) * 100));
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.charityId || !campaignForm.title || !campaignForm.targetAmount || !campaignForm.endDate) {
      alert('Please fill all required fields');
      return;
    }

    const endDate = new Date(campaignForm.endDate).getTime();
    const campaign = donationPlatformService.createCampaign({
      charityId: campaignForm.charityId,
      title: campaignForm.title,
      description: campaignForm.description,
      targetAmount: campaignForm.targetAmount,
      endDate,
    });

    if (campaign) {
      loadData();
      setShowCreateModal(false);
      setCampaignForm({
        charityId: '',
        title: '',
        description: '',
        targetAmount: 0,
        endDate: '',
        category: 'WELFARE',
        impactMetrics: '',
      });
    } else {
      alert('Failed to create campaign');
    }
  };

  const handleCreateOrganization = () => {
    if (!orgForm.name || !orgForm.registrationNumber || !orgForm.description) {
      alert('Please fill all required fields');
      return;
    }

    const charity = donationPlatformService.registerCharity({
      name: orgForm.name,
      registrationNumber: orgForm.registrationNumber,
      category: orgForm.category,
      donationType: orgForm.donationType,
      description: orgForm.description,
      website: orgForm.website,
    });

    if (charity) {
      setOrganizations([...organizations, charity]);
      setShowOrgModal(false);
      setOrgForm({
        name: '',
        registrationNumber: '',
        category: 'WELFARE',
        donationType: 'DESIGNATED',
        description: '',
        website: '',
      });
    }
  };

  const donationTrendData = [
    { month: '7월', amount: 45 },
    { month: '8월', amount: 52 },
    { month: '9월', amount: 48 },
    { month: '10월', amount: 61 },
    { month: '11월', amount: 73 },
    { month: '12월', amount: 89 },
  ];

  const categoryData = [
    { name: '복지', value: 35, color: '#2b8cee' },
    { name: '교육', value: 25, color: '#22c55e' },
    { name: '의료', value: 20, color: '#f59e0b' },
    { name: '환경', value: 12, color: '#8b5cf6' },
    { name: '기타', value: 8, color: '#6b7280' },
  ];

  const topCampaigns = [
    { name: 'Children Education Fund', raised: 245000000, donors: 1234 },
    { name: 'Medical Relief', raised: 198000000, donors: 987 },
    { name: 'Disaster Recovery', raised: 167000000, donors: 756 },
    { name: 'Environmental Protection', raised: 134000000, donors: 543 },
  ];

  const platformOverview = {
    totalDonations: 1245000000,
    activeCampaigns: 42,
    successRate: 87.5,
    registeredOrgs: 156,
    thisMonth: 189000000,
    avgDonation: 125000,
    newDonors: 234,
    recurringDonors: 567,
  };

  const pendingReceipts = [
    { id: 'RCP-001', donor: 'Kim MinJun', amount: 500000, date: Date.now() - 86400000 },
    { id: 'RCP-002', donor: 'Lee SeoYeon', amount: 300000, date: Date.now() - 172800000 },
    { id: 'RCP-003', donor: 'Park JiHo', amount: 1000000, date: Date.now() - 259200000 },
  ];

  const renderCampaignManagement = () => (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { key: 'active', label: 'Active', count: 24 },
          { key: 'pending', label: 'Pending Approval', count: 8 },
          { key: 'completed', label: 'Completed', count: 156 },
          { key: 'rejected', label: 'Rejected', count: 3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-[#2b8cee] text-white'
                : 'bg-surface text-text-secondary'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? 'bg-white/20' : 'bg-surface-highlight'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-text-muted mb-3">
                campaign
              </span>
              <p className="text-text-secondary">No campaigns found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-[#2b8cee] text-white rounded-xl text-sm font-medium"
              >
                Create First Campaign
              </button>
            </div>
          </Card>
        ) : (
          campaigns.map((campaign) => {
            const progress = getProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
            const daysLeft = getDaysRemaining(campaign.endDate);

            return (
              <Card key={campaign.id} padding="md">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white mb-1">{campaign.title}</h3>
                      <p className="text-xs text-text-secondary">
                        {donationPlatformService.getCharity(campaign.charityId)?.name || 'Unknown Organization'}
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'default'}>
                      {campaign.status}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium">
                        {formatAmount(campaign.raisedAmount)} raised
                      </span>
                      <span className="text-text-secondary">
                        of {formatAmount(campaign.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2b8cee] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-primary font-medium">{progress}%</span>
                      <span className="text-text-muted">{daysLeft} days left</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-text-muted">
                        group
                      </span>
                      <span className="text-text-secondary">{campaign.donorCount} donors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-text-muted">
                        calendar_today
                      </span>
                      <span className="text-text-secondary">
                        {new Date(campaign.startDate).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-surface-highlight">
                    <button className="flex-1 py-2 bg-surface-highlight text-white text-xs font-medium rounded-lg active:scale-95 transition-transform">
                      Edit
                    </button>
                    <button className="flex-1 py-2 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-lg active:scale-95 transition-transform">
                      Pause
                    </button>
                    <button className="flex-1 py-2 bg-red-500/20 text-red-500 text-xs font-medium rounded-lg active:scale-95 transition-transform">
                      Close
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderOrganizations = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white">Registered Organizations</h3>
        <button
          onClick={() => setShowOrgModal(true)}
          className="px-3 py-1.5 bg-[#2b8cee] text-white text-xs font-medium rounded-lg"
        >
          Add Organization
        </button>
      </div>

      <div className="space-y-3">
        {organizations.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-text-muted mb-3">
                business
              </span>
              <p className="text-text-secondary">No organizations registered</p>
            </div>
          </Card>
        ) : (
          organizations.map((org) => (
            <Card key={org.id} padding="md">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">{org.name}</h3>
                    <p className="text-xs text-text-secondary">Reg: {org.registrationNumber}</p>
                  </div>
                  <Badge variant={org.isVerified ? 'success' : 'warning'}>
                    {org.isVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-text-muted mb-1">Category</p>
                    <p className="text-white font-medium">{org.category}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-1">Type</p>
                    <p className="text-white font-medium">{org.donationType}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-1">Total Received</p>
                    <p className="text-primary font-medium">{formatAmount(org.totalReceived)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-1">Distributed</p>
                    <p className="text-primary font-medium">{formatAmount(org.totalDistributed)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-surface-highlight">
                  <button className="flex-1 py-2 bg-surface-highlight text-white text-xs font-medium rounded-lg">
                    View Details
                  </button>
                  <button className="flex-1 py-2 bg-surface-highlight text-white text-xs font-medium rounded-lg">
                    Documents
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4">
      {/* Donation Trend Chart */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Donation Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={donationTrendData}>
              <defs>
                <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5c6a7a', fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5c6a7a', fontSize: 10 }}
                tickFormatter={(value) => `${value}M`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c242c', borderColor: '#2a3540', borderRadius: '8px' }}
                formatter={(value) => [`₩${value}M`, 'Donations']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#2b8cee"
                strokeWidth={2}
                fill="url(#donationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Donations by Category</h3>
        <div className="flex items-center gap-4">
          <div className="h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Top Campaigns */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Top Performing Campaigns</h3>
        <div className="space-y-3">
          {topCampaigns.map((campaign, index) => (
            <div key={campaign.name} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[#2b8cee]/20 flex items-center justify-center text-[#2b8cee] text-xs font-bold">
                #{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{campaign.name}</p>
                <p className="text-xs text-text-secondary">{campaign.donors} donors</p>
              </div>
              <p className="text-sm text-primary font-bold">{formatAmount(campaign.raised)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Donor Demographics */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Donor Demographics</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Age 20-30', value: '28%', icon: 'person' },
            { label: 'Age 31-40', value: '34%', icon: 'person' },
            { label: 'Age 41-50', value: '22%', icon: 'person' },
            { label: 'Age 51+', value: '16%', icon: 'person' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-surface-highlight rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[16px] text-text-muted">
                  {item.icon}
                </span>
                <span className="text-xs text-text-secondary">{item.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderReceipts = () => (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Pending Tax Receipts</h3>
          <Badge variant="warning">{pendingReceipts.length}</Badge>
        </div>

        <div className="space-y-3 mb-4">
          {pendingReceipts.map((receipt) => (
            <div key={receipt.id} className="p-3 bg-surface-highlight rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{receipt.donor}</p>
                <Badge variant="warning" size="sm">Pending</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">
                  {new Date(receipt.date).toLocaleDateString('ko-KR')}
                </span>
                <span className="text-primary font-medium">{formatAmount(receipt.amount)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-[#2b8cee] text-white text-sm font-medium rounded-lg">
            Generate Batch Receipts
          </button>
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Receipt History</h3>
        <div className="space-y-2">
          {[
            { id: 'RCP-2024-001', donor: 'Park JiHo', amount: 500000, date: Date.now() - 604800000, status: 'issued' },
            { id: 'RCP-2024-002', donor: 'Choi MinSeo', amount: 300000, date: Date.now() - 1209600000, status: 'issued' },
            { id: 'RCP-2024-003', donor: 'Kim SeoJun', amount: 1000000, date: Date.now() - 1814400000, status: 'issued' },
          ].map((receipt) => (
            <div key={receipt.id} className="p-3 bg-surface rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">{receipt.id}</p>
                <p className="text-xs text-text-secondary">{receipt.donor}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary font-medium">{formatAmount(receipt.amount)}</p>
                <p className="text-xs text-text-muted">
                  {new Date(receipt.date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderTransparency = () => (
    <div className="space-y-4">
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Fund Allocation</h3>
        <div className="space-y-3">
          {[
            { category: 'Program Expenses', amount: 756000000, percentage: 72, color: '#2b8cee' },
            { category: 'Administrative Costs', amount: 126000000, percentage: 12, color: '#f59e0b' },
            { category: 'Fundraising Expenses', amount: 84000000, percentage: 8, color: '#8b5cf6' },
            { category: 'Reserve Fund', amount: 84000000, percentage: 8, color: '#6b7280' },
          ].map((item) => (
            <div key={item.category}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">{item.category}</span>
                <span className="text-white font-medium">{item.percentage}%</span>
              </div>
              <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">{formatAmount(item.amount)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Blockchain Verification</h3>
        <div className="space-y-3">
          {[
            { type: 'Donation Record', hash: '0xaf4...b2e9', verified: true },
            { type: 'Fund Distribution', hash: '0x7cd...4a1f', verified: true },
            { type: 'Impact Report', hash: '0x2e8...9c3d', verified: true },
          ].map((item, index) => (
            <div key={index} className="p-3 bg-surface rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">{item.type}</p>
                <Badge variant="success" size="sm">
                  <span className="material-symbols-outlined text-[10px]">verified</span>
                  Verified
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted font-mono">{item.hash}</p>
                <button className="text-[#2b8cee] text-xs">View</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Impact Metrics Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Beneficiaries', value: '12,345', icon: 'group' },
            { label: 'Projects Completed', value: '87', icon: 'task_alt' },
            { label: 'Communities Served', value: '23', icon: 'location_on' },
            { label: 'Transparency Score', value: '94/100', icon: 'verified' },
          ].map((metric) => (
            <div key={metric.label} className="p-3 bg-surface-highlight rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-[#2b8cee]">
                  {metric.icon}
                </span>
                <span className="text-xs text-text-secondary">{metric.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-surface">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">Donation Platform</h1>
            <p className="text-xs text-text-secondary">Transparent donation management</p>
          </div>
          {viewMode === 'campaigns' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 w-9 rounded-full bg-[#2b8cee] flex items-center justify-center active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-white text-[20px]">add</span>
            </button>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { key: 'campaigns', label: 'Campaigns', icon: 'campaign' },
            { key: 'organizations', label: 'Organizations', icon: 'business' },
            { key: 'analytics', label: 'Analytics', icon: 'analytics' },
            { key: 'receipts', label: 'Receipts', icon: 'receipt' },
            { key: 'transparency', label: 'Transparency', icon: 'verified' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as ViewMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                viewMode === mode.key
                  ? 'bg-[#2b8cee]/20 text-[#2b8cee]'
                  : 'bg-surface text-text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Overview */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Total Donations</p>
          <p className="text-xl font-bold text-white">{formatAmount(platformOverview.totalDonations)}</p>
          <p className="text-xs text-[#2b8cee] mt-1">+12.5% this month</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Active Campaigns</p>
          <p className="text-xl font-bold text-white">{platformOverview.activeCampaigns}</p>
          <p className="text-xs text-[#2b8cee] mt-1">+3 this week</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Success Rate</p>
          <p className="text-xl font-bold text-white">{platformOverview.successRate}%</p>
          <p className="text-xs text-primary mt-1">Above average</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Organizations</p>
          <p className="text-xl font-bold text-white">{platformOverview.registeredOrgs}</p>
          <p className="text-xs text-primary mt-1">+8 verified</p>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">This Month Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-[#2b8cee]">
                payments
              </span>
              <p className="text-xs text-text-secondary">Month Donations</p>
            </div>
            <p className="text-lg font-bold text-white">{formatAmount(platformOverview.thisMonth)}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-[#2b8cee]">
                calculate
              </span>
              <p className="text-xs text-text-secondary">Average Donation</p>
            </div>
            <p className="text-lg font-bold text-white">{formatAmount(platformOverview.avgDonation)}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-[#2b8cee]">
                person_add
              </span>
              <p className="text-xs text-text-secondary">New Donors</p>
            </div>
            <p className="text-lg font-bold text-white">{platformOverview.newDonors}</p>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-[#2b8cee]">
                autorenew
              </span>
              <p className="text-xs text-text-secondary">Recurring Donors</p>
            </div>
            <p className="text-lg font-bold text-white">{platformOverview.recurringDonors}</p>
          </Card>
        </div>
      </div>

      {/* Content by View Mode */}
      <div className="px-4">
        {viewMode === 'campaigns' && renderCampaignManagement()}
        {viewMode === 'organizations' && renderOrganizations()}
        {viewMode === 'analytics' && renderAnalytics()}
        {viewMode === 'receipts' && renderReceipts()}
        {viewMode === 'transparency' && renderTransparency()}
      </div>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Donation Campaign"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-xs text-text-secondary mb-2">Organization</label>
            <select
              value={campaignForm.charityId}
              onChange={(e) => setCampaignForm({ ...campaignForm, charityId: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm"
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Campaign Title"
            value={campaignForm.title}
            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
            placeholder="Enter campaign title"
          />

          <div>
            <label className="block text-xs text-text-secondary mb-2">Description</label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
              placeholder="Describe the campaign purpose and goals"
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm resize-none"
              rows={3}
            />
          </div>

          <Input
            label="Goal Amount (KRW)"
            type="number"
            value={campaignForm.targetAmount || ''}
            onChange={(e) => setCampaignForm({ ...campaignForm, targetAmount: Number(e.target.value) })}
            placeholder="Enter target amount"
          />

          <Input
            label="End Date"
            type="date"
            value={campaignForm.endDate}
            onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
          />

          <div>
            <label className="block text-xs text-text-secondary mb-2">Category</label>
            <select
              value={campaignForm.category}
              onChange={(e) => setCampaignForm({ ...campaignForm, category: e.target.value as CharityCategory })}
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm"
            >
              <option value="WELFARE">Welfare</option>
              <option value="EDUCATION">Education</option>
              <option value="MEDICAL">Medical</option>
              <option value="DISASTER">Disaster Relief</option>
              <option value="ENVIRONMENT">Environment</option>
              <option value="CULTURE">Culture</option>
              <option value="INTERNATIONAL">International Aid</option>
              <option value="LOCAL_COMMUNITY">Local Community</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2">Impact Metrics</label>
            <textarea
              value={campaignForm.impactMetrics}
              onChange={(e) => setCampaignForm({ ...campaignForm, impactMetrics: e.target.value })}
              placeholder="Define measurable impact goals"
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2">Campaign Image</label>
            <div className="h-32 border-2 border-dashed border-surface-highlight rounded-lg flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-3xl text-text-muted mb-2">
                  add_photo_alternate
                </span>
                <p className="text-xs text-text-secondary">Upload campaign image</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCreateCampaign}
            variant="primary"
            className="w-full"
          >
            Create Campaign
          </Button>
        </div>
      </Modal>

      {/* Create Organization Modal */}
      <Modal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        title="Register Organization"
      >
        <div className="space-y-4 mt-4">
          <Input
            label="Organization Name"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            placeholder="Enter organization name"
          />

          <Input
            label="Registration Number"
            value={orgForm.registrationNumber}
            onChange={(e) => setOrgForm({ ...orgForm, registrationNumber: e.target.value })}
            placeholder="Ministry registration number"
          />

          <div>
            <label className="block text-xs text-text-secondary mb-2">Category</label>
            <select
              value={orgForm.category}
              onChange={(e) => setOrgForm({ ...orgForm, category: e.target.value as CharityCategory })}
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm"
            >
              <option value="WELFARE">Welfare</option>
              <option value="EDUCATION">Education</option>
              <option value="MEDICAL">Medical</option>
              <option value="DISASTER">Disaster Relief</option>
              <option value="ENVIRONMENT">Environment</option>
              <option value="CULTURE">Culture</option>
              <option value="INTERNATIONAL">International Aid</option>
              <option value="LOCAL_COMMUNITY">Local Community</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2">Donation Type</label>
            <select
              value={orgForm.donationType}
              onChange={(e) => setOrgForm({ ...orgForm, donationType: e.target.value as DonationType })}
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm"
            >
              <option value="STATUTORY">Statutory</option>
              <option value="DESIGNATED">Designated</option>
              <option value="POLITICAL">Political</option>
              <option value="RELIGIOUS">Religious</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-2">Description</label>
            <textarea
              value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
              placeholder="Organization mission and activities"
              className="w-full px-3 py-2 bg-surface border border-surface-highlight rounded-lg text-white text-sm resize-none"
              rows={3}
            />
          </div>

          <Input
            label="Website (Optional)"
            value={orgForm.website}
            onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
            placeholder="https://example.org"
          />

          <Button
            onClick={handleCreateOrganization}
            variant="primary"
            className="w-full"
          >
            Register Organization
          </Button>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default DonationCampaigns;
