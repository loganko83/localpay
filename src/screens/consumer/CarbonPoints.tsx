import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  carbonPointsService,
  type CarbonAccount,
  type EcoActionType
} from '../../services/carbonPoints';

// Unified Dark Theme
const theme = {
  bg: '#111111',
  card: '#1a1a1a',
  cardHover: '#222222',
  border: '#2a2a2a',
  accent: '#ff4757',
  accentSoft: 'rgba(255,71,87,0.15)',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
};

const CarbonPoints: React.FC = () => {
  const navigate = useNavigate();
  const [account, setAccount] = useState<CarbonAccount | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  const [exchangePoints, setExchangePoints] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const userId = 'consumer-1';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const accountData = carbonPointsService.getAccount(userId);
    setAccount(accountData);
    const leaderboardData = carbonPointsService.getLeaderboard(10);
    setLeaderboard(leaderboardData);
    const actions = carbonPointsService.getAvailableActions();
    setAvailableActions(actions);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

  const formatCO2 = (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
    return `${Math.round(grams)}g`;
  };

  const getTreeEquivalent = () => {
    if (!account) return 0;
    return (account.totalCarbonReduced / 21000).toFixed(2);
  };

  const getLevelProgress = () => {
    if (!account) return 0;
    const carbon = account.totalCarbonReduced;
    if (account.level === 'SEED') return (carbon / 10000) * 100;
    if (account.level === 'SPROUT') return ((carbon - 10000) / 90000) * 100;
    if (account.level === 'TREE') return ((carbon - 100000) / 900000) * 100;
    return 100;
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = { SEED: '#facc15', SPROUT: '#4ade80', TREE: '#22c55e', FOREST: '#10b981' };
    return colors[level] || theme.text;
  };

  const getLevelIcon = (level: string) => {
    const icons: Record<string, string> = { SEED: 'spa', SPROUT: 'local_florist', TREE: 'park', FOREST: 'forest' };
    return icons[level] || 'eco';
  };

  const quickActions = [
    { type: 'TUMBLER_USE', icon: 'coffee', label: 'Tumbler', color: '#f59e0b' },
    { type: 'PUBLIC_TRANSPORT_BUS', icon: 'directions_bus', label: 'Transport', color: '#3b82f6' },
    { type: 'ELECTRONIC_RECEIPT', icon: 'receipt_long', label: 'E-Receipt', color: '#a855f7' },
    { type: 'RECYCLING_GENERAL', icon: 'recycling', label: 'Recycle', color: '#22c55e' },
  ];

  const handleQuickAction = async (actionType: string) => {
    const result = await carbonPointsService.recordAction({
      userId,
      actionType: actionType as EcoActionType,
      quantity: 1,
      verificationMethod: 'QR_SCAN',
    });
    if (result) {
      loadData();
      alert(`Earned ${result.pointsEarned} points! (${formatCO2(result.carbonReduced)} CO2 reduced)`);
    } else {
      alert('Daily or monthly limit reached');
    }
  };

  const handleExchange = async () => {
    const points = parseInt(exchangePoints);
    if (isNaN(points) || points <= 0) {
      alert('Please enter valid points amount');
      return;
    }
    setExchangeLoading(true);
    const result = await carbonPointsService.exchangeToLocalCurrency(userId, points);
    setExchangeLoading(false);
    if (result.success) {
      alert(`Exchanged ${points} points for ${formatNumber(result.krwAmount!)} KRW`);
      setExchangePoints('');
      setShowExchange(false);
      loadData();
    } else {
      alert(result.error || 'Exchange failed');
    }
  };

  const getCategoryColor = (type: string) => {
    if (type.includes('TRANSPORT') || type.includes('BUS') || type.includes('SUBWAY')) return '#3b82f6';
    if (type.includes('RECYCLING')) return '#22c55e';
    return '#a855f7';
  };

  const _getActionCategory = (type: string) => {
    if (type.includes('TRANSPORT') || type.includes('BUS') || type.includes('SUBWAY')) return 'Transportation';
    if (type.includes('RECYCLING')) return 'Recycling';
    return 'Shopping';
  };
  void _getActionCategory;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getCurrentUserRank = () => {
    const userRank = leaderboard.findIndex(u => u.userId === userId);
    return userRank !== -1 ? userRank + 1 : null;
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: theme.bg }}>
        <span className="material-symbols-outlined animate-spin text-4xl" style={{ color: theme.accent }}>progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between" style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Carbon Points</h1>
        <button onClick={() => alert('Carbon Points: Earn rewards for eco-friendly actions!')}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.textSecondary }}>info</span>
        </button>
      </header>

      {/* Level & Stats Card */}
      <div className="px-5 py-4">
        <div className="rounded-xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${getLevelColor(account.level)}20` }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: getLevelColor(account.level) }}>{getLevelIcon(account.level)}</span>
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textSecondary }}>Current Level</p>
                <h3 className="text-xl font-bold" style={{ color: getLevelColor(account.level) }}>{account.level}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: theme.textSecondary }}>Tree Equivalent</p>
              <p className="text-lg font-bold" style={{ color: theme.text }}>{getTreeEquivalent()} trees</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs" style={{ color: theme.textSecondary }}>Level Progress</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>{getLevelProgress().toFixed(0)}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(getLevelProgress(), 100)}%`, background: 'linear-gradient(to right, #4ade80, #10b981)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div>
              <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Total CO2 Reduced</p>
              <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{formatCO2(account.totalCarbonReduced)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Available Points</p>
              <p className="text-xl font-bold" style={{ color: theme.text }}>{formatNumber(account.availablePoints)} P</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>= {formatNumber(account.availablePoints * 10)} KRW</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-sm" style={{ color: '#facc15' }}>today</span>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Today's Points</p>
            </div>
            <p className="text-lg font-bold" style={{ color: theme.text }}>{formatNumber(account.todayPoints)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-sm" style={{ color: '#3b82f6' }}>calendar_month</span>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Monthly Points</p>
            </div>
            <p className="text-lg font-bold" style={{ color: theme.text }}>{formatNumber(account.monthlyPoints)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => {
            const actionData = availableActions.find(a => a.type === action.type);
            return (
              <button key={idx} onClick={() => handleQuickAction(action.type)} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: action.color }}>{action.icon}</span>
                </div>
                <span className="text-xs font-medium text-center" style={{ color: theme.textSecondary }}>{action.label}</span>
                {actionData && <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>+{actionData.pointsPerAction}P</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exchange Section */}
      <div className="px-5 mb-6">
        <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: theme.accent }}>currency_exchange</span>
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Exchange Points</h3>
            </div>
            <span className="text-xs px-2 py-1 rounded" style={{ background: theme.accentSoft, color: theme.accent }}>1P = 10 KRW</span>
          </div>

          {!showExchange ? (
            <button onClick={() => setShowExchange(true)} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: theme.accent }}>
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
              Exchange to KRW
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Enter points amount"
                value={exchangePoints}
                onChange={(e) => setExchangePoints(e.target.value)}
                className="w-full h-12 px-4 rounded-xl focus:outline-none"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
              {exchangePoints && !isNaN(parseInt(exchangePoints)) && (
                <div className="p-3 rounded-xl" style={{ background: theme.cardHover }}>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>You will receive:</p>
                  <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{formatNumber(parseInt(exchangePoints) * 10)} KRW</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowExchange(false); setExchangePoints(''); }} className="flex-1 py-3 rounded-xl font-medium" style={{ background: theme.cardHover, color: theme.text }}>Cancel</button>
                <button onClick={handleExchange} disabled={!exchangePoints || parseInt(exchangePoints) <= 0 || exchangeLoading} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: theme.accent, opacity: !exchangePoints || exchangeLoading ? 0.5 : 1 }}>
                  {exchangeLoading ? 'Processing...' : 'Exchange'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Leaderboard</h3>
          {getCurrentUserRank() && <span className="text-xs px-2 py-1 rounded" style={{ background: theme.accentSoft, color: theme.accent }}>Your Rank: #{getCurrentUserRank()}</span>}
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          {leaderboard.slice(0, 5).map((user, index) => {
            const isCurrentUser = user.userId === userId;
            return (
              <div key={user.userId} className="p-4 flex items-center justify-between" style={{ borderBottom: index < 4 ? `1px solid ${theme.border}` : 'none', background: isCurrentUser ? theme.accentSoft : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{ background: index === 0 ? '#facc1520' : index === 1 ? '#94a3b820' : index === 2 ? '#f9731620' : theme.cardHover, color: index === 0 ? '#facc15' : index === 1 ? '#94a3b8' : index === 2 ? '#f97316' : theme.textSecondary }}>
                    {user.rank}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isCurrentUser ? theme.accent : theme.text }}>{isCurrentUser ? 'You' : `User ${user.userId.slice(-4)}`}</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>Level: {user.level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: theme.text }}>{formatCO2(user.totalCarbonReduced)}</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>CO2 reduced</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Actions */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Recent Actions</h3>
        {account.actions.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <span className="material-symbols-outlined text-5xl mb-2" style={{ color: theme.textSecondary }}>eco</span>
            <p style={{ color: theme.textSecondary }}>No eco actions yet</p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Start recording your green activities!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {account.actions.slice(0, 5).reverse().map((action) => (
              <div key={action.id} className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${getCategoryColor(action.actionType)}20` }}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: getCategoryColor(action.actionType) }}>eco</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{availableActions.find(a => a.type === action.actionType)?.description || action.actionType}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{formatTimestamp(action.timestamp)}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: action.status === 'VERIFIED' ? '#22c55e20' : theme.cardHover, color: action.status === 'VERIFIED' ? '#22c55e' : theme.textSecondary }}>{action.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#22c55e' }}>+{action.pointsEarned}P</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>{formatCO2(action.carbonReduced)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonPoints;
