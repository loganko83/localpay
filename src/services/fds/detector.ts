/**
 * Fraud Detection System (FDS) - Anomaly Detection Engine
 * Detects suspicious patterns in local currency transactions
 */

export interface FDSAlert {
  id: string;
  type: FDSAlertType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  subjectType: 'user' | 'merchant' | 'transaction';
  subjectId: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
  status: 'new' | 'investigating' | 'confirmed' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  blockchainRef?: string;
}

export type FDSAlertType =
  | 'velocity_spike'
  | 'phantom_merchant'
  | 'unusual_pattern'
  | 'high_value_tx'
  | 'geographic_anomaly'
  | 'time_anomaly'
  | 'split_transaction'
  | 'circular_flow'
  | 'dormant_activation'
  | 'qr_duplicate';

export interface TransactionPattern {
  merchantId: string;
  userId: string;
  amount: number;
  timestamp: Date;
  location: { lat: number; lng: number };
  category: string;
  txHash?: string;
}

export interface RiskScore {
  entityId: string;
  entityType: 'user' | 'merchant';
  score: number; // 0-100
  factors: RiskFactor[];
  lastUpdated: Date;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

// Detection thresholds
const THRESHOLDS = {
  HIGH_VALUE_TX: 5000000, // 5M KRW
  VELOCITY_COUNT: 10, // transactions per hour
  VELOCITY_AMOUNT: 10000000, // 10M KRW per hour
  SPLIT_TX_WINDOW: 300000, // 5 minutes
  SPLIT_TX_COUNT: 5,
  GEOGRAPHIC_DISTANCE: 50, // km in short time
  DORMANT_DAYS: 90,
  CIRCULAR_FLOW_DEPTH: 3,
};

// Mock data for demonstration
const mockAlerts: FDSAlert[] = [
  {
    id: 'FDS-001',
    type: 'velocity_spike',
    severity: 'critical',
    subjectType: 'merchant',
    subjectId: 'M-8842',
    title: 'Abnormal Transaction Velocity',
    description: 'Merchant processed 47 transactions in 1 hour (avg: 8/hour)',
    details: {
      currentRate: 47,
      averageRate: 8,
      totalAmount: 23500000,
      timeWindow: '14:00-15:00',
    },
    status: 'new',
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 900000),
  },
  {
    id: 'FDS-002',
    type: 'phantom_merchant',
    severity: 'high',
    subjectType: 'merchant',
    subjectId: 'M-9921',
    title: 'Suspected Phantom Merchant',
    description: 'New merchant with high volume but no physical verification',
    details: {
      registrationDate: '2024-12-20',
      totalTransactions: 156,
      totalVolume: 78000000,
      verificationStatus: 'pending',
      physicalInspection: false,
    },
    status: 'investigating',
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 1800000),
    assignedTo: 'admin-002',
  },
  {
    id: 'FDS-003',
    type: 'split_transaction',
    severity: 'medium',
    subjectType: 'user',
    subjectId: 'U-44521',
    title: 'Transaction Splitting Pattern',
    description: 'Multiple small transactions to same merchant within 5 minutes',
    details: {
      transactionCount: 8,
      totalAmount: 4800000,
      averageAmount: 600000,
      merchantId: 'M-2234',
      timeSpan: '4 minutes',
    },
    status: 'new',
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    id: 'FDS-004',
    type: 'geographic_anomaly',
    severity: 'medium',
    subjectType: 'user',
    subjectId: 'U-33109',
    title: 'Impossible Travel Pattern',
    description: 'Transactions in Busan and Seoul within 30 minutes',
    details: {
      location1: 'Busan Haeundae',
      location2: 'Seoul Gangnam',
      distance: 325,
      timeDiff: 28,
    },
    status: 'new',
    createdAt: new Date(Date.now() - 10800000),
    updatedAt: new Date(Date.now() - 10800000),
  },
  {
    id: 'FDS-005',
    type: 'circular_flow',
    severity: 'high',
    subjectType: 'merchant',
    subjectId: 'M-5567',
    title: 'Circular Money Flow Detected',
    description: 'Funds cycling between 4 related accounts',
    details: {
      accountChain: ['M-5567', 'U-12234', 'M-5568', 'U-12235', 'M-5567'],
      totalAmount: 15000000,
      cycleCount: 3,
    },
    status: 'investigating',
    createdAt: new Date(Date.now() - 14400000),
    updatedAt: new Date(Date.now() - 7200000),
    assignedTo: 'admin-001',
  },
  {
    id: 'FDS-006',
    type: 'qr_duplicate',
    severity: 'critical',
    subjectType: 'merchant',
    subjectId: 'M-7789',
    title: 'Duplicate QR Code Usage',
    description: 'Same QR code scanned from different locations simultaneously',
    details: {
      qrCodeId: 'QR-2024122800145',
      locations: ['Seomyeon', 'Sasang'],
      timeGap: '2 seconds',
    },
    status: 'new',
    createdAt: new Date(Date.now() - 1200000),
    updatedAt: new Date(Date.now() - 1200000),
  },
];

