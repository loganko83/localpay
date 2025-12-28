/**
 * AML (Anti-Money Laundering) Screening Service
 * Comprehensive AML compliance monitoring and reporting
 */

export interface AMLCase {
  id: string;
  type: AMLCaseType;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  subjectType: 'user' | 'merchant';
  subjectId: string;
  subjectName: string;
  status: 'pending_review' | 'under_investigation' | 'escalated' | 'cleared' | 'reported';
  amount: number;
  currency: string;
  description: string;
  flags: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  reportId?: string;
}

export type AMLCaseType =
  | 'ctr' // Cash Transaction Report (10M+ KRW)
  | 'str' // Suspicious Transaction Report
  | 'pep' // Politically Exposed Person
  | 'sanctions' // Sanctions screening hit
  | 'unusual_pattern' // Unusual transaction pattern
  | 'structuring' // Transaction structuring
  | 'layering' // Money layering
  | 'high_risk_country' // Transaction with high-risk jurisdiction
  | 'kyc_incomplete' // KYC not completed
  | 'edd_required'; // Enhanced Due Diligence required

export interface RegulatoryReport {
  id: string;
  type: 'CTR' | 'STR';
  caseId: string;
  subjectId: string;
  subjectName: string;
  amount: number;
  submittedAt: Date;
  status: 'draft' | 'submitted' | 'acknowledged' | 'rejected';
  kofiu_reference?: string;
}

export interface ComplianceMetrics {
  totalCases: number;
  pendingReview: number;
  underInvestigation: number;
  escalated: number;
  cleared: number;
  reported: number;
  ctrCount: number;
  strCount: number;
  avgResolutionTime: number; // in hours
  complianceRate: number; // percentage
}

// Thresholds per Korean AML regulations
export const AML_THRESHOLDS = {
  CTR_THRESHOLD: 10000000, // 10M KRW - Cash Transaction Report threshold
  HIGH_VALUE_THRESHOLD: 50000000, // 50M KRW - Additional scrutiny
  DAILY_LIMIT: 100000000, // 100M KRW - Daily transaction limit
  STRUCTURING_WINDOW: 86400000, // 24 hours
  STRUCTURING_COUNT: 5, // Number of transactions
};

// Mock data for demonstration
const mockCases: AMLCase[] = [
  {
    id: 'AML-001',
    type: 'ctr',
    riskLevel: 'medium',
    subjectType: 'user',
    subjectId: 'U-44521',
    subjectName: 'Kim Minjun',
    status: 'pending_review',
    amount: 15000000,
    currency: 'KRW',
    description: 'Cash transaction exceeding 10M KRW threshold',
    flags: ['CTR Required', 'First Large Transaction'],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'AML-002',
    type: 'str',
    riskLevel: 'high',
    subjectType: 'merchant',
    subjectId: 'M-8842',
    subjectName: 'Seomyeon Electronics',
    status: 'under_investigation',
    amount: 78500000,
    currency: 'KRW',
    description: 'Unusual spike in transaction volume - 5x normal daily average',
    flags: ['Velocity Anomaly', 'New Merchant', 'High Volume'],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 7200000),
    assignedTo: 'admin-001',
  },
  {
    id: 'AML-003',
    type: 'structuring',
    riskLevel: 'critical',
    subjectType: 'user',
    subjectId: 'U-33109',
    subjectName: 'Park Jihye',
    status: 'escalated',
    amount: 48000000,
    currency: 'KRW',
    description: 'Multiple transactions just below CTR threshold within 24 hours',
    flags: ['Structuring Pattern', 'CTR Avoidance', 'Multiple Accounts'],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 43200000),
    assignedTo: 'admin-002',
  },
  {
    id: 'AML-004',
    type: 'pep',
    riskLevel: 'high',
    subjectType: 'user',
    subjectId: 'U-12234',
    subjectName: 'Lee Dongwook',
    status: 'under_investigation',
    amount: 25000000,
    currency: 'KRW',
    description: 'Transaction from Politically Exposed Person - enhanced scrutiny required',
    flags: ['PEP Match', 'Government Official', 'EDD Required'],
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(Date.now() - 86400000),
    assignedTo: 'admin-001',
  },
  {
    id: 'AML-005',
    type: 'kyc_incomplete',
    riskLevel: 'medium',
    subjectType: 'merchant',
    subjectId: 'M-9921',
    subjectName: 'Haeundae Seafood',
    status: 'pending_review',
    amount: 0,
    currency: 'KRW',
    description: 'Business verification documents pending for 30+ days',
    flags: ['KYC Pending', 'Document Missing', 'Physical Verification Required'],
    createdAt: new Date(Date.now() - 2592000000),
    updatedAt: new Date(Date.now() - 604800000),
  },
  {
    id: 'AML-006',
    type: 'layering',
    riskLevel: 'critical',
    subjectType: 'user',
    subjectId: 'U-55678',
    subjectName: 'Choi Yuna',
    status: 'reported',
    amount: 120000000,
    currency: 'KRW',
    description: 'Complex transaction chain detected across 8 accounts',
    flags: ['Layering', 'Multiple Accounts', 'Cross-Border'],
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(Date.now() - 172800000),
    assignedTo: 'admin-001',
    reportId: 'STR-2024-001234',
  },
];

