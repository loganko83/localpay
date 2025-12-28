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

import { theme } from '../../styles/theme';

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
      name: '운전자금 대출',
      maxAmount: 30000000,
      interestRate: 3.5,
      term: '6-12개월',
      eligible: true,
    },
    {
      id: 'equipment',
      name: '설비자금 대출',
      maxAmount: 20000000,
      interestRate: 4.0,
      term: '12-24개월',
      eligible: true,
    },
    {
      id: 'line-of-credit',
      name: '한도 대출',
      maxAmount: 15000000,
      interestRate: 4.5,
      term: '회전',
      eligible: true,
    },
    {
      id: 'expansion',
      name: '사업확장 대출',
      maxAmount: 50000000,
      interestRate: 5.0,
      term: '24-36개월',
      eligible: false,
    },
  ];

  const improvementTips = [
    {
      title: '거래량 증가',
      description: '지역화폐 거래를 15% 더 처리하세요',
      expectedImpact: '+25점',
      icon: 'trending_up',
      color: 'text-primary',
    },
    {
      title: '고객 유지율 향상',
      description: '로열티 프로그램에 참여하여 재방문 고객을 늘리세요',
      expectedImpact: '+18점',
      icon: 'loyalty',
      color: 'text-blue-500',
    },
    {
      title: '결제 일관성 유지',
      description: '3개월 이상 무연체 기록을 유지하세요',
      expectedImpact: '+12점',
      icon: 'check_circle',
      color: 'text-yellow-500',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="material-symbols-outlined animate-spin text-4xl" style={{ color: theme.accent }}>
          progress_activity
        </span>
        <p style={{ color: theme.textSecondary, marginTop: '16px' }}>신용점수 로딩 중...</p>
      </div>
    );
  }

  if (!creditAssessment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '0 16px' }}>
        <span className="material-symbols-outlined mb-4" style={{ color: theme.textSecondary, fontSize: '60px' }}>
          error_outline
        </span>
        <p style={{ color: theme.text, fontWeight: 'bold', marginBottom: '8px' }}>신용 데이터를 불러올 수 없습니다</p>
        <Button onClick={loadCreditData} variant="primary">
          다시 시도
        </Button>
      </div>
    );
  }

  const scoreTrend = creditAssessment.score > creditAssessment.previousScore ? 'up' : 'down';
  const scoreDiff = Math.abs(creditAssessment.score - creditAssessment.previousScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
      <Header title="신용점수" showBack />

      {/* Credit Score Header */}
      <div style={{ padding: '24px 16px 16px' }}>
        <Card variant="balance" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                신용점수
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: theme.text }}>
                  {creditAssessment.score}
                </h1>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Badge
                    variant="success"
                    size="md"
                  >
                    등급 {getGradeLabel(creditAssessment.grade)}
                  </Badge>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: scoreTrend === 'up' ? theme.accent : '#ef4444' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {scoreTrend === 'up' ? 'trending_up' : 'trending_down'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {scoreTrend === 'up' ? '+' : '-'}{scoreDiff}점
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '12px' }}>
                최종 업데이트: {new Date(creditAssessment.assessedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div style={{ height: '48px', width: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${getGradeColor(creditAssessment.grade)}20` }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: '24px', color: getGradeColor(creditAssessment.grade) }}>
                stars
              </span>
            </div>
          </div>

          {/* Score Gauge */}
          <div style={{ position: 'relative', height: '128px', marginBottom: '16px' }}>
            <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary }}>만점</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: theme.text }}>1000</p>
              </div>
            </div>
            <svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}>
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
                stroke={theme.border}
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
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
              />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: theme.textSecondary }}>
            <span>0 - 매우 낮음</span>
            <span>500 - 보통</span>
            <span>1000 - 우수</span>
          </div>
        </Card>
      </div>

      {/* Score Factors Breakdown */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>점수 요인</h3>
          <button style={{ fontSize: '12px', color: theme.accent, fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}>
            자세히 보기
          </button>
        </div>

        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {creditAssessment.factors.map((factor, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>{factor.name}</span>
                    <Badge
                      variant={factor.rating === 'STRONG' ? 'success' : factor.rating === 'AVERAGE' ? 'warning' : 'error'}
                      size="sm"
                    >
                      {factor.rating}
                    </Badge>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>{Math.round(factor.value)}/100</span>
                    <span style={{ fontSize: '12px', color: theme.textSecondary, marginLeft: '8px' }}>
                      ({Math.round(factor.weight * 100)}%)
                    </span>
                  </div>
                </div>
                <div style={{ height: '8px', backgroundColor: theme.cardHover, borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      transition: 'all 0.5s',
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
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>이용 가능한 신용 상품</h3>
          <Badge variant="success" size="sm">
            {creditProducts.filter(p => p.eligible).length}개 이용 가능
          </Badge>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {creditProducts.map((product) => (
            <Card key={product.id} padding="md" className={!product.eligible ? 'opacity-50' : ''}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ flex: '1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>{product.name}</h4>
                    {product.eligible && <Badge variant="success" size="sm">사전 승인됨</Badge>}
                  </div>
                  <p style={{ fontSize: '12px', color: theme.textSecondary }}>기간: {product.term}</p>
                </div>
                {!product.eligible && (
                  <span className="material-symbols-outlined" style={{ color: theme.textSecondary, fontSize: '18px' }}>
                    lock
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '4px' }}>최대 금액</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: theme.text }}>₩{formatAmount(product.maxAmount)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '4px' }}>이자율</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: theme.accent }}>{product.interestRate}%</p>
                </div>
              </div>

              {product.eligible && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => navigate('/merchant/loan-apply', { state: { product } })}
                >
                  지금 신청
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction Analytics */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text, marginBottom: '12px' }}>거래 분석</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '18px' }}>
                payments
              </span>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>월간 거래량</span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>₩25M</p>
            <p style={{ fontSize: '12px', color: theme.accent, display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', marginRight: '2px' }}>trending_up</span>
              전월 대비 +12%
            </p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '18px' }}>
                receipt_long
              </span>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>평균 거래액</span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>₩59.5K</p>
            <p style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', marginRight: '2px' }}>remove</span>
              전월 대비 +2%
            </p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '18px' }}>
                group
              </span>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>순 고객 수</span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>180</p>
            <p style={{ fontSize: '12px', color: theme.accent, display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', marginRight: '2px' }}>trending_up</span>
              이번 달 +8명
            </p>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#a855f7', fontSize: '18px' }}>
                autorenew
              </span>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>재방문율</span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>65%</p>
            <p style={{ fontSize: '12px', color: theme.accent, display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', marginRight: '2px' }}>trending_up</span>
              전월 대비 +5%
            </p>
          </Card>
        </div>

        <Card padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>피크 거래 시간대</h4>
            <p style={{ fontSize: '12px', color: theme.textSecondary }}>최근 30일</p>
          </div>
          <div style={{ height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textSecondary, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: '8px' }}
                  itemStyle={{ color: theme.text }}
                  cursor={{ fill: theme.cardHover }}
                />
                <Bar dataKey="transactions" fill={theme.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Score History Chart */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>점수 이력</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewPeriod('6m')}
              style={{
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: viewPeriod === '6m' ? theme.accent : theme.card,
                color: viewPeriod === '6m' ? theme.bg : theme.textSecondary,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              6M
            </button>
            <button
              onClick={() => setViewPeriod('12m')}
              style={{
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: viewPeriod === '12m' ? theme.accent : theme.card,
                color: viewPeriod === '12m' ? theme.bg : theme.textSecondary,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              12M
            </button>
          </div>
        </div>

        <Card padding="lg">
          <div style={{ height: '192px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textSecondary, fontSize: 10 }}
                />
                <YAxis
                  domain={[600, 900]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textSecondary, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: '8px' }}
                  itemStyle={{ color: theme.text }}
                  labelStyle={{ color: theme.textSecondary }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={theme.accent}
                  strokeWidth={3}
                  dot={{ fill: theme.accent, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}>
            <div>
              <p style={{ fontSize: '12px', color: theme.textSecondary }}>점수 향상</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: theme.accent }}>+140점</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: theme.textSecondary }}>기간 평균</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: theme.text }}>754</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement Tips */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>점수 향상 팁</h3>
          <Badge variant="info" size="sm">
            맞춤형
          </Badge>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {improvementTips.map((tip, index) => (
            <Card key={index} padding="md">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ height: '40px', width: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSoft }}>
                  <span className="material-symbols-outlined" style={{ color: theme.accent }}>
                    {tip.icon}
                  </span>
                </div>
                <div style={{ flex: '1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>{tip.title}</h4>
                    <Badge variant="success" size="sm">
                      {tip.expectedImpact}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '12px' }}>{tip.description}</p>
                  <Button variant="secondary" size="sm" fullWidth>
                    개선 시작
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text, marginBottom: '12px' }}>추천사항</h3>
        <div style={{ backgroundColor: theme.accentSoft, borderColor: theme.accent + '33', borderWidth: '1px', borderStyle: 'solid', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '24px' }}>
              lightbulb
            </span>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text, marginBottom: '8px' }}>좋은 성과를 유지하세요!</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {creditAssessment.recommendations.map((rec, index) => (
                  <li key={index} style={{ fontSize: '12px', color: theme.textSecondary, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '14px', marginTop: '2px' }}>
                      check_circle
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditScore;
