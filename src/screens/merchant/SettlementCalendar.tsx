import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/common';

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
      case 'settled': return 'bg-primary/20 text-primary border-primary/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'scheduled': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
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
          className={`
            aspect-square p-1 flex flex-col items-center justify-center rounded-lg
            ${isToday ? 'bg-surface-highlight border border-primary/30' : ''}
            ${settlement ? 'cursor-pointer hover:bg-surface-highlight transition-colors' : ''}
          `}
        >
          <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-white'}`}>
            {day}
          </div>
          {settlement && (
            <div className={`mt-1 w-full text-center`}>
              <div className={`text-[8px] font-bold px-1 py-0.5 rounded ${getStatusColor(settlement.status)} border`}>
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
    <div className="flex flex-col pb-4 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-surface flex items-center justify-center hover:bg-surface-highlight transition-colors"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Settlement Calendar</h1>
              <p className="text-xs text-text-secondary">Track your settlement schedule</p>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-surface transition-colors">
            <span className="material-symbols-outlined text-primary">calendar_today</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 pt-6 pb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">This Month</span>
            <span className="text-sm font-bold text-white">₩{formatAmount(thisMonthTotal)}</span>
            <div className="flex items-center gap-0.5 text-primary">
              <span className="material-symbols-outlined text-[10px]">trending_up</span>
              <span className="text-[9px] font-medium">+8.2%</span>
            </div>
          </Card>

          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">Pending</span>
            <span className="text-sm font-bold text-yellow-500">₩{formatAmount(pendingAmount)}</span>
            <span className="text-[9px] text-text-muted">{currentMonthSettlements.filter(s => s.status === 'pending').length} items</span>
          </Card>

          <Card padding="md" className="flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">Next</span>
            <span className="text-sm font-bold text-blue-500">
              {nextSettlement ? nextSettlement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </span>
            <span className="text-[9px] text-text-muted">
              {nextSettlement ? `${Math.ceil((nextSettlement.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days` : 'No schedule'}
            </span>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Badge variant="success" size="sm">Settled</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="warning" size="sm">Pending</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="info" size="sm">Scheduled</Badge>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="px-4 pb-4">
        <Card padding="none">
          <div className="flex items-center justify-between p-4 border-b border-surface-highlight">
            <button
              onClick={() => changeMonth('prev')}
              className="h-8 w-8 rounded-full bg-surface-highlight flex items-center justify-center hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[20px]">chevron_left</span>
            </button>
            <h2 className="text-base font-bold text-white">{getMonthName(currentDate)}</h2>
            <button
              onClick={() => changeMonth('next')}
              className="h-8 w-8 rounded-full bg-surface-highlight flex items-center justify-center hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-[10px] text-text-secondary text-center font-medium py-1">
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
          <h3 className="text-sm font-bold text-white">Recent Settlements</h3>
          <span className="text-xs text-text-secondary">{recentSettlements.length} items</span>
        </div>

        <div className="space-y-3">
          {recentSettlements.map((settlement) => (
            <Card key={settlement.id} padding="md" className="hover:bg-surface-highlight transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">
                      {settlement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Badge variant={settlement.status === 'settled' ? 'success' : settlement.status === 'pending' ? 'warning' : 'info'} size="sm">
                      {settlement.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{settlement.transactionCount} transactions</span>
                    <span>•</span>
                    <span>ID: {settlement.id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">₩{formatAmount(settlement.amount)}</span>
                </div>
              </div>

              {/* Blockchain Verification */}
              {settlement.blockchainHash && (
                <div className="pt-3 border-t border-surface-highlight">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px] filled">verified</span>
                      <div>
                        <p className="text-xs font-medium text-white">Blockchain Verified</p>
                        <p className="text-[10px] text-text-secondary font-mono">{settlement.blockchainHash}</p>
                      </div>
                    </div>
                    <button className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1">
                      <span>View</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </button>
                  </div>
                </div>
              )}

              {settlement.status === 'pending' && (
                <div className="pt-3 border-t border-surface-highlight">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-500 text-[16px]">pending</span>
                    <div>
                      <p className="text-xs font-medium text-yellow-500">Processing Settlement</p>
                      <p className="text-[10px] text-text-secondary">Expected completion in 1-2 business days</p>
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
          Export Settlement Report
        </Button>
      </div>
    </div>
  );
};

export default SettlementCalendar;
