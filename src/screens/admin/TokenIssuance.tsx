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
    name: 'Disaster Relief',
    icon: 'medical_services',
    color: 'bg-red-500',
    description: 'Emergency disaster relief fund',
  },
  {
    type: 'CHILD_MEAL',
    name: 'Child Meal',
    icon: 'restaurant',
    color: 'bg-orange-500',
    description: 'Child meal support program',
  },
  {
    type: 'YOUTH_ALLOWANCE',
    name: 'Youth Allowance',
    icon: 'school',
    color: 'bg-blue-500',
    description: 'Youth employment support',
  },
  {
    type: 'SENIOR_WELFARE',
    name: 'Senior Welfare',
    icon: 'elderly',
    color: 'bg-purple-500',
    description: 'Senior citizen welfare',
  },
  {
    type: 'FARMER_SUPPORT',
    name: 'Farmer Support',
    icon: 'agriculture',
    color: 'bg-green-500',
    description: 'Agricultural support fund',
  },
  {
    type: 'TRADITIONAL_MARKET',
    name: 'Traditional Market',
    icon: 'storefront',
    color: 'bg-yellow-500',
    description: 'Traditional market bonus',
  },
  {
    type: 'GENERAL',
    name: 'General',
    icon: 'payments',
    color: 'bg-primary',
    description: 'General local currency',
  },
];

interface MCCCategory {
  name: string;
  codes: string[];
}