const mockRiskScores: RiskScore[] = [
  {
    entityId: 'M-8842',
    entityType: 'merchant',
    score: 85,
    factors: [
      { name: 'Transaction Velocity', weight: 0.3, value: 95, description: 'Abnormally high tx rate' },
      { name: 'New Account', weight: 0.2, value: 70, description: 'Account age < 30 days' },
      { name: 'Category Risk', weight: 0.15, value: 80, description: 'High-risk merchant category' },
      { name: 'Verification Status', weight: 0.2, value: 90, description: 'Incomplete verification' },
      { name: 'Geographic Pattern', weight: 0.15, value: 60, description: 'Normal location pattern' },
    ],
    lastUpdated: new Date(),
  },
  {
    entityId: 'M-9921',
    entityType: 'merchant',
    score: 78,
    factors: [
      { name: 'Transaction Velocity', weight: 0.3, value: 70, description: 'Above average tx rate' },
      { name: 'New Account', weight: 0.2, value: 95, description: 'Account age < 7 days' },
      { name: 'Category Risk', weight: 0.15, value: 50, description: 'Normal merchant category' },
      { name: 'Verification Status', weight: 0.2, value: 100, description: 'No physical verification' },
      { name: 'Geographic Pattern', weight: 0.15, value: 40, description: 'Normal location pattern' },
    ],
    lastUpdated: new Date(),
  },
];

/**
 * Get all FDS alerts with optional filtering
 */
export function getAlerts(filters?: {
  status?: FDSAlert['status'];
  severity?: FDSAlert['severity'];
  type?: FDSAlertType;
  limit?: number;
}): FDSAlert[] {
  let filtered = [...mockAlerts];

  if (filters?.status) {
    filtered = filtered.filter(a => a.status === filters.status);
  }
  if (filters?.severity) {
    filtered = filtered.filter(a => a.severity === filters.severity);
  }
  if (filters?.type) {
    filtered = filtered.filter(a => a.type === filters.type);
  }

  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  total: number;
  byStatus: Record<FDSAlert['status'], number>;
  bySeverity: Record<FDSAlert['severity'], number>;
  byType: Partial<Record<FDSAlertType, number>>;
} {
  const alerts = mockAlerts;

  const byStatus = {
    new: alerts.filter(a => a.status === 'new').length,
    investigating: alerts.filter(a => a.status === 'investigating').length,
    confirmed: alerts.filter(a => a.status === 'confirmed').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length,
  };

  const bySeverity = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  const byType: Partial<Record<FDSAlertType, number>> = {};
  alerts.forEach(a => {
    byType[a.type] = (byType[a.type] || 0) + 1;
  });

  return {
    total: alerts.length,
    byStatus,
    bySeverity,
    byType,
  };
}

/**
 * Get risk score for an entity
 */
export function getRiskScore(entityId: string): RiskScore | undefined {
  return mockRiskScores.find(r => r.entityId === entityId);
}

/**
 * Get high-risk entities
 */
export function getHighRiskEntities(threshold: number = 70): RiskScore[] {
  return mockRiskScores.filter(r => r.score >= threshold).sort((a, b) => b.score - a.score);
}

/**
 * Update alert status
 */
export function updateAlertStatus(
  alertId: string,
  status: FDSAlert['status'],
  assignedTo?: string
): FDSAlert | undefined {
  const alert = mockAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = status;
    alert.updatedAt = new Date();
    if (assignedTo) {
      alert.assignedTo = assignedTo;
    }
  }
  return alert;
}

/**
 * Analyze transaction for anomalies
 */
export function analyzeTransaction(tx: TransactionPattern): FDSAlertType[] {
  const anomalies: FDSAlertType[] = [];

  // High value check
  if (tx.amount >= THRESHOLDS.HIGH_VALUE_TX) {
    anomalies.push('high_value_tx');
  }

  return anomalies;
}

/**
 * Get detection thresholds (for configuration display)
 */
export function getThresholds(): typeof THRESHOLDS {
  return { ...THRESHOLDS };
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: FDSAlert['severity']): string {
  switch (severity) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#6b7280';
  }
}

/**
 * Get alert type label
 */
export function getAlertTypeLabel(type: FDSAlertType): string {
  const labels: Record<FDSAlertType, string> = {
    velocity_spike: 'Velocity Spike',
    phantom_merchant: 'Phantom Merchant',
    unusual_pattern: 'Unusual Pattern',
    high_value_tx: 'High Value Transaction',
    geographic_anomaly: 'Geographic Anomaly',
    time_anomaly: 'Time Anomaly',
    split_transaction: 'Split Transaction',
    circular_flow: 'Circular Flow',
    dormant_activation: 'Dormant Activation',
    qr_duplicate: 'QR Duplicate',
  };
  return labels[type] || type;
}
