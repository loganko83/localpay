import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input, Toggle, Modal } from '../../components/common';
import { programmableMoneyService, PolicyFundType, ProgrammableToken, MCC_CATEGORIES } from '../../services/programmableMoney';
import { tokenLifecycleService, CirculationMetrics, BudgetTracking } from '../../services/tokenLifecycle';

interface FundTypeConfig {
  type: PolicyFundType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const FUND_TYPES: FundTypeConfig[] = [
  {
    type: 'DISASTER_RELIEF',
    name: '재난지원금',
    icon: 'medical_services',
    color: 'bg-red-500',
    description: '긴급 재난 구호 기금',
  },
  {
    type: 'CHILD_MEAL',
    name: '아동급식',
    icon: 'restaurant',
    color: 'bg-orange-500',
    description: '아동 급식 지원 프로그램',
  },
  {
    type: 'YOUTH_ALLOWANCE',
    name: '청년수당',
    icon: 'school',
    color: 'bg-blue-500',
    description: '청년 고용 지원',
  },
  {
    type: 'SENIOR_WELFARE',
    name: '어르신복지',
    icon: 'elderly',
    color: 'bg-purple-500',
    description: '노인 복지 지원',
  },
  {
    type: 'FARMER_SUPPORT',
    name: '농민지원',
    icon: 'agriculture',
    color: 'bg-green-500',
    description: '농업 지원 기금',
  },
  {
    type: 'TRADITIONAL_MARKET',
    name: '전통시장',
    icon: 'storefront',
    color: 'bg-yellow-500',
    description: '전통시장 보너스',
  },
  {
    type: 'GENERAL',
    name: '일반',
    icon: 'payments',
    color: 'bg-primary',
    description: '일반 지역화폐',
  },
];

interface MCCCategory {
  name: string;
  codes: string[];
}

const MCC_CATEGORY_LIST: MCCCategory[] = [
  { name: '식료품', codes: MCC_CATEGORIES.GROCERY },
  { name: '음식점', codes: MCC_CATEGORIES.RESTAURANT },
  { name: '약국', codes: MCC_CATEGORIES.PHARMACY },
  { name: '병원', codes: MCC_CATEGORIES.HOSPITAL },
  { name: '교육', codes: MCC_CATEGORIES.EDUCATION },
  { name: '전통시장', codes: MCC_CATEGORIES.TRADITIONAL_MARKET },
  { name: '주류', codes: MCC_CATEGORIES.LIQUOR },
  { name: '도박', codes: MCC_CATEGORIES.GAMBLING },
  { name: '성인', codes: MCC_CATEGORIES.ADULT },
  { name: '대형마트', codes: MCC_CATEGORIES.LARGE_MART },
  { name: '명품', codes: MCC_CATEGORIES.LUXURY },
  { name: '교통', codes: MCC_CATEGORIES.TRANSPORT },
  { name: '주유소', codes: MCC_CATEGORIES.GAS_STATION },
];

const TokenIssuance: React.FC = () => {
  const [selectedFundType, setSelectedFundType] = useState<PolicyFundType>('GENERAL');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showMCCModal, setShowMCCModal] = useState(false);
  const [showClawbackModal, setShowClawbackModal] = useState(false);

  // Form state
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [expiryDays, setExpiryDays] = useState('90');
  const [budgetCode, setBudgetCode] = useState('');
  const [customRestrictions, setCustomRestrictions] = useState(false);
  const [allowedMCC, setAllowedMCC] = useState<string[]>([]);
  const [blockedMCC, setBlockedMCC] = useState<string[]>([]);

  // Data state
  const [metrics, setMetrics] = useState<CirculationMetrics | null>(null);
  const [issuedTokens, setIssuedTokens] = useState<ProgrammableToken[]>([]);
  const [filterFundType, setFilterFundType] = useState<PolicyFundType | 'ALL'>('ALL');
  const [searchUserId, setSearchUserId] = useState('');
  const [budgets, setBudgets] = useState<Map<string, BudgetTracking>>(new Map());

  // Load data
  useEffect(() => {
    loadMetrics();
    loadIssuedTokens();
    loadBudgets();
  }, []);

  const loadMetrics = () => {
    const calculatedMetrics = tokenLifecycleService.calculateMetrics();
    setMetrics(calculatedMetrics);
  };

  const loadIssuedTokens = () => {
    const allTokens: ProgrammableToken[] = [];
    // In production, this would fetch from API
    // For now, we'll just show empty or demo data
    setIssuedTokens(allTokens);
  };

