import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from 'recharts';
import { Card, Button, Input, Modal, Badge } from '../../components/common';
import { WelfareCategory } from '../../services/corporateWelfare';

import { theme } from '../../styles/theme';

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
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '1.5rem', backgroundColor: theme.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgba(17,17,17,0.8)', backdropFilter: 'blur(12px)', padding: '1rem', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', cursor: 'pointer', border: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.cardHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.card}
            >
              <span className="material-symbols-outlined" style={{ color: theme.text }}>arrow_back</span>
            </button>
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.text }}>복지 포인트 관리</h1>
              <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Corporate Welfare Management</p>
            </div>
          </div>
          <button
            style={{ position: 'relative', padding: '0.5rem', borderRadius: '9999px', transition: 'background-color 0.2s', cursor: 'pointer', border: 'none', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.card}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ color: theme.text }}>notifications</span>
            {pendingApprovals.length > 0 && (
              <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', height: '0.5rem', width: '0.5rem', borderRadius: '9999px', backgroundColor: theme.accent, border: `1px solid ${theme.bg}` }} />
            )}
          </button>
        </div>
      </div>

      {/* Welfare Program Header */}
      <div style={{ padding: '1.5rem 1rem 1rem' }}>
        <Card variant="balance" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: theme.textSecondary, fontWeight: 500, marginBottom: '0.25rem' }}>Company Welfare Balance</p>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: theme.text }}>
                {formatAmount(companyBalance)} B
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: theme.accent }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>group</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{employeesEnrolled} employees</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: theme.textSecondary }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>calendar_month</span>
                  <span style={{ fontSize: '0.75rem' }}>{formatAmount(monthDistributed)} this month</span>
                </div>
              </div>
            </div>
            <div style={{ height: '3rem', width: '3rem', borderRadius: '9999px', backgroundColor: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: '1.5rem' }}>workspace_premium</span>
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
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.75rem' }}>이번달 현황</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Total Distributed</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>trending_up</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(totalDistributedThisMonth)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.accent, marginTop: '0.25rem' }}>+8.5% vs last month</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Avg per Employee</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>person</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(averagePerEmployee)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>Standard allowance</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Pending</span>
              <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '1.125rem' }}>schedule</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{pendingDistributions}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>No pending items</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Usage Rate</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>percent</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{distributionRate}%</p>
            <p style={{ fontSize: '0.75rem', color: theme.accent, marginTop: '0.25rem' }}>Excellent usage</p>
          </Card>
        </div>
      </div>

      {/* Budget Management */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>예산 현황</h3>
              <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Annual Budget Allocation</p>
            </div>
            <Badge variant="primary" size="md">2024</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Annual Budget</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(annualBudget)}</span>
              </div>
              <div style={{ width: '100%', height: '0.5rem', backgroundColor: theme.cardHover, borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{ height: '100%', background: `linear-gradient(to right, ${theme.accent}, #e63946)`, width: `${((annualBudget - remainingBudget) / annualBudget) * 100}%` }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Monthly Budget</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(monthlyBudget)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Remaining</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.accent }}>{formatAmount(remainingBudget)}</p>
              </div>
            </div>

            {remainingBudget < monthlyBudget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '1.125rem' }}>warning</span>
                <p style={{ fontSize: '0.75rem', color: '#eab308' }}>Budget running low this quarter</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>직원 목록</h3>
          <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{filteredEmployees.length} employees</span>
        </div>

        <Input
          icon="search"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} padding="md">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.cardHover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.25rem' }}>person</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{employee.name}</span>
                      <Badge variant={employee.status === 'Active' ? 'success' : 'default'} size="sm">
                        {employee.status}
                      </Badge>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{employee.department}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(employee.monthlyAllowance)}</p>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Monthly</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: `1px solid ${theme.border}` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Used</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.accent }}>{formatAmount(employee.usedBalance)}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Remaining</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(employee.remainingBalance)}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '2rem', width: '2rem', borderRadius: '9999px', backgroundColor: theme.accentSoft }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.accent }}>
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
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.75rem' }}>사용 분석</h3>

        {/* Category Pie Chart */}
        <Card padding="lg" className="mb-3">
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>Usage by Category</h4>
          <div style={{ height: '12rem', width: '100%' }}>
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
                  contentStyle={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: '8px' }}
                  formatter={(value) => [`${formatAmount(value as number)} B`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
            {usageByCategory.map((item) => (
              <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div
                  style={{ height: '0.5rem', width: '0.5rem', borderRadius: '9999px', backgroundColor: CATEGORY_COLORS[item.category] }}
                />
                <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Merchant Categories */}
        <Card padding="lg" className="mb-3">
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>Top Merchant Categories</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topMerchantCategories.map((merchant, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{merchant.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(merchant.amount)}</span>
                </div>
                <div style={{ width: '100%', height: '0.375rem', backgroundColor: theme.cardHover, borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{ height: '100%', backgroundColor: theme.accent, width: `${merchant.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend */}
        <Card padding="lg">
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>Monthly Trend</h4>
          <div style={{ height: '8rem', width: '100%', marginLeft: '-0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textMuted, fontSize: 10 }}
                  dy={5}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: '8px' }}
                  formatter={(value) => [`${formatAmount(value as number)} B`, 'Distributed']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={theme.accent}
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
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>승인 대기</h3>
            <Badge variant="warning" size="md">{pendingApprovals.length}</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{approval.employeeName}</span>
                      <Badge variant="warning" size="sm">Pending</Badge>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{approval.department}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(approval.amount)}</p>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{approval.requestType}</p>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: theme.cardHover, borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Reason:</p>
                  <p style={{ fontSize: '0.75rem', color: theme.text }}>{approval.reason}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: theme.textSecondary, marginBottom: '0.5rem' }}>
              Category
            </label>
            <select
              value={distributionCategory}
              onChange={(e) => setDistributionCategory(e.target.value as WelfareCategory)}
              style={{ width: '100%', height: '3rem', backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.75rem', color: theme.text, padding: '0 1rem', outline: 'none' }}
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

          <div style={{ padding: '1rem', backgroundColor: theme.cardHover, borderRadius: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Recipients</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{filteredEmployees.length} employees</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Total Amount</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.accent }}>
                {formatAmount((parseInt(distributionAmount) || 0) * filteredEmployees.length)} B
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
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
