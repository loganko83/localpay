import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input } from '../../components/common';
import { AuditLogEntry, AuditActionType } from '../../types';

// Mock audit log data
const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date().toISOString(),
    action: 'PAYMENT_COMPLETED',
    actorId: 'user-123',
    actorType: 'consumer',
    actorDid: 'did:xphere:user123',
    targetType: 'transaction',
    targetId: 'txn-456',
    description: 'Payment of 50,000 KRW completed at Jeonju Bibimbap',
    metadata: { merchantId: 'm1', amount: 50000 },
    blockchainHash: 'BC-a1b2c3d4e5f6',
    blockNumber: 12345678,
    transactionHash: '0xabc123...',
    signature: 'sig:user123:1234567890',
    signedBy: 'did:xphere:user123',
    verified: true,
    verifiedAt: new Date().toISOString(),
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    action: 'MERCHANT_VERIFIED',
    actorId: 'admin-001',
    actorType: 'admin',
    actorDid: 'did:xphere:admin001',
    targetType: 'merchant',
    targetId: 'm-789',
    description: 'Merchant "Jeonju Coffee" verified by administrator',
    previousState: { status: 'pending' },
    newState: { status: 'verified' },
    blockchainHash: 'BC-f6e5d4c3b2a1',
    blockNumber: 12345677,
    signature: 'sig:admin001:1234567891',
    signedBy: 'did:xphere:admin001',
    verified: true,
    verifiedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    action: 'POLICY_UPDATED',
    actorId: 'admin-002',
    actorType: 'admin',
    actorDid: 'did:xphere:admin002',
    targetType: 'policy',
    targetId: 'pol-001',
    description: 'Charge limit policy updated: daily limit changed from 500,000 to 1,000,000 KRW',
    previousState: { dailyLimit: 500000 },
    newState: { dailyLimit: 1000000 },
    blockchainHash: 'BC-123abc456def',
    blockNumber: 12345676,
    signature: 'sig:admin002:1234567892',
    signedBy: 'did:xphere:admin002',
    verified: true,
  },
  {
    id: 'audit-004',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    action: 'SECURITY_ALERT',
    actorId: 'system',
    actorType: 'admin',
    targetType: 'security',
    targetId: 'alert-001',
    description: 'Suspicious login attempt detected from unknown IP',
    metadata: { ipAddress: '192.168.1.100', attempts: 5 },
    blockchainHash: 'BC-sec789xyz',
    verified: true,
  },
  {
    id: 'audit-005',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'BALANCE_CHARGED',
    actorId: 'user-456',
    actorType: 'consumer',
    actorDid: 'did:xphere:user456',
    targetType: 'wallet',
    targetId: 'wallet-456',
    description: 'Balance charged: 100,000 KRW from linked bank account',
    metadata: { amount: 100000, bankCode: '004', method: 'bank_transfer' },
    blockchainHash: 'BC-charge123',
    blockNumber: 12345675,
    verified: true,
  },
  {
    id: 'audit-006',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'USER_KYC_VERIFIED',
    actorId: 'user-789',
    actorType: 'consumer',
    actorDid: 'did:xphere:user789',
    targetType: 'user',
    targetId: 'user-789',
    description: 'KYC verification completed via DID credential',
    metadata: { verificationMethod: 'DID_VC', credentialType: 'RESIDENT' },
    blockchainHash: 'BC-kyc456abc',
    blockNumber: 12345674,
    verified: false, // Pending verification
  },
];

const actionTypeLabels: Record<AuditActionType, string> = {
  USER_REGISTERED: 'User Registration',
  USER_KYC_VERIFIED: 'KYC Verification',
  BANK_ACCOUNT_LINKED: 'Bank Account Linked',
  PREPAID_CARD_ISSUED: 'Prepaid Card Issued',
  BALANCE_CHARGED: 'Balance Charge',
  PAYMENT_REQUESTED: 'Payment Request',
  PAYMENT_COMPLETED: 'Payment Complete',
  REFUND_REQUESTED: 'Refund Request',
  REFUND_COMPLETED: 'Refund Complete',
  MERCHANT_REGISTERED: 'Merchant Registration',
  MERCHANT_VERIFIED: 'Merchant Verification',
  MERCHANT_SUSPENDED: 'Merchant Suspended',
  POLICY_CREATED: 'Policy Created',
  POLICY_UPDATED: 'Policy Updated',
  VOUCHER_ISSUED: 'Voucher Issued',
  VOUCHER_REDEEMED: 'Voucher Redeemed',
  SETTLEMENT_INITIATED: 'Settlement Started',
  SETTLEMENT_COMPLETED: 'Settlement Complete',
  ADMIN_LOGIN: 'Admin Login',
  ADMIN_ACTION: 'Admin Action',
  SECURITY_ALERT: 'Security Alert',
};