  const loadBudgets = () => {
    const budgetMap = new Map<string, BudgetTracking>();
    FUND_TYPES.forEach((fund) => {
      const budget = tokenLifecycleService.getBudgetSummary(fund.type, 2024);
      if (budget) {
        budgetMap.set(fund.type, budget);
      }
    });
    setBudgets(budgetMap);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleIssueTokens = async () => {
    if (!recipientId || !amount) {
      alert('모든 필수 필드를 입력해주세요');
      return;
    }

    try {
      const customRest = customRestrictions ? {
        allowedMCC: allowedMCC.length > 0 ? allowedMCC : undefined,
        blockedMCC: blockedMCC.length > 0 ? blockedMCC : undefined,
      } : undefined;

      await programmableMoneyService.issueTokens({
        userId: recipientId,
        amount: parseFloat(amount),
        fundType: selectedFundType,
        expiryDays: parseInt(expiryDays),
        issuedBy: 'admin-001',
        budgetCode: budgetCode || undefined,
        customRestrictions: customRest,
      });

      // Reset form
      setRecipientId('');
      setAmount('');
      setExpiryDays('90');
      setBudgetCode('');
      setCustomRestrictions(false);
      setAllowedMCC([]);
      setBlockedMCC([]);
      setShowIssueModal(false);

      // Reload data
      loadMetrics();
      loadIssuedTokens();
      loadBudgets();

      alert('토큰이 성공적으로 발행되었습니다!');
    } catch (error) {
      console.error('Failed to issue tokens:', error);
      alert('토큰 발행에 실패했습니다');
    }
  };

  const handleProcessClawback = async () => {
    try {
      const result = await programmableMoneyService.processClawback();
      alert(`회수 처리 완료: ${result.processed}개 토큰, 총액: ₩${formatAmount(result.totalClawback)}`);
      loadMetrics();
      loadIssuedTokens();
      setShowClawbackModal(false);
    } catch (error) {
      console.error('Failed to process clawback:', error);
      alert('회수 처리에 실패했습니다');
    }
  };

  const toggleMCCCategory = (codes: string[], type: 'allowed' | 'blocked') => {
    if (type === 'allowed') {
      const hasAll = codes.every(code => allowedMCC.includes(code));
      if (hasAll) {
        setAllowedMCC(allowedMCC.filter(c => !codes.includes(c)));
      } else {
        setAllowedMCC([...new Set([...allowedMCC, ...codes])]);
      }
    } else {
      const hasAll = codes.every(code => blockedMCC.includes(code));
      if (hasAll) {
        setBlockedMCC(blockedMCC.filter(c => !codes.includes(c)));
      } else {
        setBlockedMCC([...new Set([...blockedMCC, ...codes])]);
      }
    }
  };

  const filteredTokens = issuedTokens.filter((token) => {
    if (filterFundType !== 'ALL' && token.fundType !== filterFundType) return false;
    if (searchUserId && !token.userId.includes(searchUserId)) return false;
    return true;
  });

  const getTokenStatus = (token: ProgrammableToken): string => {
    const now = Date.now();
    if (token.restrictions.expiryDate <= now) return 'expired';
    if (token.amount <= 0) return 'depleted';
    return 'active';
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'active': return 'success';
      case 'depleted': return 'warning';
      case 'expired': return 'error';
      default: return 'error';
    }
  };

