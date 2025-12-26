import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input, Modal } from '../../components/common';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { merchantCreditService, MerchantCreditProfile, CreditGrade } from '../../services/merchantCredit';

const MerchantCreditReview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<CreditGrade | 'all'>('all');
  const [_statusFilter, _setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantCreditProfile | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [mockProfiles, setMockProfiles] = useState<MerchantCreditProfile[]>([]);
  const [stats, setStats] = useState({
    totalReviewed: 0,
    approvedRate: 0,
    averageScore: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = async () => {
    const profiles: MerchantCreditProfile[] = [];

    const merchants = [
      { id: 'M001', name: 'Jeonju Bibimbap House', type: 'Restaurant', score: 780, grade: 'GOOD' as CreditGrade },
      { id: 'M002', name: 'Hanok Village Cafe', type: 'Cafe', score: 650, grade: 'FAIR' as CreditGrade },
      { id: 'M003', name: 'Traditional Craft Shop', type: 'Retail', score: 520, grade: 'POOR' as CreditGrade },
      { id: 'M004', name: 'Jeonju Bakery & More', type: 'Food', score: 870, grade: 'EXCELLENT' as CreditGrade },
      { id: 'M005', name: 'Korean BBQ Restaurant', type: 'Restaurant', score: 710, grade: 'GOOD' as CreditGrade },
      { id: 'M006', name: 'Hanok Stay Guesthouse', type: 'Hospitality', score: 590, grade: 'FAIR' as CreditGrade },
      { id: 'M007', name: 'Local Fish Market', type: 'Market', score: 830, grade: 'GOOD' as CreditGrade },
      { id: 'M008', name: 'Street Food Cart', type: 'Food', score: 450, grade: 'POOR' as CreditGrade },
    ];

    for (const merchant of merchants) {
      const profile = await merchantCreditService.initializeProfile({
        merchantId: merchant.id,
        merchantName: merchant.name,
        businessType: merchant.type,
        registeredAt: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
      });

      profile.currentScore = merchant.score;
      profile.currentGrade = merchant.grade;
      profile.financialMetrics = {
        monthlyAverageVolume: Math.random() * 50000000,
        totalLifetimeVolume: Math.random() * 500000000,
        monthlyTransactionCount: Math.floor(Math.random() * 500),
        uniqueCustomers: Math.floor(Math.random() * 1000),
        repeatCustomerRate: Math.random(),
        averageTicketSize: Math.random() * 50000,
        monthOverMonthGrowth: (Math.random() - 0.3) * 0.5,
        yearOverYearGrowth: (Math.random() - 0.2) * 0.8,
        volatilityScore: Math.random() * 0.5,
        averageSettlementDays: Math.floor(Math.random() * 5),
        paymentDefaultRate: Math.random() * 0.05,
        daysOnPlatform: Math.floor(Math.random() * 365),
        localCurrencyRatio: 0.6 + Math.random() * 0.4,
      };

      profiles.push(profile);
    }

    setMockProfiles(profiles);

    const totalScore = profiles.reduce((sum, p) => sum + p.currentScore, 0);
    setStats({
      totalReviewed: 156,
      approvedRate: 87.5,
      averageScore: Math.round(totalScore / profiles.length),
      pendingCount: profiles.length,
    });
  };

  const filteredProfiles = mockProfiles.filter((profile) => {
    if (gradeFilter !== 'all' && profile.currentGrade !== gradeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        profile.merchantName.toLowerCase().includes(query) ||
        profile.merchantId.toLowerCase().includes(query) ||
        profile.businessType.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const scoreDistribution = [
    { range: '850-1000', label: 'Excellent', count: mockProfiles.filter(p => p.currentScore >= 850).length, color: '#00d68f' },
    { range: '700-849', label: 'Good', count: mockProfiles.filter(p => p.currentScore >= 700 && p.currentScore < 850).length, color: '#2b8cee' },
    { range: '550-699', label: 'Fair', count: mockProfiles.filter(p => p.currentScore >= 550 && p.currentScore < 700).length, color: '#ffa726' },
    { range: '400-549', label: 'Poor', count: mockProfiles.filter(p => p.currentScore >= 400 && p.currentScore < 550).length, color: '#ff6b6b' },
    { range: '0-399', label: 'Very Poor', count: mockProfiles.filter(p => p.currentScore < 400).length, color: '#d32f2f' },
  ];

  const getGradeColor = (grade: CreditGrade): string => {
    switch (grade) {
      case 'EXCELLENT': return 'text-green-400';
      case 'GOOD': return 'text-blue-400';
      case 'FAIR': return 'text-yellow-400';
      case 'POOR': return 'text-orange-400';
      case 'VERY_POOR': return 'text-red-400';
      default: return 'text-text-secondary';
    }
  };

  const getGradeBadgeVariant = (grade: CreditGrade): 'success' | 'info' | 'warning' | 'error' => {
    switch (grade) {
      case 'EXCELLENT': return 'success';
      case 'GOOD': return 'info';
      case 'FAIR': return 'warning';
      case 'POOR': return 'error';
      case 'VERY_POOR': return 'error';
      default: return 'info';
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `₩${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₩${(amount / 1000).toFixed(0)}K`;
    }
    return `₩${Math.round(amount)}`;
  };

  const handleReviewClick = (profile: MerchantCreditProfile, action: 'approve' | 'reject') => {
    setSelectedMerchant(profile);
    setReviewAction(action);
    setIsReviewModalOpen(true);
  };

  const handleReviewConfirm = () => {
    if (!selectedMerchant) return;

    if (reviewAction === 'approve') {
      setStats(prev => ({
        ...prev,
        totalReviewed: prev.totalReviewed + 1,
        approvedRate: ((prev.totalReviewed * prev.approvedRate / 100 + 1) / (prev.totalReviewed + 1)) * 100,
        pendingCount: prev.pendingCount - 1,
      }));

      setMockProfiles(prev => prev.filter(p => p.id !== selectedMerchant.id));
    } else if (reviewAction === 'reject') {
      setStats(prev => ({
        ...prev,
        totalReviewed: prev.totalReviewed + 1,
        pendingCount: prev.pendingCount - 1,
      }));

      setMockProfiles(prev => prev.filter(p => p.id !== selectedMerchant.id));
    }

    setIsReviewModalOpen(false);
    setSelectedMerchant(null);
    setReviewAction(null);
    setRejectionReason('');
  };

  const handleReviewCancel = () => {
    setIsReviewModalOpen(false);
    setSelectedMerchant(null);
    setReviewAction(null);
    setRejectionReason('');
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-surface">
        <div>
          <h1 className="text-lg font-bold text-white">Merchant Credit Review</h1>
          <p className="text-xs text-text-secondary">Review and approve credit assessments</p>
        </div>
        <Badge variant="warning" size="md">
          <span className="material-symbols-outlined text-[12px] mr-1">pending</span>
          {stats.pendingCount} pending
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <Card padding="md" className="bg-gradient-to-br from-[#2b8cee]/10 to-transparent border-[#2b8cee]/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#2b8cee] text-[16px]">task_alt</span>
            <p className="text-xs text-text-secondary">Reviewed</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalReviewed}</p>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-green-400 text-[16px]">trending_up</span>
            <p className="text-xs text-text-secondary">Approved</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.approvedRate.toFixed(1)}%</p>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-yellow-400 text-[16px]">star</span>
            <p className="text-xs text-text-secondary">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
        </Card>
      </div>

      {/* Score Distribution Chart */}
      <div className="px-4 mb-6">
        <Card padding="lg">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Credit Score Distribution</h3>
            <p className="text-xs text-text-secondary">Score ranges across pending reviews</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c6a7a', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c6a7a', fontSize: 10 }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c242c',
                    borderColor: '#2a3540',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#2a3540' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="px-4 mb-4 space-y-3">
        <Input
          icon="search"
          placeholder="Search by merchant name, ID, or business type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              gradeFilter === 'all'
                ? 'bg-[#2b8cee] text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-highlight'
            }`}
          >
            All Grades
          </button>
          {(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR'] as CreditGrade[]).map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                gradeFilter === grade
                  ? 'bg-[#2b8cee] text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-highlight'
              }`}
            >
              {grade.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Review Queue */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">
            Pending Reviews ({filteredProfiles.length})
          </h3>
          <button className="text-xs text-[#2b8cee] font-medium">
            Sort by Score
          </button>
        </div>

        {filteredProfiles.length === 0 ? (
          <Card padding="lg" className="text-center">
            <span className="material-symbols-outlined text-text-muted text-[48px] mb-2">
              fact_check
            </span>
            <p className="text-sm text-text-secondary">No pending reviews found</p>
            <p className="text-xs text-text-muted mt-1">
              {searchQuery || gradeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'All credit assessments are up to date'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} padding="md" className="border-l-4 border-l-[#2b8cee]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white">{profile.merchantName}</h4>
                      <Badge variant={getGradeBadgeVariant(profile.currentGrade)} size="sm">
                        {profile.currentGrade}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {profile.businessType} • ID: {profile.merchantId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getGradeColor(profile.currentGrade)}`}>
                      {profile.currentScore}
                    </p>
                    <p className="text-xs text-text-muted">Score</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-background/50 rounded-lg">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Monthly Volume</p>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(profile.financialMetrics.monthlyAverageVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Transactions</p>
                    <p className="text-sm font-bold text-white">
                      {profile.financialMetrics.monthlyTransactionCount}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Credit Limit</p>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(profile.creditLimit)}
                    </p>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-[14px]">
                      group
                    </span>
                    <span className="text-xs text-text-secondary">
                      {profile.financialMetrics.uniqueCustomers} customers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-[14px]">
                      trending_up
                    </span>
                    <span className="text-xs text-text-secondary">
                      {(profile.financialMetrics.monthOverMonthGrowth * 100).toFixed(1)}% growth
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-[14px]">
                      history
                    </span>
                    <span className="text-xs text-text-secondary">
                      {profile.financialMetrics.daysOnPlatform} days active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-[14px]">
                      replay
                    </span>
                    <span className="text-xs text-text-secondary">
                      {(profile.financialMetrics.repeatCustomerRate * 100).toFixed(0)}% retention
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-[#2b8cee] hover:bg-[#2377d4]"
                    onClick={() => handleReviewClick(profile, 'approve')}
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReviewClick(profile, 'reject')}
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    Reject
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-3"
                  >
                    <span className="material-symbols-outlined text-[20px]">info</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={handleReviewCancel}
        title={reviewAction === 'approve' ? 'Approve Credit Assessment' : 'Reject Credit Assessment'}
      >
        {selectedMerchant && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-highlight rounded-xl">
              <p className="text-sm font-bold text-white mb-1">{selectedMerchant.merchantName}</p>
              <div className="flex items-center gap-2">
                <Badge variant={getGradeBadgeVariant(selectedMerchant.currentGrade)} size="sm">
                  {selectedMerchant.currentGrade}
                </Badge>
                <span className="text-xs text-text-secondary">
                  Score: {selectedMerchant.currentScore}
                </span>
              </div>
            </div>

            {reviewAction === 'approve' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="material-symbols-outlined text-green-400 text-[20px]">
                    check_circle
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Approve Credit Assessment</p>
                    <p className="text-xs text-text-secondary mt-1">
                      This merchant will receive a credit limit of{' '}
                      <span className="font-bold text-green-400">
                        {formatCurrency(selectedMerchant.creditLimit)}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  The merchant will be notified and can start applying for credit products.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="material-symbols-outlined text-red-400 text-[20px]">
                    cancel
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Reject Credit Assessment</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Please provide a reason for rejection
                    </p>
                  </div>
                </div>
                <Input
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleReviewCancel}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'primary' : 'danger'}
                size="md"
                fullWidth
                onClick={handleReviewConfirm}
                disabled={reviewAction === 'reject' && !rejectionReason.trim()}
                className={reviewAction === 'approve' ? 'bg-[#2b8cee] hover:bg-[#2377d4]' : ''}
              >
                {reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MerchantCreditReview;
