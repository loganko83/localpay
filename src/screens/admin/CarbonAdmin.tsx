import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, Badge, Button, Input, Modal } from '../../components/common';
import { carbonPointsService, EcoActionType, EcoAction } from '../../services/carbonPoints';

const CarbonAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'verification' | 'campaigns'>('overview');
  const [selectedAction, setSelectedAction] = useState<EcoAction | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const config = carbonPointsService.getConfig();
  const availableActions = carbonPointsService.getAvailableActions();
  const leaderboard = carbonPointsService.getLeaderboard(10);

  const mockPlatformData = useMemo(() => ({
    totalCarbonReduced: 245780000,
    activeParticipants: 12847,
    pointsInCirculation: 1847293,
    todayActions: 1247,
    monthCarbonReduced: 45230000,
    equivalentTrees: 2153,
    pointsExchanged: 247193,
    pointsExchangedKRW: 2471930,
  }), []);

  const mockPendingVerifications: EcoAction[] = [
    {
      id: 'ECO-1',
      userId: 'user001',
      actionType: 'ELECTRIC_VEHICLE_CHARGE',
      timestamp: Date.now() - 300000,
      quantity: 1,
      carbonReduced: 200,
      pointsEarned: 2,
      verificationMethod: 'MANUAL_REVIEW',
      verificationData: { merchantId: 'M123', transactionId: 'TX456' },
      status: 'PENDING',
    },
    {
      id: 'ECO-2',
      userId: 'user002',
      actionType: 'RECYCLING_ELECTRONICS',
      timestamp: Date.now() - 600000,
      quantity: 2,
      carbonReduced: 1000,
      pointsEarned: 10,
      verificationMethod: 'MANUAL_REVIEW',
      status: 'PENDING',
    },
  ];

  const actionTypeLabels: Record<EcoActionType, string> = {
    ELECTRONIC_RECEIPT: 'Electronic Receipt',
    TUMBLER_USE: 'Tumbler Use',
    MULTI_USE_CONTAINER: 'Multi-use Container',
    REFILL_STATION: 'Refill Station',
    NO_PLASTIC_BAG: 'No Plastic Bag',
    IDLE_STOP: 'Idle Stop',
    PUBLIC_TRANSPORT_BUS: 'Bus Transport',
    PUBLIC_TRANSPORT_SUBWAY: 'Subway Transport',
    BIKE_SHARING: 'Bike Sharing',
    WALKING: 'Walking',
    ELECTRIC_VEHICLE_CHARGE: 'EV Charge',
    RECYCLING_GENERAL: 'General Recycling',
    RECYCLING_ELECTRONICS: 'E-waste Recycling',
    FOOD_WASTE_REDUCTION: 'Food Waste Reduction',
  };

  const actionAnalytics = useMemo(() => {
    const mockData = [
      { type: 'TUMBLER_USE', count: 4234, carbon: 214578, trend: 12.5 },
      { type: 'PUBLIC_TRANSPORT_BUS', count: 3821, carbon: 305680, trend: 8.3 },
      { type: 'WALKING', count: 2913, carbon: 611730, trend: 15.7 },
      { type: 'NO_PLASTIC_BAG', count: 2472, carbon: 39552, trend: 5.2 },
      { type: 'BIKE_SHARING', count: 1834, carbon: 275100, trend: 22.1 },
    ] as Array<{ type: EcoActionType; count: number; carbon: number; trend: number }>;

    return mockData.map(item => ({
      ...item,
      label: actionTypeLabels[item.type],
    }));
  }, []);

  const weeklyTrend = [
    { day: 'Mon', actions: 856, carbon: 128400 },
    { day: 'Tue', actions: 923, carbon: 138450 },
    { day: 'Wed', actions: 1047, carbon: 157050 },
    { day: 'Thu', actions: 1123, carbon: 168450 },
    { day: 'Fri', actions: 1289, carbon: 193350 },
    { day: 'Sat', actions: 1456, carbon: 218400 },
    { day: 'Sun', actions: 1347, carbon: 202050 },
  ];

  const formatCarbonAmount = (grams: number): string => {
    if (grams >= 1000000) {
      return `${(grams / 1000000).toFixed(2)} tons`;
    }
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)} kg`;
    }
    return `${grams.toFixed(0)} g`;
  };

  const formatKRW = (amount: number): string => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleApproveAction = (actionId: string) => {
    console.log('Approving action:', actionId);
    setSelectedAction(null);
  };

  const handleRejectAction = (actionId: string) => {
    console.log('Rejecting action:', actionId);
    setSelectedAction(null);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Program Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#2b8cee] text-[20px]">co2</span>
            <p className="text-xs text-text-secondary">Total Carbon Reduced</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCarbonAmount(mockPlatformData.totalCarbonReduced)}
          </p>
          <p className="text-xs text-[#2b8cee] mt-1">Platform-wide impact</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#2b8cee] text-[20px]">group</span>
            <p className="text-xs text-text-secondary">Active Participants</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {mockPlatformData.activeParticipants.toLocaleString()}
          </p>
          <p className="text-xs text-primary mt-1">+8.4% this month</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#2b8cee] text-[20px]">award_star</span>
            <p className="text-xs text-text-secondary">Points in Circulation</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {mockPlatformData.pointsInCirculation.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Rate: {config.carbonGramsPerPoint}g CO₂ = 1pt
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#2b8cee] text-[20px]">currency_exchange</span>
            <p className="text-xs text-text-secondary">Exchange Rate</p>
          </div>
          <p className="text-2xl font-bold text-white">
            1pt = {formatKRW(config.pointToKRW)}
          </p>
          <p className="text-xs text-primary mt-1">Fixed conversion</p>
        </Card>
      </div>

      {/* Today's Stats */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Today's Activity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">Eco Actions Recorded</p>
            <p className="text-3xl font-bold text-[#2b8cee]">{mockPlatformData.todayActions}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Carbon Reduced</p>
            <p className="text-lg font-bold text-white">
              {formatCarbonAmount(mockPlatformData.monthCarbonReduced / 30)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Equivalent Trees</p>
            <p className="text-lg font-bold text-primary">{Math.round(mockPlatformData.equivalentTrees / 30)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Points Exchanged</p>
            <p className="text-lg font-bold text-white">
              {formatKRW(mockPlatformData.pointsExchangedKRW / 30)}
            </p>
          </div>
        </div>
      </Card>

      {/* Weekly Trend Chart */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Weekly Trend</h3>
        <div className="h-48 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <defs>
                <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5c6a7a', fontSize: 10 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5c6a7a', fontSize: 10 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c242c',
                  borderColor: '#2a3540',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => [`${value} actions`, '']}
              />
              <Line
                type="monotone"
                dataKey="actions"
                stroke="#2b8cee"
                strokeWidth={3}
                fill="url(#carbonGradient)"
                dot={{ fill: '#2b8cee', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Action Types Analytics */}
      <Card padding="lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white">Top Eco Actions</h3>
          <Badge variant="info" size="sm">Last 7 days</Badge>
        </div>
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={actionAnalytics} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#fff', fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c242c',
                  borderColor: '#2a3540',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value, name) => [
                  name === 'count' ? `${value} actions` : formatCarbonAmount(Number(value)),
                  name === 'count' ? 'Actions' : 'Carbon Reduced',
                ]}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {actionAnalytics.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#2b8cee" opacity={1 - index * 0.15} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {actionAnalytics.slice(0, 3).map((action, index) => (
            <div key={action.type} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">#{index + 1}</Badge>
                <span className="text-white">{action.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-secondary">{formatCarbonAmount(action.carbon)}</span>
                <span className="text-primary">↑{action.trend}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card padding="lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white">Top Contributors</h3>
          <button className="text-xs text-[#2b8cee] font-medium">View All</button>
        </div>
        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((user) => (
            <div key={user.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    user.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : user.rank === 2
                      ? 'bg-gray-300/20 text-gray-300'
                      : user.rank === 3
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-surface-highlight text-text-secondary'
                  }`}
                >
                  {user.rank}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.userId}</p>
                  <p className="text-xs text-text-secondary">
                    {formatCarbonAmount(user.totalCarbonReduced)} reduced
                  </p>
                </div>
              </div>
              <Badge variant="primary" size="sm">{user.level}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Point Configuration */}
      <Card padding="lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white">Point Configuration</h3>
          <button className="text-xs text-[#2b8cee] font-medium">Edit</button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-surface-highlight">
            <span className="text-sm text-text-secondary">Carbon to Point Rate</span>
            <span className="text-sm font-medium text-white">{config.carbonGramsPerPoint}g CO₂ = 1pt</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-highlight">
            <span className="text-sm text-text-secondary">Point to KRW Rate</span>
            <span className="text-sm font-medium text-white">1pt = {formatKRW(config.pointToKRW)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-highlight">
            <span className="text-sm text-text-secondary">Daily Limit</span>
            <span className="text-sm font-medium text-white">{config.maxDailyPoints} points</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-text-secondary">Monthly Limit</span>
            <span className="text-sm font-medium text-white">{config.maxMonthlyPoints} points</span>
          </div>
        </div>
      </Card>

      {/* Available Actions Reference */}
      <Card padding="lg">
        <h3 className="text-sm font-bold text-white mb-4">Action Point Rates</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {availableActions.slice(0, 8).map((action) => (
            <div
              key={action.type}
              className="flex justify-between items-center py-2 border-b border-surface-highlight last:border-0"
            >
              <div className="flex-1">
                <p className="text-sm text-white">{actionTypeLabels[action.type]}</p>
                <p className="text-xs text-text-secondary">{action.carbonPerAction}g CO₂</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-[#2b8cee]">{action.pointsPerAction}pt</p>
                <p className="text-xs text-text-secondary">{formatKRW(action.krwPerAction)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reports Section */}
      <Card padding="lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white">Reports & Exports</h3>
        </div>
        <div className="space-y-3">
          <Button
            variant="secondary"
            fullWidth
            icon={<span className="material-symbols-outlined text-[18px]">description</span>}
            onClick={() => setShowReportModal(true)}
          >
            Generate Carbon Report Card
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={<span className="material-symbols-outlined text-[18px]">download</span>}
          >
            Export Platform Data
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={<span className="material-symbols-outlined text-[18px]">workspace_premium</span>}
          >
            Generate Certificate
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderVerificationTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-white">Verification Queue</h3>
          <p className="text-xs text-text-secondary">
            {mockPendingVerifications.length} actions awaiting review
          </p>
        </div>
        <Badge variant="warning" size="md">
          {mockPendingVerifications.length} Pending
        </Badge>
      </div>

      <div className="space-y-3">
        {mockPendingVerifications.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-text-muted text-[48px] mb-2">
                check_circle
              </span>
              <p className="text-sm text-text-secondary">All verifications complete</p>
            </div>
          </Card>
        ) : (
          mockPendingVerifications.map((action) => (
            <Card
              key={action.id}
              padding="md"
              className="cursor-pointer hover:border-[#2b8cee]"
              onClick={() => setSelectedAction(action)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="warning" size="sm">PENDING</Badge>
                    <span className="text-xs text-text-muted">{action.id}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">
                    {actionTypeLabels[action.actionType]}
                  </p>
                  <p className="text-xs text-text-secondary">
                    User: {action.userId} • {formatTimeAgo(action.timestamp)}
                  </p>
                </div>
                <span className="material-symbols-outlined text-text-muted text-[20px]">
                  chevron_right
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-background rounded-lg p-2">
                  <p className="text-xs text-text-secondary mb-1">Quantity</p>
                  <p className="text-sm font-bold text-white">{action.quantity}</p>
                </div>
                <div className="bg-background rounded-lg p-2">
                  <p className="text-xs text-text-secondary mb-1">Carbon</p>
                  <p className="text-sm font-bold text-[#2b8cee]">
                    {formatCarbonAmount(action.carbonReduced)}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-2">
                  <p className="text-xs text-text-secondary mb-1">Points</p>
                  <p className="text-sm font-bold text-primary">{action.pointsEarned}pt</p>
                </div>
              </div>

              {action.verificationData && (
                <div className="bg-background rounded-lg p-2 mb-3">
                  <p className="text-xs text-text-secondary mb-1">Verification Data</p>
                  <div className="space-y-1">
                    {action.verificationData.merchantId && (
                      <p className="text-xs text-white">
                        Merchant: {action.verificationData.merchantId}
                      </p>
                    )}
                    {action.verificationData.transactionId && (
                      <p className="text-xs text-white">
                        Transaction: {action.verificationData.transactionId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  icon={<span className="material-symbols-outlined text-[16px]">check</span>}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApproveAction(action.id);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  icon={<span className="material-symbols-outlined text-[16px]">close</span>}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectAction(action.id);
                  }}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-white">Active Campaigns</h3>
          <p className="text-xs text-text-secondary">Special eco campaigns and events</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<span className="material-symbols-outlined text-[16px]">add</span>}
          onClick={() => setShowCampaignModal(true)}
        >
          New Campaign
        </Button>
      </div>

      <div className="space-y-3">
        {/* Active Campaign Example */}
        <Card padding="lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success" size="sm">ACTIVE</Badge>
                <span className="text-xs text-text-muted">Ends in 5 days</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-1">Earth Week 2x Points</h4>
              <p className="text-sm text-text-secondary mb-3">
                Double points for all eco actions during Earth Week celebration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Participants</p>
              <p className="text-xl font-bold text-[#2b8cee]">3,247</p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Actions</p>
              <p className="text-xl font-bold text-white">12,456</p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-text-secondary mb-1">Bonus Points</p>
              <p className="text-xl font-bold text-primary">18,234</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" fullWidth>
              View Analytics
            </Button>
            <Button variant="ghost" size="sm" fullWidth>
              Edit
            </Button>
          </div>
        </Card>

        {/* Scheduled Campaign */}
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info" size="sm">SCHEDULED</Badge>
                <span className="text-xs text-text-muted">Starts in 2 weeks</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Public Transport Challenge
              </h4>
              <p className="text-xs text-text-secondary">
                Bonus points for using public transport 20+ times
              </p>
            </div>
            <button className="text-text-secondary hover:text-white">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
        </Card>

        {/* Ended Campaign */}
        <Card padding="md" className="opacity-60">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" size="sm">ENDED</Badge>
                <span className="text-xs text-text-muted">Ended 3 days ago</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Zero Waste Week</h4>
              <p className="text-xs text-text-secondary">
                Special rewards for waste reduction actions
              </p>
              <p className="text-xs text-primary mt-2">2,847 participants • 45.6 kg carbon saved</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h4 className="text-sm font-bold text-white mb-4">Campaign Templates</h4>
        <div className="space-y-2">
          {[
            { name: 'Seasonal Challenge', icon: 'eco', color: '#2b8cee' },
            { name: 'Community Goal', icon: 'groups', color: '#2b8cee' },
            { name: 'Badge Event', icon: 'military_tech', color: '#2b8cee' },
            { name: 'Merchant Partnership', icon: 'handshake', color: '#2b8cee' },
          ].map((template) => (
            <button
              key={template.name}
              className="w-full flex items-center gap-3 p-3 bg-surface hover:bg-surface-highlight rounded-xl transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-[#2b8cee]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2b8cee] text-[20px]">
                  {template.icon}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{template.name}</p>
                <p className="text-xs text-text-secondary">Click to create</p>
              </div>
              <span className="material-symbols-outlined text-text-muted text-[20px]">
                arrow_forward
              </span>
            </button>
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
            <h1 className="text-lg font-bold text-white">Carbon Point Admin</h1>
            <p className="text-xs text-text-secondary">ESG Reward Program Management</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#2b8cee]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#2b8cee] text-[24px]">eco</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-surface rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#2b8cee] text-white'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`relative flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'verification'
                ? 'bg-[#2b8cee] text-white'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Verification
            {mockPendingVerifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-500 text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                {mockPendingVerifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'campaigns'
                ? 'bg-[#2b8cee] text-white'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Campaigns
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'verification' && renderVerificationTab()}
        {activeTab === 'campaigns' && renderCampaignsTab()}
      </div>

      {/* Action Detail Modal */}
      {selectedAction && (
        <Modal
          isOpen={!!selectedAction}
          onClose={() => setSelectedAction(null)}
          title="Action Verification"
        >
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-2">Action Type</p>
              <p className="text-lg font-bold text-white">
                {actionTypeLabels[selectedAction.actionType]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-text-secondary mb-1">User ID</p>
                <p className="text-sm font-medium text-white">{selectedAction.userId}</p>
              </div>
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-text-secondary mb-1">Timestamp</p>
                <p className="text-sm font-medium text-white">
                  {formatTimeAgo(selectedAction.timestamp)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface rounded-xl p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">Quantity</p>
                <p className="text-xl font-bold text-white">{selectedAction.quantity}</p>
              </div>
              <div className="bg-surface rounded-xl p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">Carbon</p>
                <p className="text-sm font-bold text-[#2b8cee]">
                  {formatCarbonAmount(selectedAction.carbonReduced)}
                </p>
              </div>
              <div className="bg-surface rounded-xl p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">Points</p>
                <p className="text-xl font-bold text-primary">{selectedAction.pointsEarned}</p>
              </div>
            </div>

            {selectedAction.verificationData && (
              <div className="bg-surface rounded-xl p-4">
                <p className="text-xs text-text-secondary mb-2">Verification Evidence</p>
                <div className="space-y-2">
                  {Object.entries(selectedAction.verificationData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-text-secondary capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-sm text-white font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                fullWidth
                icon={<span className="material-symbols-outlined text-[18px]">check</span>}
                onClick={() => handleApproveAction(selectedAction.id)}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={<span className="material-symbols-outlined text-[18px]">close</span>}
                onClick={() => handleRejectAction(selectedAction.id)}
              >
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Campaign Creation Modal */}
      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title="Create New Campaign"
      >
        <div className="space-y-4">
          <Input label="Campaign Name" placeholder="e.g., Earth Week Challenge" />
          <Input label="Description" placeholder="Campaign description" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" />
            <Input label="End Date" type="date" />
          </div>

          <Input label="Bonus Multiplier" type="number" placeholder="2.0" />
          <Input label="Target Actions" type="number" placeholder="1000" />

          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-2">Eligible Action Types</p>
            <div className="space-y-2">
              {['TUMBLER_USE', 'PUBLIC_TRANSPORT_BUS', 'WALKING'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-white">
                    {actionTypeLabels[type as EcoActionType]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowCampaignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth>
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Generation Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Generate Report"
      >
        <div className="space-y-4">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-3">Report Type</p>
            <div className="space-y-2">
              {[
                'Platform-wide Carbon Report',
                'User Activity Report',
                'Campaign Performance',
                'Environmental Impact Certificate',
              ].map((type) => (
                <label key={type} className="flex items-center gap-3 p-2 hover:bg-surface-highlight rounded-lg cursor-pointer">
                  <input type="radio" name="reportType" className="text-[#2b8cee]" />
                  <span className="text-sm text-white">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" />
            <Input label="End Date" type="date" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              icon={<span className="material-symbols-outlined text-[18px]">download</span>}
            >
              Generate & Download
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CarbonAdmin;