  return (
    <div className="flex flex-col pb-24 bg-background min-h-screen">
      <Header title="토큰 발행" />

      {/* Dashboard Header */}
      <div className="px-4 mb-4">
        <Card padding="lg" className="bg-gradient-to-br from-[#2b8cee] to-[#1a5ba8]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">발행 대시보드</h2>
            <p className="text-sm text-white/80">시스템 전체 토큰 통계</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/70 mb-1">총 발행량</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount(metrics?.totalMinted || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">유통량</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount(metrics?.totalCirculating || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">만료/회수</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount((metrics?.totalBurned || 0) + (metrics?.totalClawback || 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">시스템 상태</p>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">정상 운영</Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>승수 효과: {metrics?.multiplierEffect.toFixed(2)}x</span>
              <span>유통 속도: {metrics?.velocityPerDay.toFixed(3)}/일</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Fund Type Selector */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">기금 유형 선택</h3>
        <div className="grid grid-cols-2 gap-3">
          {FUND_TYPES.map((fund) => {
            const budget = budgets.get(fund.type);
            const isSelected = selectedFundType === fund.type;

            return (
              <button
                key={fund.type}
                onClick={() => setSelectedFundType(fund.type)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#2b8cee] bg-[#2b8cee]/10'
                    : 'border-surface-highlight bg-surface hover:border-surface'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={`h-10 w-10 ${fund.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined text-white text-[20px]">
                      {fund.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{fund.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{fund.description}</p>
                  </div>
                </div>
                {budget && (
                  <div className="text-xs">
                    <p className="text-text-secondary">
                      잔액: <span className="text-white font-medium">₩{formatAmount(budget.circulatingAmount)}</span>
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setShowIssueModal(true)}
            icon={<span className="material-symbols-outlined text-[20px]">add_circle</span>}
          >
            토큰 발행
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setShowMCCModal(true)}
            icon={<span className="material-symbols-outlined text-[20px]">tune</span>}
          >
            MCC 설정
          </Button>
        </div>
      </div>

      {/* Budget Tracking */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">기금 유형별 예산 현황</h3>
        <Card padding="md">
          <div className="space-y-4">
            {FUND_TYPES.map((fund) => {
              const budget = budgets.get(fund.type);
              if (!budget || budget.allocatedAmount === 0) return null;

              const utilizationPercent = (budget.issuedAmount / budget.allocatedAmount) * 100;

              return (
                <div key={fund.type}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 ${fund.color} rounded-lg flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-white text-[16px]">
                          {fund.icon}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">{fund.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {utilizationPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-highlight rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-[#2b8cee] rounded-full transition-all"
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <span>발행: ₩{formatAmount(budget.issuedAmount)}</span>
                    <span>배정: ₩{formatAmount(budget.allocatedAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Active Tokens Table */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">활성 토큰</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClawbackModal(true)}
            icon={<span className="material-symbols-outlined text-[16px]">history</span>}
          >
            회수
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-3 space-y-2">
          <Input
            placeholder="사용자 ID로 검색..."
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            icon="search"
          />
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterFundType('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterFundType === 'ALL'
                  ? 'bg-[#2b8cee] text-white'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
              }`}
            >
              전체
            </button>
            {FUND_TYPES.map((fund) => (
              <button
                key={fund.type}
                onClick={() => setFilterFundType(fund.type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterFundType === fund.type
                    ? 'bg-[#2b8cee] text-white'
                    : 'bg-surface-highlight text-text-secondary hover:text-white'
                }`}
              >
                {fund.name}
              </button>
            ))}
          </div>
        </div>

        {/* Token List */}
        <div className="space-y-3">
          {filteredTokens.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-text-muted text-5xl mb-2">
                  token
                </span>
                <p className="text-sm text-text-secondary">발행된 토큰이 없습니다</p>
                <p className="text-xs text-text-muted mt-1">첫 번째 토큰을 발행하여 시작하세요</p>
              </div>
            </Card>
          ) : (
            filteredTokens.map((token) => {
              const fundConfig = FUND_TYPES.find(f => f.type === token.fundType);
              const status = getTokenStatus(token);
              const daysRemaining = Math.ceil((token.restrictions.expiryDate - Date.now()) / (24 * 60 * 60 * 1000));

              return (
                <Card key={token.id} variant="transaction" padding="md">
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`h-12 w-12 ${fundConfig?.color || 'bg-surface-highlight'} rounded-xl flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white">
                        {fundConfig?.icon || 'token'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-mono text-text-secondary">{token.id}</p>
                        <Badge variant={getStatusColor(status)} size="sm">
                          {status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white">사용자: {token.userId}</p>
                      <p className="text-xs text-text-muted">기금: {fundConfig?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#2b8cee]">₩{formatAmount(token.amount)}</p>
                      {status === 'active' && daysRemaining > 0 && (
                        <p className="text-[10px] text-text-muted">{daysRemaining}일 남음</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted">발행일</p>
                      <p className="text-white">{formatDate(token.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">만료일</p>
                      <p className="text-white">{formatDate(token.restrictions.expiryDate)}</p>
                    </div>
                  </div>

                  {token.budgetCode && (
                    <div className="mt-2 pt-2 border-t border-surface-highlight">
                      <p className="text-[10px] text-text-muted">
                        예산 코드: <span className="font-mono text-white">{token.budgetCode}</span>
                      </p>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Issue Tokens Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="새 토큰 발행"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              기금 유형
            </label>
            <div className="p-3 rounded-xl bg-surface border border-surface-highlight">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 ${FUND_TYPES.find(f => f.type === selectedFundType)?.color} rounded-lg flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white">
                    {FUND_TYPES.find(f => f.type === selectedFundType)?.icon}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {FUND_TYPES.find(f => f.type === selectedFundType)?.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {FUND_TYPES.find(f => f.type === selectedFundType)?.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Input
            label="수령자 사용자 ID"
            placeholder="user-12345"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            icon="person"
          />

          <Input
            label="금액 (원)"
            placeholder="100000"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            icon="payments"
          />

          <Input
            label="만료 일수"
            placeholder="90"
            type="number"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            icon="calendar_month"
          />

          <Input
            label="예산 코드 (선택사항)"
            placeholder="BUD-2024-001"
            value={budgetCode}
            onChange={(e) => setBudgetCode(e.target.value)}
            icon="account_balance_wallet"
          />

          <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-surface-highlight">
            <div>
              <p className="text-sm font-medium text-white">맞춤 제한 설정</p>
              <p className="text-xs text-text-muted">기본 MCC 규칙 재정의</p>
            </div>
            <Toggle
              checked={customRestrictions}
              onChange={setCustomRestrictions}
            />
          </div>

          {customRestrictions && (
            <div className="p-4 rounded-xl bg-surface-highlight border border-surface">
              <p className="text-xs text-text-secondary mb-3">
                이 토큰에 대한 맞춤 MCC 제한을 설정하세요
              </p>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  setShowIssueModal(false);
                  setShowMCCModal(true);
                }}
                icon={<span className="material-symbols-outlined text-[16px]">tune</span>}
              >
                MCC 설정 열기
              </Button>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleIssueTokens}
          >
            토큰 발행
          </Button>
        </div>
      </Modal>

      {/* MCC Restriction Configurator Modal */}
      <Modal
        isOpen={showMCCModal}
        onClose={() => setShowMCCModal(false)}
        title="MCC 제한 설정"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            가맹점 업종 제한을 설정합니다. 허용 또는 차단할 업종을 선택하세요.
          </p>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">허용 업종</h4>
            <div className="space-y-2">
              {MCC_CATEGORY_LIST.filter(cat =>
                !['주류', '도박', '성인', '대형마트', '명품'].includes(cat.name)
              ).map((category) => {
                const isSelected = category.codes.every(code => allowedMCC.includes(code));

                return (
                  <button
                    key={category.name}
                    onClick={() => toggleMCCCategory(category.codes, 'allowed')}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-surface-highlight bg-surface hover:border-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{category.name}</p>
                        <p className="text-xs text-text-muted">{category.codes.length}개 MCC 코드</p>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">차단 업종</h4>
            <div className="space-y-2">
              {MCC_CATEGORY_LIST.filter(cat =>
                ['주류', '도박', '성인', '대형마트', '명품'].includes(cat.name)
              ).map((category) => {
                const isSelected = category.codes.every(code => blockedMCC.includes(code));

                return (
                  <button
                    key={category.name}
                    onClick={() => toggleMCCCategory(category.codes, 'blocked')}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-surface-highlight bg-surface hover:border-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{category.name}</p>
                        <p className="text-xs text-text-muted">{category.codes.length}개 MCC 코드</p>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-red-500">block</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-surface-highlight">
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="p-2 rounded-lg bg-surface">
                <p className="text-text-muted mb-1">허용</p>
                <p className="text-white font-bold">{allowedMCC.length}개 코드</p>
              </div>
              <div className="p-2 rounded-lg bg-surface">
                <p className="text-text-muted mb-1">차단</p>
                <p className="text-white font-bold">{blockedMCC.length}개 코드</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setShowMCCModal(false);
                setShowIssueModal(true);
              }}
            >
              설정 적용
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clawback Management Modal */}
      <Modal
        isOpen={showClawbackModal}
        onClose={() => setShowClawbackModal(false)}
        title="회수 관리"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-500">warning</span>
              <div>
                <p className="text-sm font-medium text-yellow-500">회수 프로세스</p>
                <p className="text-xs text-yellow-500/80 mt-1">
                  만료된 모든 토큰을 처리하고 발행자에게 자금을 반환합니다. 이 작업은 취소할 수 없습니다.
                </p>
              </div>
            </div>
          </div>

          <Card padding="md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">총 회수액</p>
                <p className="text-lg font-bold text-white">
                  ₩{formatAmount(metrics?.totalClawback || 0)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">총 소각액</p>
                <p className="text-lg font-bold text-white">
                  ₩{formatAmount(metrics?.totalBurned || 0)}
                </p>
              </div>
            </div>
          </Card>

          <div className="pt-2">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={handleProcessClawback}
              icon={<span className="material-symbols-outlined text-[20px]">delete_sweep</span>}
            >
              지금 회수 처리
            </Button>
          </div>

          <div className="pt-4 border-t border-surface-highlight">
            <h4 className="text-sm font-bold text-white mb-3">회수 이력</h4>
            <div className="space-y-2">
              <Card padding="sm">
                <p className="text-xs text-text-secondary text-center py-4">
                  최근 회수 작업 없음
                </p>
              </Card>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TokenIssuance;
