import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Header } from '../../components/layout';
import { Card, Button, Badge } from '../../components/common';
import { merchantCreditService, CreditGrade, CreditAssessment, FinancialMetrics } from '../../services/merchantCredit';

const CreditScore: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creditAssessment, setCreditAssessment] = useState<CreditAssessment | null>(null);
  const [viewPeriod, setViewPeriod] = useState<'6m' | '12m'>('6m');
  const merchantId = 'merchant-001';

  useEffect(() => {
    loadCreditData();
  }, []);

  const loadCreditData = async () => {
    setLoading(true);
    try {
      let profile = merchantCreditService.getProfile(merchantId);

      if (!profile) {
        profile = await merchantCreditService.initializeProfile({
          merchantId,
          merchantName: 'Jeonju Store #42',
          businessType: 'Retail',
          registeredAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        });
      }

      const mockMetrics: FinancialMetrics = {
        monthlyAverageVolume: 25000000,
        totalLifetimeVolume: 300000000,
        monthlyTransactionCount: 420,
        uniqueCustomers: 180,
        repeatCustomerRate: 0.65,
        averageTicketSize: 59500,
        monthOverMonthGrowth: 0.12,
        yearOverYearGrowth: 0.35,
        volatilityScore: 0.15,
        averageSettlementDays: 2,
        paymentDefaultRate: 0.01,
        daysOnPlatform: 365,
        localCurrencyRatio: 0.85,
      };

      const assessment = await merchantCreditService.assessCredit(merchantId, mockMetrics);
      setCreditAssessment(assessment);
    } catch (error) {
      console.error('Failed to load credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getGradeColor = (grade: CreditGrade): string => {
    const colors: Record<CreditGrade, string> = {
      EXCELLENT: '#13ec5b',
      GOOD: '#4ade80',
      FAIR: '#fbbf24',
      POOR: '#fb923c',
      VERY_POOR: '#ef4444',
    };
    return colors[grade];
  };

  const getGradeLabel = (grade: CreditGrade): string => {
    const labels: Record<CreditGrade, string> = {
      EXCELLENT: 'AAA',
      GOOD: 'AA',
      FAIR: 'A',
      POOR: 'B',
      VERY_POOR: 'C',
    };
    return labels[grade];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 850) return '#13ec5b';
    if (score >= 700) return '#4ade80';
    if (score >= 550) return '#fbbf24';
    if (score >= 400) return '#fb923c';
    return '#ef4444';
  };

  const scoreHistory = [
    { month: 'Jul', score: 680 },
    { month: 'Aug', score: 710 },
    { month: 'Sep', score: 745 },
    { month: 'Oct', score: 772 },
    { month: 'Nov', score: 798 },
    { month: 'Dec', score: creditAssessment?.score || 820 },
  ];

  const peakHoursData = [
    { hour: '9AM', transactions: 15 },
    { hour: '11AM', transactions: 32 },
    { hour: '1PM', transactions: 48 },
    { hour: '3PM', transactions: 35 },
    { hour: '5PM', transactions: 52 },
    { hour: '7PM', transactions: 38 },
    { hour: '9PM', transactions: 20 },
  ];

  const creditProducts = [
    {
      id: 'working-capital',
      name: 'Working Capital Loan',
      maxAmount: 30000000,
      interestRate: 3.5,
      term: '6-12 months',
      eligible: true,
    },
    {
      id: 'equipment',
      name: 'Equipment Financing',
      maxAmount: 20000000,
      interestRate: 4.0,
      term: '12-24 months',
      eligible: true,
    },
    {
      id: 'line-of-credit',
      name: 'Line of Credit',
      maxAmount: 15000000,
      interestRate: 4.5,
      term: 'Revolving',
      eligible: true,
    },
    {
      id: 'expansion',
      name: 'Expansion Loan',
      maxAmount: 50000000,
      interestRate: 5.0,
      term: '24-36 months',
      eligible: false,
    },
  ];

  const improvementTips = [
    {
      title: 'Increase Transaction Volume',
      description: 'Process 15% more local currency transactions',
      expectedImpact: '+25 points',
      icon: 'trending_up',
      color: 'text-primary',
    },
    {
      title: 'Improve Customer Retention',
      description: 'Join loyalty program to boost repeat customers',
      expectedImpact: '+18 points',
      icon: 'loyalty',
      color: 'text-blue-500',
    },
    {
      title: 'Maintain Payment Consistency',
      description: 'Keep zero-default record for 3+ months',
      expectedImpact: '+12 points',
      icon: 'check_circle',
      color: 'text-yellow-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">
          progress_activity
        </span>
        <p className="text-text-secondary mt-4">Loading credit score...</p>
      </div>
    );
  }

  if (!creditAssessment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <span className="material-symbols-outlined text-text-secondary text-6xl mb-4">
          error_outline
        </span>
        <p className="text-white font-bold mb-2">Unable to load credit data</p>
        <Button onClick={loadCreditData} variant="primary">
          Retry
        </Button>
      </div>
    );
  }

  const scoreTrend = creditAssessment.score > creditAssessment.previousScore ? 'up' : 'down';
  const scoreDiff = Math.abs(creditAssessment.score - creditAssessment.previousScore);

  return (
    <div className="flex flex-col pb-4">
      <Header title="Credit Score" showBack />

      {/* Credit Score Header */}
      <div className="px-4 pt-6 pb-4">
        <Card variant="balance" padding="lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-2">
                Your Credit Score
              </p>
              <div className="flex items-baseline gap-3">
                <h1 className="text-5xl font-bold text-white">
                  {creditAssessment.score}
                </h1>
                <div className="flex flex-col">
                  <Badge
                    variant="success"
                    size="md"
                  >
                    Grade {getGradeLabel(creditAssessment.grade)}
                  </Badge>
                  <div className={`flex items-center gap-1 mt-1 ${scoreTrend === 'up' ? 'text-primary' : 'text-red-500'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {scoreTrend === 'up' ? 'trending_up' : 'trending_down'}
                    </span>
                    <span className="text-xs font-bold">
                      {scoreTrend === 'up' ? '+' : '-'}{scoreDiff} points
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Last updated: {new Date(creditAssessment.assessedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full flex items-center justify-center text-primary"
              style={{ backgroundColor: `${getGradeColor(creditAssessment.grade)}20` }}
            >
              <span className="material-symbols-outlined filled text-2xl"
                style={{ color: getGradeColor(creditAssessment.grade) }}
              >
                stars
              </span>
            </div>
          </div>

          {/* Score Gauge */}
          <div className="relative h-32 mb-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-text-secondary">Out of</p>
                <p className="text-2xl font-bold text-white">1000</p>
              </div>
            </div>
            <svg viewBox="0 0 200 120" className="w-full h-full">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="25%" stopColor="#fb923c" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#13ec5b" />
                </linearGradient>
              </defs>
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#2a3830"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(creditAssessment.score / 1000) * 251.2} 251.2`}
              />
              <circle
                cx={20 + 160 * (creditAssessment.score / 1000)}
                cy={100 - 80 * Math.sin(Math.PI * (creditAssessment.score / 1000))}
                r="8"
                fill={getScoreColor(creditAssessment.score)}
                className="drop-shadow-lg"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>0 - Poor</span>
            <span>500 - Fair</span>
            <span>1000 - Excellent</span>
          </div>
        </Card>
      </div>

      {/* Score Factors Breakdown */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Score Factors</h3>
          <button className="text-xs text-primary font-medium">
            Learn More
          </button>
        </div>

        <Card padding="lg">
          <div className="space-y-4">
            {creditAssessment.factors.map((factor, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{factor.name}</span>
                    <Badge
                      variant={factor.rating === 'STRONG' ? 'success' : factor.rating === 'AVERAGE' ? 'warning' : 'error'}
                      size="sm"
                    >
                      {factor.rating}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{Math.round(factor.value)}/100</span>
                    <span className="text-xs text-text-secondary ml-2">
                      ({Math.round(factor.weight * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${factor.value}%`,
                      backgroundColor: factor.rating === 'STRONG' ? '#13ec5b' : factor.rating === 'AVERAGE' ? '#fbbf24' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Credit Products Available */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Available Credit Products</h3>
          <Badge variant="success" size="sm">
            {creditProducts.filter(p => p.eligible).length} Eligible
          </Badge>
        </div>

        <div className="space-y-3">
          {creditProducts.map((product) => (
            <Card key={product.id} padding="md" className={!product.eligible ? 'opacity-50' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white">{product.name}</h4>
                    {product.eligible && <Badge variant="success" size="sm">Pre-approved</Badge>}
                  </div>
                  <p className="text-xs text-text-secondary">Term: {product.term}</p>
                </div>
                {!product.eligible && (
                  <span className="material-symbols-outlined text-text-secondary text-lg">
                    lock
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Max Amount</p>
                  <p className="text-lg font-bold text-white">₩{formatAmount(product.maxAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary mb-1">Interest Rate</p>
                  <p className="text-lg font-bold text-primary">{product.interestRate}%</p>
                </div>
              </div>

              {product.eligible && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => navigate('/merchant/loan-apply', { state: { product } })}
                >
                  Apply Now
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction Analytics */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Transaction Analytics</h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">
                payments
              </span>
              <span className="text-xs text-text-secondary">Monthly Volume</span>
            </div>
            <p className="text-xl font-bold text-white">₩25M</p>
            <p className="text-xs text-primary flex items-center mt-1">
              <span className="material-symbols-outlined text-[10px] mr-0.5">trending_up</span>
              +12% MoM
            </p>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-blue-500 text-lg">
                receipt_long
              </span>
              <span className="text-xs text-text-secondary">Avg Transaction</span>
            </div>
            <p className="text-xl font-bold text-white">₩59.5K</p>
            <p className="text-xs text-text-muted flex items-center mt-1">
              <span className="material-symbols-outlined text-[10px] mr-0.5">remove</span>
              +2% MoM
            </p>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-yellow-500 text-lg">
                group
              </span>
              <span className="text-xs text-text-secondary">Unique Customers</span>
            </div>
            <p className="text-xl font-bold text-white">180</p>
            <p className="text-xs text-primary flex items-center mt-1">
              <span className="material-symbols-outlined text-[10px] mr-0.5">trending_up</span>
              +8 this month
            </p>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-purple-500 text-lg">
                autorenew
              </span>
              <span className="text-xs text-text-secondary">Repeat Rate</span>
            </div>
            <p className="text-xl font-bold text-white">65%</p>
            <p className="text-xs text-primary flex items-center mt-1">
              <span className="material-symbols-outlined text-[10px] mr-0.5">trending_up</span>
              +5% MoM
            </p>
          </Card>
        </div>

        <Card padding="md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-white">Peak Transaction Hours</h4>
            <p className="text-xs text-text-secondary">Last 30 days</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#2a3830', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#2a3830' }}
                />
                <Bar dataKey="transactions" fill="#13ec5b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Score History Chart */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Score History</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewPeriod('6m')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewPeriod === '6m'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:bg-surface-highlight'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setViewPeriod('12m')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewPeriod === '12m'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:bg-surface-highlight'
              }`}
            >
              12M
            </button>
          </div>
        </div>

        <Card padding="lg">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3830" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                />
                <YAxis
                  domain={[600, 900]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#2a3830', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#5c7263' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#13ec5b"
                  strokeWidth={3}
                  dot={{ fill: '#13ec5b', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-highlight">
            <div>
              <p className="text-xs text-text-secondary">Score Improvement</p>
              <p className="text-lg font-bold text-primary">+140 points</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">Period Average</p>
              <p className="text-lg font-bold text-white">754</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement Tips */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Score Improvement Tips</h3>
          <Badge variant="info" size="sm">
            Personalized
          </Badge>
        </div>

        <div className="space-y-3">
          {improvementTips.map((tip, index) => (
            <Card key={index} padding="md">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tip.color.replace('text-', 'bg-')}/10`}>
                  <span className={`material-symbols-outlined ${tip.color}`}>
                    {tip.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                    <Badge variant="success" size="sm">
                      {tip.expectedImpact}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mb-3">{tip.description}</p>
                  <Button variant="secondary" size="sm" fullWidth>
                    Start Improving
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">Recommendations</h3>
        <Card padding="md" className="bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">
              lightbulb
            </span>
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Keep up the great work!</h4>
              <ul className="space-y-2">
                {creditAssessment.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                      check_circle
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreditScore;
