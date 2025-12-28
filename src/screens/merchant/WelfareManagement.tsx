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
      name: '김민준',
      department: '개발팀',
      monthlyAllowance: 200000,
      usedBalance: 185000,
      remainingBalance: 15000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E002',
      name: '이지원',
      department: '마케팅팀',
      monthlyAllowance: 200000,
      usedBalance: 150000,
      remainingBalance: 50000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E003',
      name: '박수호',
      department: '개발팀',
      monthlyAllowance: 200000,
      usedBalance: 195000,
      remainingBalance: 5000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E004',
      name: '최예진',
      department: '영업팀',
      monthlyAllowance: 200000,
      usedBalance: 180000,
      remainingBalance: 20000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E005',
      name: '정현우',
      department: '인사팀',
      monthlyAllowance: 200000,
      usedBalance: 120000,
      remainingBalance: 80000,
      status: 'Active',
      totalBalance: 200000,
    },
    {
      id: 'E006',
      name: '강민서',
      department: '개발팀',
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
    { name: '식사', value: 3200000, category: 'MEAL_ALLOWANCE' as WelfareCategory },
    { name: '문화', value: 1800000, category: 'CULTURE_EXPENSE' as WelfareCategory },
    { name: '건강', value: 1400000, category: 'HEALTH_WELLNESS' as WelfareCategory },
    { name: '가족돌봄', value: 800000, category: 'FAMILY_CARE' as WelfareCategory },
    { name: '자기계발', value: 600000, category: 'SELF_DEVELOPMENT' as WelfareCategory },
    { name: '일반복지', value: 600000, category: 'GENERAL_WELFARE' as WelfareCategory },
  ];

  // Top merchant categories
  const topMerchantCategories = [
    { name: '음식점', amount: 2800000, percent: 33 },
    { name: '카페', amount: 1900000, percent: 23 },
    { name: '서점', amount: 1200000, percent: 14 },
    { name: '헬스장', amount: 1000000, percent: 12 },
    { name: '기타', amount: 1500000, percent: 18 },
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
      employeeName: '김민준',
      department: '개발팀',
      requestType: '추가 수당',
      amount: 100000,
      date: '2024-12-20',
      reason: '이번 달 연장 근무',
    },
    {
      id: 'A002',
      employeeName: '이지원',
      department: '마케팅팀',
      requestType: '카테고리 변경',
      amount: 50000,
      date: '2024-12-21',
      reason: '식사비를 문화비로 전환',
    },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleBulkDistribution = async () => {
    const amount = parseInt(distributionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('유효한 금액을 입력해주세요');
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

    alert(`${filteredEmployees.length}명 직원에게 ${formatAmount(amount)} 배분 완료!`);
    setShowDistributionModal(false);
    setDistributionAmount('');
  };

  const handleApprove = (approvalId: string) => {
    console.log('Approved:', approvalId);
    alert('요청이 승인되었습니다!');
  };

  const handleReject = (approvalId: string) => {
    console.log('Rejected:', approvalId);
    alert('요청이 거부되었습니다');
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
              <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>기업 복지 관리</p>
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
              <p style={{ fontSize: '0.875rem', color: theme.textSecondary, fontWeight: 500, marginBottom: '0.25rem' }}>회사 복지 잔액</p>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: theme.text }}>
                {formatAmount(companyBalance)} B
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: theme.accent }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>group</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{employeesEnrolled}명 직원</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: theme.textSecondary }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>calendar_month</span>
                  <span style={{ fontSize: '0.75rem' }}>{formatAmount(monthDistributed)} 이번 달</span>
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
            일괄 배분
          </Button>
        </Card>
      </div>

      {/* Distribution Stats Cards */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.75rem' }}>이번달 현황</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>배분 합계</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>trending_up</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(totalDistributedThisMonth)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.accent, marginTop: '0.25rem' }}>전월 대비 +8.5%</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>1인당 평균</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>person</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(averagePerEmployee)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>기본 지급액</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>대기 중</span>
              <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '1.125rem' }}>schedule</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{pendingDistributions}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>대기 항목 없음</p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>사용률</span>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.125rem' }}>percent</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.text }}>{distributionRate}%</p>
            <p style={{ fontSize: '0.75rem', color: theme.accent, marginTop: '0.25rem' }}>우수 사용</p>
          </Card>
        </div>
      </div>

      {/* Budget Management */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>예산 현황</h3>
              <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>연간 예산 배정</p>
            </div>
            <Badge variant="primary" size="md">2024</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>연간 예산</span>
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
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>월간 예산</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(monthlyBudget)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>잔여</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.accent }}>{formatAmount(remainingBudget)}</p>
              </div>
            </div>

            {remainingBudget < monthlyBudget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '1.125rem' }}>warning</span>
                <p style={{ fontSize: '0.75rem', color: '#eab308' }}>이번 분기 예산이 부족합니다</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>직원 목록</h3>
          <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{filteredEmployees.length}명</span>
        </div>

        <Input
          icon="search"
          placeholder="이름으로 검색..."
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
                        {employee.status === 'Active' ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{employee.department}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(employee.monthlyAllowance)}</p>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>월간</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: `1px solid ${theme.border}` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>사용</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.accent }}>{formatAmount(employee.usedBalance)}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>잔여</p>
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
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>카테고리별 사용</h4>
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
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>인기 가맹점 카테고리</h4>
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
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>월별 추이</h4>
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
                      <Badge variant="warning" size="sm">대기 중</Badge>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{approval.department}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{formatAmount(approval.amount)}</p>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{approval.requestType}</p>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: theme.cardHover, borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>사유:</p>
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
                    거부
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(approval.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    승인
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
        title="일괄 배분"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: theme.textSecondary, marginBottom: '0.5rem' }}>
              카테고리
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
            label="1인당 금액"
            type="number"
            icon="payments"
            placeholder="금액 입력..."
            value={distributionAmount}
            onChange={(e) => setDistributionAmount(e.target.value)}
          />

          <Input
            label="배분 날짜"
            type="date"
            icon="calendar_month"
            value={distributionDate}
            onChange={(e) => setDistributionDate(e.target.value)}
          />

          <div style={{ padding: '1rem', backgroundColor: theme.cardHover, borderRadius: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>수혜자</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{filteredEmployees.length}명 직원</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>총 금액</span>
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
              취소
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleBulkDistribution}
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              처리
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WelfareManagement;
