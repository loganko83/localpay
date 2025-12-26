import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from 'recharts';
import { Card, Button, Input, Modal, Badge } from '../../components/common';
import { WelfareCategory } from '../../services/corporateWelfare';

interface EmployeeWithStatus {
  id: string;
  name: string;
  department: string;
  monthlyAllowance: number;
  usedBalance: number;
  remainingBalance: number;
  status: 'Active' | 'Inactive';
  totalBalance: number;
}

interface PendingApproval {
  id: string;
  employeeName: string;
  department: string;
  requestType: string;
  amount: number;
  date: string;
  reason: string;
}

const CATEGORY_LABELS: Record<WelfareCategory, string> = {
  MEAL_ALLOWANCE: '식사',
  CULTURE_EXPENSE: '문화',
  HEALTH_WELLNESS: '건강',
  FAMILY_CARE: '가족돌봄',
  SELF_DEVELOPMENT: '자기계발',
  GENERAL_WELFARE: '일반복지',
};

const CATEGORY_COLORS: Record<WelfareCategory, string> = {
  MEAL_ALLOWANCE: '#13ec5b',
  CULTURE_EXPENSE: '#4ade80',
  HEALTH_WELLNESS: '#22d3ee',
  FAMILY_CARE: '#a78bfa',
  SELF_DEVELOPMENT: '#fb923c',
  GENERAL_WELFARE: '#f472b6',
};

const WelfareManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributionAmount, setDistributionAmount] = useState('');
  const [distributionCategory, setDistributionCategory] = useState<WelfareCategory>('MEAL_ALLOWANCE');
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split('T')[0]);
  const _selectedDepartment = 'all';
  void _selectedDepartment; // Reserved for department filtering feature

  // Mock company ID - in real app, get from auth context
  const companyId = 'CORP-DEMO-001';

  // Mock data - in real app, fetch from corporateWelfareService
  const companyBalance = 50000000;
  const employeesEnrolled = 42;
  const monthDistributed = 8400000;

  const totalDistributedThisMonth = 8400000;
  const averagePerEmployee = 200000;
  const pendingDistributions = 0;
  const distributionRate = 95.5;

  const annualBudget = 120000000;
  const monthlyBudget = 10000000;
  const remainingBudget = 41600000;

  // Mock employees
  const allEmployees: EmployeeWithStatus[] = [
    {
      id: 'E001',
      name: 'Kim Min-jun',
      department: 'Engineering',
      monthlyAllowance: 200000,
      usedBalance: 185000,
      remainingBalance: 15000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E002',
      name: 'Lee Ji-won',
      department: 'Marketing',
      monthlyAllowance: 200000,
      usedBalance: 150000,
      remainingBalance: 50000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E003',
      name: 'Park Su-ho',
      department: 'Engineering',
      monthlyAllowance: 200000,
      usedBalance: 195000,
      remainingBalance: 5000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E004',
      name: 'Choi Ye-jin',
      department: 'Sales',
      monthlyAllowance: 200000,
      usedBalance: 180000,
      remainingBalance: 20000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E005',
      name: 'Jung Hyun-woo',
      department: 'HR',
      monthlyAllowance: 200000,
      usedBalance: 120000,
      remainingBalance: 80000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E006',
      name: 'Kang Min-seo',
      department: 'Engineering',
      monthlyAllowance: 200000,
      usedBalance: 0,
      remainingBalance: 200000,
      status: 'Inactive',
      totalBalance: 200000,
    },
  ];

  // Filter employees by search query
  const filteredEmployees = allEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Usage by category (mock data)
  const usageByCategory = [
    { name: 'Meal', value: 3200000, category: 'MEAL_ALLOWANCE' as WelfareCategory },
    { name: 'Culture', value: 1800000, category: 'CULTURE_EXPENSE' as WelfareCategory },
    { name: 'Health', value: 1400000, category: 'HEALTH_WELLNESS' as WelfareCategory },
    { name: 'Family', value: 800000, category: 'FAMILY_CARE' as WelfareCategory },
    { name: 'Self-Dev', value: 600000, category: 'SELF_DEVELOPMENT' as WelfareCategory },
    { name: 'General', value: 600000, category: 'GENERAL_WELFARE' as WelfareCategory },
  ];

  // Top merchant categories
  const topMerchantCategories = [
    { name: 'Restaurants', amount: 2800000, percent: 33 },
    { name: 'Cafes', amount: 1900000, percent: 23 },
    { name: 'Bookstores', amount: 1200000, percent: 14 },
    { name: 'Gyms', amount: 1000000, percent: 12 },
    { name: 'Others', amount: 1500000, percent: 18 },
  ];

  // Monthly trend (mock data)
  const monthlyTrend = [
    { month: 'Jul', amount: 7800000 },
    { month: 'Aug', amount: 8100000 },
    { month: 'Sep', amount: 8500000 },
    { month: 'Oct', amount: 8200000 },
    { month: 'Nov', amount: 8700000 },
    { month: 'Dec', amount: 8400000 },
  ];

  // Pending approvals (mock data)
  const pendingApprovals: PendingApproval[] = [
    {
      id: 'A001',
      employeeName: 'Kim Min-jun',
      department: 'Engineering',
      requestType: 'Additional Allowance',
      amount: 100000,
      date: '2024-12-20',
      reason: 'Extended work hours this month',
    },
    {
      id: 'A002',
      employeeName: 'Lee Ji-won',
      department: 'Marketing',
      requestType: 'Category Change',
      amount: 50000,
      date: '2024-12-21',
      reason: 'Convert meal to culture budget',
    },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleBulkDistribution = async () => {
    const amount = parseInt(distributionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // In real app, call corporateWelfareService.bulkDistribute
    console.log('Distributing:', {
      companyId,
      category: distributionCategory,
      amountPerEmployee: amount,
      executedBy: 'ADMIN-001',
      note: `Distribution on ${distributionDate}`,
    });

    alert(`Distribution of ${formatAmount(amount)} to ${filteredEmployees.length} employees successful!`);
    setShowDistributionModal(false);
    setDistributionAmount('');
  };

  const handleApprove = (approvalId: string) => {
    console.log('Approved:', approvalId);
    alert('Request approved successfully!');
  };

  const handleReject = (approvalId: string) => {
    console.log('Rejected:', approvalId);
    alert('Request rejected');
  };

  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-surface hover:bg-surface-highlight flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">복지 포인트 관리</h1>
              <p className="text-xs text-text-secondary">Corporate Welfare Management</p>
            </div>
          </div>
          <button className="relative p-2 rounded-full hover:bg-surface transition-colors">
            <span className="material-symbols-outlined text-white">notifications</span>
            {pendingApprovals.length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-background" />
            )}
          </button>
        </div>
      </div>

      {/* Welfare Program Header */}
      <div className="px-4 pt-6 pb-4">
        <Card variant="balance" padding="lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-text-secondary font-medium mb-1">Company Welfare Balance</p>
              <h2 className="text-3xl font-bold text-white">
                {formatAmount(companyBalance)} B
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span className="text-xs font-bold">{employeesEnrolled} employees</span>
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <span className="text-xs">{formatAmount(monthDistributed)} this month</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined filled text-2xl">workspace_premium</span>
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={() => setShowDistributionModal(true)}
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Bulk Distribution
          </Button>
        </Card>
      </div>

      {/* Distribution Stats Cards */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">이번달 현황</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-text-secondary">Total Distributed</span>
              <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
            </div>
            <p className="text-xl font-bold text-white">{formatAmount(totalDistributedThisMonth)}</p>
            <p className="text-xs text-primary mt-1">+8.5% vs last month</p>
          </Card>

          <Card padding="md">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-text-secondary">Avg per Employee</span>
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
            </div>
            <p className="text-xl font-bold text-white">{formatAmount(averagePerEmployee)}</p>
            <p className="text-xs text-text-secondary mt-1">Standard allowance</p>
          </Card>

          <Card padding="md">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-text-secondary">Pending</span>
              <span className="material-symbols-outlined text-yellow-500 text-[18px]">schedule</span>
            </div>
            <p className="text-xl font-bold text-white">{pendingDistributions}</p>
            <p className="text-xs text-text-secondary mt-1">No pending items</p>
          </Card>

          <Card padding="md">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-text-secondary">Usage Rate</span>
              <span className="material-symbols-outlined text-primary text-[18px]">percent</span>
            </div>
            <p className="text-xl font-bold text-white">{distributionRate}%</p>
            <p className="text-xs text-primary mt-1">Excellent usage</p>
          </Card>
        </div>
      </div>

      {/* Budget Management */}
      <div className="px-4 mb-6">
        <Card padding="lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">예산 현황</h3>
              <p className="text-xs text-text-secondary">Annual Budget Allocation</p>
            </div>
            <Badge variant="primary" size="md">2024</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-text-secondary">Annual Budget</span>
                <span className="text-sm font-bold text-white">{formatAmount(annualBudget)}</span>
              </div>
              <div className="w-full h-2 bg-surface-highlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${((annualBudget - remainingBudget) / annualBudget) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-xs text-text-secondary mb-1">Monthly Budget</p>
                <p className="text-lg font-bold text-white">{formatAmount(monthlyBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Remaining</p>
                <p className="text-lg font-bold text-primary">{formatAmount(remainingBudget)}</p>
              </div>
            </div>

            {remainingBudget < monthlyBudget && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <span className="material-symbols-outlined text-yellow-500 text-[18px]">warning</span>
                <p className="text-xs text-yellow-500">Budget running low this quarter</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">직원 목록</h3>
          <span className="text-xs text-text-secondary">{filteredEmployees.length} employees</span>
        </div>

        <Input
          icon="search"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <div className="space-y-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} padding="md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{employee.name}</span>
                      <Badge variant={employee.status === 'Active' ? 'success' : 'default'} size="sm">
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary">{employee.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatAmount(employee.monthlyAllowance)}</p>
                  <p className="text-xs text-text-secondary">Monthly</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-highlight">
                <div className="flex-1">
                  <p className="text-xs text-text-secondary mb-1">Used</p>
                  <p className="text-sm font-bold text-primary">{formatAmount(employee.usedBalance)}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs text-text-secondary mb-1">Remaining</p>
                  <p className="text-sm font-bold text-white">{formatAmount(employee.remainingBalance)}</p>
                </div>
                <div className="flex-1 text-right">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    <span className="text-xs font-bold text-primary">
                      {Math.round((employee.usedBalance / employee.totalBalance) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage Analytics */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">사용 분석</h3>

        {/* Category Pie Chart */}
        <Card padding="lg" className="mb-3">
          <h4 className="text-sm font-bold text-white mb-4">Usage by Category</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usageByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {usageByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#2a3830', borderRadius: '8px' }}
                  formatter={(value) => [`${formatAmount(value as number)} B`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {usageByCategory.map((item) => (
              <div key={item.category} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                />
                <span className="text-xs text-text-secondary">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Merchant Categories */}
        <Card padding="lg" className="mb-3">
          <h4 className="text-sm font-bold text-white mb-4">Top Merchant Categories</h4>
          <div className="space-y-3">
            {topMerchantCategories.map((merchant, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-text-secondary">{merchant.name}</span>
                  <span className="text-xs font-bold text-white">{formatAmount(merchant.amount)}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-highlight rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${merchant.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend */}
        <Card padding="lg">
          <h4 className="text-sm font-bold text-white mb-4">Monthly Trend</h4>
          <div className="h-32 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                  dy={5}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#2a3830', borderRadius: '8px' }}
                  formatter={(value) => [`${formatAmount(value as number)} B`, 'Distributed']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#13ec5b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">승인 대기</h3>
            <Badge variant="warning" size="md">{pendingApprovals.length}</Badge>
          </div>

          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} padding="md">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{approval.employeeName}</span>
                      <Badge variant="warning" size="sm">Pending</Badge>
                    </div>
                    <p className="text-xs text-text-secondary">{approval.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatAmount(approval.amount)}</p>
                    <p className="text-xs text-text-secondary">{approval.requestType}</p>
                  </div>
                </div>

                <div className="p-3 bg-surface-highlight rounded-lg mb-3">
                  <p className="text-xs text-text-secondary mb-1">Reason:</p>
                  <p className="text-xs text-white">{approval.reason}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReject(approval.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(approval.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    Approve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      <Modal
        isOpen={showDistributionModal}
        onClose={() => setShowDistributionModal(false)}
        title="Bulk Distribution"
      >
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Category
            </label>
            <select
              value={distributionCategory}
              onChange={(e) => setDistributionCategory(e.target.value as WelfareCategory)}
              className="w-full h-12 bg-surface border border-surface-highlight rounded-xl text-white px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Amount per Employee"
            type="number"
            icon="payments"
            placeholder="Enter amount..."
            value={distributionAmount}
            onChange={(e) => setDistributionAmount(e.target.value)}
          />

          <Input
            label="Distribution Date"
            type="date"
            icon="calendar_month"
            value={distributionDate}
            onChange={(e) => setDistributionDate(e.target.value)}
          />

          <div className="p-4 bg-surface-highlight rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">Recipients</span>
              <span className="text-sm font-bold text-white">{filteredEmployees.length} employees</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">Total Amount</span>
              <span className="text-lg font-bold text-primary">
                {formatAmount((parseInt(distributionAmount) || 0) * filteredEmployees.length)} B
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowDistributionModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleBulkDistribution}
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Process
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WelfareManagement;
