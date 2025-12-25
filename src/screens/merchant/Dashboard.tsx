import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Card, Button } from '../../components/common';
import { useWalletStore, useTransactionStore } from '../../store';

const salesData = [
  { name: 'Mon', value: 400000 },
  { name: 'Tue', value: 300000 },
  { name: 'Wed', value: 550000 },
  { name: 'Thu', value: 450000 },
  { name: 'Fri', value: 680000 },
  { name: 'Sat', value: 850000 },
  { name: 'Sun', value: 720000 },
];

const quickActions = [
  { icon: 'qr_code_2', label: 'Receive', color: 'text-primary' },
  { icon: 'history', label: 'History', color: 'text-white' },
  { icon: 'group', label: 'Staff', color: 'text-white' },
  { icon: 'analytics', label: 'Reports', color: 'text-white' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { transactions } = useTransactionStore();

  const recentTransactions = transactions.slice(0, 3);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const todaySales = 850000;
  const txCount = 45;
  const avgTicket = Math.floor(todaySales / txCount);

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-surface">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-highlight border border-surface flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-primary">storefront</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Jeonju Store #42</h2>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-[14px] filled">verified</span>
              <span className="text-xs text-text-secondary">Verified Merchant</span>
            </div>
          </div>
        </div>
        <button className="relative p-2 rounded-full hover:bg-surface transition-colors">
          <span className="material-symbols-outlined text-white">notifications</span>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-background" />
        </button>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">
          Good morning,<br />
          <span className="text-text-secondary font-normal">Check your earnings today.</span>
        </h1>
      </div>

      {/* Balance Card */}
      <div className="px-4 mb-6">
        <Card variant="balance" padding="lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-text-secondary font-medium mb-1">Total Balance</p>
              <h2 className="text-3xl font-bold text-white">
                ₩ {formatAmount(wallet?.balance || 0)}
              </h2>
              <div className="flex items-center gap-1 mt-1 text-primary">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span className="text-xs font-bold">+12% from yesterday</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined filled">account_balance_wallet</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" className="flex-1">
              <span className="material-symbols-outlined text-[20px] mr-1">currency_exchange</span>
              Exchange
            </Button>
            <Button variant="secondary" className="flex-1">
              <span className="material-symbols-outlined text-[20px] mr-1">arrow_outward</span>
              Withdraw
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action.label === 'Receive') navigate('/merchant/scan');
                else if (action.label === 'History') navigate('/merchant/payments');
                else if (action.label === 'Staff') navigate('/merchant/employees');
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-surface border border-surface-highlight flex items-center justify-center group-active:scale-95 transition-all">
                <span className={`material-symbols-outlined text-2xl ${action.color}`}>
                  {action.icon}
                </span>
              </div>
              <span className="text-xs text-text-secondary font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 w-max">
          <div className="w-36 p-4 rounded-xl bg-surface border border-surface-highlight flex flex-col gap-2">
            <span className="text-xs text-text-secondary">Today's Sales</span>
            <span className="text-lg font-bold text-white">₩{formatAmount(todaySales)}</span>
            <span className="text-xs text-primary flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">arrow_upward</span> 12%
            </span>
          </div>
          <div className="w-36 p-4 rounded-xl bg-surface border border-surface-highlight flex flex-col gap-2">
            <span className="text-xs text-text-secondary">Transactions</span>
            <span className="text-lg font-bold text-white">{txCount}</span>
            <span className="text-xs text-primary flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">arrow_upward</span> 5%
            </span>
          </div>
          <div className="w-36 p-4 rounded-xl bg-surface border border-surface-highlight flex flex-col gap-2">
            <span className="text-xs text-text-secondary">Avg Ticket</span>
            <span className="text-lg font-bold text-white">₩{formatAmount(avgTicket)}</span>
            <span className="text-xs text-text-muted flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">remove</span> 0%
            </span>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="px-4 mb-6">
        <Card padding="lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Sales Trend</h3>
              <p className="text-xs text-text-secondary">Last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">₩5,200,000</p>
              <p className="text-xs text-primary">+8.5%</p>
            </div>
          </div>
          <div className="h-40 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#2a3830', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => value != null ? [`₩${formatAmount(value as number)}`, 'Sales'] : ['', '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#13ec5b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
          <button
            onClick={() => navigate('/merchant/payments')}
            className="text-xs text-primary font-medium hover:text-white transition-colors"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <Card key={tx.id} variant="transaction" padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center text-text-secondary">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">{tx.customerName || 'Customer'}</span>
                    <p className="text-xs text-text-secondary">
                      {new Date(tx.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${tx.type === 'refund' ? 'text-red-500' : 'text-primary'}`}>
                    {tx.type === 'refund' ? '- ' : '+ '}{formatAmount(tx.amount)} B
                  </span>
                  <p className="text-[10px] text-text-secondary">
                    {tx.type === 'payment' ? 'Payment' : 'Refund'} • {tx.status}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