const getActionIcon = (action: AuditActionType): string => {
  const iconMap: Record<string, string> = {
    USER_REGISTERED: 'person_add',
    USER_KYC_VERIFIED: 'verified_user',
    BANK_ACCOUNT_LINKED: 'account_balance',
    PREPAID_CARD_ISSUED: 'credit_card',
    BALANCE_CHARGED: 'add_card',
    PAYMENT_REQUESTED: 'pending',
    PAYMENT_COMPLETED: 'check_circle',
    REFUND_REQUESTED: 'undo',
    REFUND_COMPLETED: 'replay',
    MERCHANT_REGISTERED: 'storefront',
    MERCHANT_VERIFIED: 'verified',
    MERCHANT_SUSPENDED: 'block',
    POLICY_CREATED: 'add_circle',
    POLICY_UPDATED: 'edit',
    VOUCHER_ISSUED: 'confirmation_number',
    VOUCHER_REDEEMED: 'redeem',
    SETTLEMENT_INITIATED: 'schedule',
    SETTLEMENT_COMPLETED: 'task_alt',
    ADMIN_LOGIN: 'login',
    ADMIN_ACTION: 'admin_panel_settings',
    SECURITY_ALERT: 'warning',
  };
  return iconMap[action] || 'info';
};

const getActionColor = (action: AuditActionType): string => {
  if (action === 'SECURITY_ALERT') return 'bg-red-500/10 text-red-500';
  if (action.includes('COMPLETED') || action.includes('VERIFIED')) return 'bg-green-500/10 text-green-500';
  if (action.includes('SUSPENDED') || action.includes('REFUND')) return 'bg-yellow-500/10 text-yellow-500';
  return 'bg-primary/10 text-primary';
};

const AuditLogs: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Stats
  const totalLogs = logs.length;
  const verifiedLogs = logs.filter(l => l.verified).length;
  const securityAlerts = logs.filter(l => l.action === 'SECURITY_ALERT').length;
  const todayLogs = logs.filter(l => {
    const logDate = new Date(l.timestamp).toDateString();
    return logDate === new Date().toDateString();
  }).length;

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(query) ||
        log.actorId.toLowerCase().includes(query) ||
        log.targetId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  const truncateHash = (hash?: string) => {
    if (!hash) return '-';
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="Audit Logs & Blockchain Trail" />

      {/* Stats Overview */}
      <div className="px-4 mb-4">
        <Card variant="balance" padding="lg">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-text-secondary mb-1">Total Logs</p>
              <p className="text-xl font-bold text-white">{totalLogs.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Today</p>
              <p className="text-xl font-bold text-primary">{todayLogs}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Verified</p>
              <p className="text-xl font-bold text-green-500">{Math.round((verifiedLogs / totalLogs) * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Alerts</p>
              <p className="text-xl font-bold text-red-500">{securityAlerts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Blockchain Status */}
      <div className="px-4 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">token</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-500">Blockchain Connected</p>
            <p className="text-xs text-text-secondary">
              Xphere Network | Block #12,345,678 | All logs anchored
            </p>
          </div>
          <Badge variant="success" size="sm">Live</Badge>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 mb-4 space-y-3">
        <Input
          icon="search"
          placeholder="Search logs by description, actor, target..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'PAYMENT_COMPLETED', 'POLICY_UPDATED', 'MERCHANT_VERIFIED', 'SECURITY_ALERT', 'BALANCE_CHARGED'].map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterAction === action
                  ? 'bg-primary text-background'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
              }`}
            >
              {action === 'all' ? 'All' : actionTypeLabels[action as AuditActionType]}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Audit Trail</h3>
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-[16px] mr-1">download</span>
            Export
          </Button>
        </div>

        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card
              key={log.id}
              variant="transaction"
              padding="md"
              onClick={() => setSelectedLog(log)}
              className="cursor-pointer hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {getActionIcon(log.action)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white">
                      {actionTypeLabels[log.action]}
                    </p>
                    {log.verified ? (
                      <span className="material-symbols-outlined text-green-500 text-[14px]">verified</span>
                    ) : (
                      <span className="material-symbols-outlined text-yellow-500 text-[14px]">pending</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{log.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span>{formatTime(log.timestamp)}</span>
                    <span className="font-mono">{truncateHash(log.blockchainHash)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Modal (simplified) */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-surface w-full max-w-md rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Audit Log Detail</h3>
              <button onClick={() => setSelectedLog(null)} className="text-text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Action</p>
                <p className="text-sm font-bold text-white">{actionTypeLabels[selectedLog.action]}</p>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1">Description</p>
                <p className="text-sm text-white">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Actor ID</p>
                  <p className="text-sm text-white font-mono">{selectedLog.actorId}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Target ID</p>
                  <p className="text-sm text-white font-mono">{selectedLog.targetId}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1">Actor DID</p>
                <p className="text-sm text-white font-mono break-all">{selectedLog.actorDid || '-'}</p>
              </div>

              <div className="border-t border-surface-highlight pt-4">
                <p className="text-xs text-text-muted mb-2">Blockchain Anchoring</p>
                <div className="bg-surface-highlight rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Hash</span>
                    <span className="text-xs text-white font-mono">{selectedLog.blockchainHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Block</span>
                    <span className="text-xs text-white">#{selectedLog.blockNumber?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Verified</span>
                    <span className={`text-xs ${selectedLog.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                      {selectedLog.verified ? 'Yes' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLog.signature && (
                <div>
                  <p className="text-xs text-text-muted mb-1">Digital Signature</p>
                  <p className="text-xs text-white font-mono break-all bg-surface-highlight rounded p-2">
                    {selectedLog.signature}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" fullWidth onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
                <Button variant="primary" fullWidth>
                  <span className="material-symbols-outlined text-[16px] mr-1">verified</span>
                  Verify on Chain
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh FAB */}
      <button className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-background text-2xl">sync</span>
      </button>
    </div>
  );
};

export default AuditLogs;
