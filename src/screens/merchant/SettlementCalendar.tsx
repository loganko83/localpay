import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/common';

import { theme } from '../../styles/theme';

interface Settlement {
  id: string;
  date: Date;
  amount: number;
  status: 'settled' | 'pending' | 'scheduled';
  transactionCount: number;
  blockchainHash?: string;
  blockchainVerified?: boolean;
}

const mockSettlements: Settlement[] = [
  { id: 'S001', date: new Date(2025, 11, 20), amount: 4580000, status: 'settled', transactionCount: 87, blockchainHash: '0x7a9b...3c4d', blockchainVerified: true },
  { id: 'S002', date: new Date(2025, 11, 15), amount: 3920000, status: 'settled', transactionCount: 72, blockchainHash: '0x4f2e...8b1a', blockchainVerified: true },
  { id: 'S003', date: new Date(2025, 11, 10), amount: 5240000, status: 'settled', transactionCount: 95, blockchainHash: '0x1d5c...9e7f', blockchainVerified: true },
  { id: 'S004', date: new Date(2025, 11, 5), amount: 4120000, status: 'settled', transactionCount: 68, blockchainHash: '0x8c3a...2b6d', blockchainVerified: true },
  { id: 'S005', date: new Date(2025, 11, 23), amount: 2850000, status: 'pending', transactionCount: 54, blockchainHash: undefined, blockchainVerified: false },
  { id: 'S006', date: new Date(2025, 11, 25), amount: 3100000, status: 'scheduled', transactionCount: 0, blockchainHash: undefined, blockchainVerified: false },
  { id: 'S007', date: new Date(2025, 11, 30), amount: 0, status: 'scheduled', transactionCount: 0, blockchainHash: undefined, blockchainVerified: false },
  { id: 'S008', date: new Date(2025, 10, 25), amount: 4750000, status: 'settled', transactionCount: 89, blockchainHash: '0x3e8f...5a2c', blockchainVerified: true },
  { id: 'S009', date: new Date(2025, 10, 20), amount: 3650000, status: 'settled', transactionCount: 71, blockchainHash: '0x6b9d...4c1e', blockchainVerified: true },
  { id: 'S010', date: new Date(2025, 10, 15), amount: 5120000, status: 'settled', transactionCount: 98, blockchainHash: '0x2a7c...8d3f', blockchainVerified: true },
  { id: 'S011', date: new Date(2025, 10, 10), amount: 4280000, status: 'settled', transactionCount: 76, blockchainHash: '0x9f1b...6e4a', blockchainVerified: true },
  { id: 'S012', date: new Date(2025, 10, 5), amount: 3980000, status: 'settled', transactionCount: 82, blockchainHash: '0x5d2e...1c7b', blockchainVerified: true },
  { id: 'S013', date: new Date(2025, 9, 25), amount: 4420000, status: 'settled', transactionCount: 85, blockchainHash: '0x7c4a...9f2d', blockchainVerified: true },
  { id: 'S014', date: new Date(2025, 9, 20), amount: 3750000, status: 'settled', transactionCount: 69, blockchainHash: '0x1e8b...3a5c', blockchainVerified: true },
  { id: 'S015', date: new Date(2025, 9, 15), amount: 5080000, status: 'settled', transactionCount: 92, blockchainHash: '0x4b6d...7e1f', blockchainVerified: true },
  { id: 'S016', date: new Date(2025, 9, 10), amount: 3920000, status: 'settled', transactionCount: 74, blockchainHash: '0x8a3c...2d9e', blockchainVerified: true },
  { id: 'S017', date: new Date(2025, 9, 5), amount: 4580000, status: 'settled', transactionCount: 88, blockchainHash: '0x6e2f...5b4a', blockchainVerified: true },
];

const SettlementCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1));

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1));
  };

  const getSettlementForDate = (day: number): Settlement | undefined => {
    return mockSettlements.find(s => {
      const settleDate = s.date;
      return settleDate.getDate() === day &&
        settleDate.getMonth() === currentDate.getMonth() &&
        settleDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getStatusColor = (status: 'settled' | 'pending' | 'scheduled') => {
    switch (status) {
      case 'settled': return {
        backgroundColor: theme.accentSoft,
        color: theme.accent,
        borderColor: theme.accent + '4D'
      };
      case 'pending': return {
        backgroundColor: 'rgba(234,179,8,0.15)',
        color: '#eab308',
        borderColor: 'rgba(234,179,8,0.3)'
      };
      case 'scheduled': return {
        backgroundColor: 'rgba(59,130,246,0.15)',
        color: '#3b82f6',
        borderColor: 'rgba(59,130,246,0.3)'
      };
    }
  };

  const currentMonthSettlements = mockSettlements.filter(s =>
    s.date.getMonth() === currentDate.getMonth() &&
    s.date.getFullYear() === currentDate.getFullYear()
  );

  const thisMonthTotal = currentMonthSettlements
    .filter(s => s.status === 'settled')
    .reduce((sum, s) => sum + s.amount, 0);

  const pendingAmount = currentMonthSettlements
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);

  const nextSettlement = mockSettlements
    .filter(s => s.status === 'scheduled' && s.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const recentSettlements = mockSettlements
    .filter(s => s.status === 'settled')
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const settlement = getSettlementForDate(day);
      const isToday = day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className="aspect-square p-1 flex flex-col items-center justify-center rounded-lg"
          style={{
            backgroundColor: isToday ? theme.cardHover : 'transparent',
            border: isToday ? `1px solid ${theme.accent}4D` : 'none',
            cursor: settlement ? 'pointer' : 'default',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (settlement) {
              e.currentTarget.style.backgroundColor = theme.cardHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isToday && settlement) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div
            className="text-xs font-medium"
            style={{ color: isToday ? theme.accent : theme.text }}
          >
            {day}
          </div>
          {settlement && (
            <div className="mt-1 w-full text-center">
              <div
                className="text-[8px] font-bold px-1 py-0.5 rounded border"
                style={getStatusColor(settlement.status)}
              >
                {settlement.amount > 0 ? `₩${(settlement.amount / 10000).toFixed(0)}만` : 'TBD'}
              </div>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col pb-4 min-h-screen" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4"
        style={{
          backgroundColor: theme.bg + 'CC',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.border}`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: theme.card }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.cardHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.card}
            >
              <span className="material-symbols-outlined" style={{ color: theme.text }}>arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: theme.text }}>정산 일정</h1>
              <p className="text-xs" style={{ color: theme.textSecondary }}>정산 스케줄 확인</p>
            </div>
          </div>
          <button
            className="p-2 rounded-full transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.card}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ color: theme.accent }}>calendar_today</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 pt-6 pb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px]" style={{ color: theme.textSecondary }}>이번 달</span>
            <span className="text-sm font-bold" style={{ color: theme.text }}>₩{formatAmount(thisMonthTotal)}</span>
            <div className="flex items-center gap-0.5" style={{ color: theme.accent }}>
              <span className="material-symbols-outlined text-[10px]">trending_up</span>
              <span className="text-[9px] font-medium">+8.2%</span>
            </div>
          </Card>

          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px]" style={{ color: theme.textSecondary }}>대기 중</span>
            <span className="text-sm font-bold" style={{ color: '#eab308' }}>₩{formatAmount(pendingAmount)}</span>
            <span className="text-[9px]" style={{ color: theme.textMuted }}>{currentMonthSettlements.filter(s => s.status === 'pending').length}건</span>
          </Card>

          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px]" style={{ color: theme.textSecondary }}>다음</span>
            <span className="text-sm font-bold" style={{ color: '#3b82f6' }}>
              {nextSettlement ? nextSettlement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </span>
            <span className="text-[9px]" style={{ color: theme.textMuted }}>
              {nextSettlement ? `${Math.ceil((nextSettlement.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 후` : '일정 없음'}
            </span>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Badge variant="success" size="sm">정산 완료</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="warning" size="sm">대기 중</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="info" size="sm">예정</Badge>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="px-4 pb-4">
        <Card padding="none">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <button
              onClick={() => changeMonth('prev')}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: theme.cardHover }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.border}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.cardHover}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: theme.text }}>chevron_left</span>
            </button>
            <h2 className="text-base font-bold" style={{ color: theme.text }}>{getMonthName(currentDate)}</h2>
            <button
              onClick={() => changeMonth('next')}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: theme.cardHover }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.border}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.cardHover}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: theme.text }}>chevron_right</span>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-[10px] text-center font-medium py-1" style={{ color: theme.textSecondary }}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Settlements */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>최근 정산</h3>
          <span className="text-xs" style={{ color: theme.textSecondary }}>{recentSettlements.length}건</span>
        </div>

        <div className="space-y-3">
          {recentSettlements.map((settlement) => (
            <Card key={settlement.id} padding="md" className="transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      {settlement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Badge variant={settlement.status === 'settled' ? 'success' : settlement.status === 'pending' ? 'warning' : 'info'} size="sm">
                      {settlement.status === 'settled' ? '완료' : settlement.status === 'pending' ? '대기 중' : '예정'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: theme.textSecondary }}>
                    <span>{settlement.transactionCount}건 거래</span>
                    <span>•</span>
                    <span>ID: {settlement.id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold" style={{ color: theme.accent }}>₩{formatAmount(settlement.amount)}</span>
                </div>
              </div>

              {/* Blockchain Verification */}
              {settlement.blockchainHash && (
                <div className="pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] filled" style={{ color: theme.accent }}>verified</span>
                      <div>
                        <p className="text-xs font-medium" style={{ color: theme.text }}>블록체인 검증됨</p>
                        <p className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{settlement.blockchainHash}</p>
                      </div>
                    </div>
                    <button
                      className="text-xs flex items-center gap-1 transition-colors"
                      style={{ color: theme.accent }}
                      onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
                      onMouseLeave={(e) => e.currentTarget.style.color = theme.accent}
                    >
                      <span>보기</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </button>
                  </div>
                </div>
              )}

              {settlement.status === 'pending' && (
                <div className="pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]" style={{ color: '#eab308' }}>pending</span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#eab308' }}>정산 처리 중</p>
                      <p className="text-[10px]" style={{ color: theme.textSecondary }}>1-2 영업일 내 완료 예정</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div className="px-4 pt-6 pb-2">
        <Button variant="secondary" fullWidth>
          <span className="material-symbols-outlined text-[20px]">download</span>
          정산 리포트 내보내기
        </Button>
      </div>
    </div>
  );
};

export default SettlementCalendar;