const MCC_CATEGORY_LIST: MCCCategory[] = [
  { name: 'Grocery', codes: MCC_CATEGORIES.GROCERY },
  { name: 'Restaurant', codes: MCC_CATEGORIES.RESTAURANT },
  { name: 'Pharmacy', codes: MCC_CATEGORIES.PHARMACY },
  { name: 'Hospital', codes: MCC_CATEGORIES.HOSPITAL },
  { name: 'Education', codes: MCC_CATEGORIES.EDUCATION },
  { name: 'Traditional Market', codes: MCC_CATEGORIES.TRADITIONAL_MARKET },
  { name: 'Liquor', codes: MCC_CATEGORIES.LIQUOR },
  { name: 'Gambling', codes: MCC_CATEGORIES.GAMBLING },
  { name: 'Adult', codes: MCC_CATEGORIES.ADULT },
  { name: 'Large Mart', codes: MCC_CATEGORIES.LARGE_MART },
  { name: 'Luxury', codes: MCC_CATEGORIES.LUXURY },
  { name: 'Transport', codes: MCC_CATEGORIES.TRANSPORT },
  { name: 'Gas Station', codes: MCC_CATEGORIES.GAS_STATION },
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
      alert('Please fill in all required fields');
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

      alert('Tokens issued successfully!');
    } catch (error) {
      console.error('Failed to issue tokens:', error);
      alert('Failed to issue tokens');
    }
  };

  const handleProcessClawback = async () => {
    try {
      const result = await programmableMoneyService.processClawback();
      alert(`Clawback processed: ${result.processed} tokens, total: ₩${formatAmount(result.totalClawback)}`);
      loadMetrics();
      loadIssuedTokens();
      setShowClawbackModal(false);
    } catch (error) {
      console.error('Failed to process clawback:', error);
      alert('Failed to process clawback');
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
      <Header title="Token Issuance" />

      {/* Dashboard Header */}
      <div className="px-4 mb-4">
        <Card padding="lg" className="bg-gradient-to-br from-[#2b8cee] to-[#1a5ba8]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Issuance Dashboard</h2>
            <p className="text-sm text-white/80">System-wide token statistics</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/70 mb-1">Total Issued</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount(metrics?.totalMinted || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">In Circulation</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount(metrics?.totalCirculating || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">Expired/Clawed Back</p>
              <p className="text-xl font-bold text-white">
                ₩{formatAmount((metrics?.totalBurned || 0) + (metrics?.totalClawback || 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">System Health</p>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">Operational</Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Multiplier Effect: {metrics?.multiplierEffect.toFixed(2)}x</span>
              <span>Velocity: {metrics?.velocityPerDay.toFixed(3)}/day</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Fund Type Selector */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">Select Fund Type</h3>
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
                      Balance: <span className="text-white font-medium">₩{formatAmount(budget.circulatingAmount)}</span>
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
            Issue Tokens
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setShowMCCModal(true)}
            icon={<span className="material-symbols-outlined text-[20px]">tune</span>}
          >
            MCC Config
          </Button>
        </div>
      </div>

      {/* Budget Tracking */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">Budget Tracking by Fund Type</h3>
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
                    <span>Issued: ₩{formatAmount(budget.issuedAmount)}</span>
                    <span>Allocated: ₩{formatAmount(budget.allocatedAmount)}</span>
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
          <h3 className="text-sm font-bold text-white">Active Tokens</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClawbackModal(true)}
            icon={<span className="material-symbols-outlined text-[16px]">history</span>}
          >
            Clawback
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-3 space-y-2">
          <Input
            placeholder="Search by User ID..."
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
              All
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
                <p className="text-sm text-text-secondary">No tokens issued yet</p>
                <p className="text-xs text-text-muted mt-1">Issue your first token to get started</p>
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
                      <p className="text-sm text-white">User: {token.userId}</p>
                      <p className="text-xs text-text-muted">Fund: {fundConfig?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#2b8cee]">₩{formatAmount(token.amount)}</p>
                      {status === 'active' && daysRemaining > 0 && (
                        <p className="text-[10px] text-text-muted">{daysRemaining}d left</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted">Issued</p>
                      <p className="text-white">{formatDate(token.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Expires</p>
                      <p className="text-white">{formatDate(token.restrictions.expiryDate)}</p>
                    </div>
                  </div>

                  {token.budgetCode && (
                    <div className="mt-2 pt-2 border-t border-surface-highlight">
                      <p className="text-[10px] text-text-muted">
                        Budget Code: <span className="font-mono text-white">{token.budgetCode}</span>
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
        title="Issue New Tokens"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Fund Type
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
            label="Recipient User ID"
            placeholder="user-12345"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            icon="person"
          />

          <Input
            label="Amount (KRW)"
            placeholder="100000"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            icon="payments"
          />

          <Input
            label="Expiry Days"
            placeholder="90"
            type="number"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            icon="calendar_month"
          />

          <Input
            label="Budget Code (Optional)"
            placeholder="BUD-2024-001"
            value={budgetCode}
            onChange={(e) => setBudgetCode(e.target.value)}
            icon="account_balance_wallet"
          />

          <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-surface-highlight">
            <div>
              <p className="text-sm font-medium text-white">Custom Restrictions</p>
              <p className="text-xs text-text-muted">Override default MCC rules</p>
            </div>
            <Toggle
              checked={customRestrictions}
              onChange={setCustomRestrictions}
            />
          </div>

          {customRestrictions && (
            <div className="p-4 rounded-xl bg-surface-highlight border border-surface">
              <p className="text-xs text-text-secondary mb-3">
                Configure custom MCC restrictions for this token
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
                Open MCC Configurator
              </Button>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleIssueTokens}
          >
            Issue Tokens
          </Button>
        </div>
      </Modal>

      {/* MCC Restriction Configurator Modal */}
      <Modal
        isOpen={showMCCModal}
        onClose={() => setShowMCCModal(false)}
        title="MCC Restriction Configurator"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Configure merchant category restrictions. Select allowed or blocked categories.
          </p>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Allowed Categories</h4>
            <div className="space-y-2">
              {MCC_CATEGORY_LIST.filter(cat =>
                !['Liquor', 'Gambling', 'Adult', 'Large Mart', 'Luxury'].includes(cat.name)
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
                        <p className="text-xs text-text-muted">{category.codes.length} MCC codes</p>
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
            <h4 className="text-sm font-bold text-white mb-3">Blocked Categories</h4>
            <div className="space-y-2">
              {MCC_CATEGORY_LIST.filter(cat =>
                ['Liquor', 'Gambling', 'Adult', 'Large Mart', 'Luxury'].includes(cat.name)
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
                        <p className="text-xs text-text-muted">{category.codes.length} MCC codes</p>
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
                <p className="text-text-muted mb-1">Allowed</p>
                <p className="text-white font-bold">{allowedMCC.length} codes</p>
              </div>
              <div className="p-2 rounded-lg bg-surface">
                <p className="text-text-muted mb-1">Blocked</p>
                <p className="text-white font-bold">{blockedMCC.length} codes</p>
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
              Apply Configuration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clawback Management Modal */}
      <Modal
        isOpen={showClawbackModal}
        onClose={() => setShowClawbackModal(false)}
        title="Clawback Management"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-500">warning</span>
              <div>
                <p className="text-sm font-medium text-yellow-500">Clawback Process</p>
                <p className="text-xs text-yellow-500/80 mt-1">
                  This will process all expired tokens and return funds to the issuer. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <Card padding="md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">Total Clawed Back</p>
                <p className="text-lg font-bold text-white">
                  ₩{formatAmount(metrics?.totalClawback || 0)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">Total Burned</p>
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
              Process Clawback Now
            </Button>
          </div>

          <div className="pt-4 border-t border-surface-highlight">
            <h4 className="text-sm font-bold text-white mb-3">Clawback History</h4>
            <div className="space-y-2">
              <Card padding="sm">
                <p className="text-xs text-text-secondary text-center py-4">
                  No recent clawback operations
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