const mockReports: RegulatoryReport[] = [
  {
    id: 'RPT-001',
    type: 'STR',
    caseId: 'AML-006',
    subjectId: 'U-55678',
    subjectName: 'Choi Yuna',
    amount: 120000000,
    submittedAt: new Date(Date.now() - 172800000),
    status: 'acknowledged',
    kofiu_reference: 'KOFIU-2024-STR-001234',
  },
  {
    id: 'RPT-002',
    type: 'CTR',
    caseId: 'AML-007',
    subjectId: 'U-88901',
    subjectName: 'Jung Taehyun',
    amount: 15000000,
    submittedAt: new Date(Date.now() - 86400000),
    status: 'submitted',
  },
];

/**
 * Get all AML cases with optional filtering
 */
export function getCases(filters?: {
  status?: AMLCase['status'];
  riskLevel?: AMLCase['riskLevel'];
  type?: AMLCaseType;
  limit?: number;
}): AMLCase[] {
  let filtered = [...mockCases];

  if (filters?.status) {
    filtered = filtered.filter(c => c.status === filters.status);
  }
  if (filters?.riskLevel) {
    filtered = filtered.filter(c => c.riskLevel === filters.riskLevel);
  }
  if (filters?.type) {
    filtered = filtered.filter(c => c.type === filters.type);
  }

  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get compliance metrics
 */
export function getComplianceMetrics(): ComplianceMetrics {
  const cases = mockCases;
  const reports = mockReports;

  return {
    totalCases: cases.length,
    pendingReview: cases.filter(c => c.status === 'pending_review').length,
    underInvestigation: cases.filter(c => c.status === 'under_investigation').length,
    escalated: cases.filter(c => c.status === 'escalated').length,
    cleared: cases.filter(c => c.status === 'cleared').length,
    reported: cases.filter(c => c.status === 'reported').length,
    ctrCount: reports.filter(r => r.type === 'CTR').length,
    strCount: reports.filter(r => r.type === 'STR').length,
    avgResolutionTime: 48.5,
    complianceRate: 94.2,
  };
}

/**
 * Get regulatory reports
 */
export function getReports(filters?: {
  type?: RegulatoryReport['type'];
  status?: RegulatoryReport['status'];
}): RegulatoryReport[] {
  let filtered = [...mockReports];

  if (filters?.type) {
    filtered = filtered.filter(r => r.type === filters.type);
  }
  if (filters?.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }

  return filtered.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Update case status
 */
export function updateCaseStatus(
  caseId: string,
  status: AMLCase['status'],
  assignedTo?: string
): AMLCase | undefined {
  const amlCase = mockCases.find(c => c.id === caseId);
  if (amlCase) {
    amlCase.status = status;
    amlCase.updatedAt = new Date();
    if (assignedTo) {
      amlCase.assignedTo = assignedTo;
    }
  }
  return amlCase;
}

/**
 * Get case type label
 */
export function getCaseTypeLabel(type: AMLCaseType): string {
  const labels: Record<AMLCaseType, string> = {
    ctr: 'Cash Transaction Report',
    str: 'Suspicious Transaction',
    pep: 'PEP Screening',
    sanctions: 'Sanctions Hit',
    unusual_pattern: 'Unusual Pattern',
    structuring: 'Structuring',
    layering: 'Layering',
    high_risk_country: 'High-Risk Jurisdiction',
    kyc_incomplete: 'KYC Incomplete',
    edd_required: 'EDD Required',
  };
  return labels[type] || type;
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(level: AMLCase['riskLevel']): string {
  switch (level) {
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
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}
