/**
 * Compliance Service
 * Frontend integration for FDS (Fraud Detection) and AML (Anti-Money Laundering)
 */

import { backendApiClient } from './client';

// ==================== FDS Types ====================

export interface FDSAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType: 'user' | 'merchant' | 'transaction';
  entityId: string;
  entityName?: string;
  riskScore: number;
  metadata: Record<string, unknown> | null;
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  assignedTo: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface FDSRule {
  id: string;
  name: string;
  description: string | null;
  type: string;
  conditions: Record<string, unknown>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  triggeredCount: number;
  createdAt: string;
}

export interface FDSStats {
  totalAlerts: number;
  newAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  avgResolutionTime: number;
  topRuleTriggered: string;
}

// ==================== AML Types ====================

export interface AMLCase {
  id: string;
  type: 'ctr' | 'str' | 'investigation';
  status: 'open' | 'investigating' | 'pending_report' | 'reported' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType: 'user' | 'merchant';
  entityId: string;
  entityName?: string;
  totalAmount: number;
  transactionCount: number;
  riskScore: number;
  riskFactors: string[];
  assignedTo: string | null;
  reportedAt: string | null;
  reportReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AMLReport {
  id: string;
  caseId: string;
  type: 'ctr' | 'str';
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  reportReference: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  responseAt: string | null;
  responseNotes: string | null;
  createdAt: string;
}

export interface AMLStats {
  totalCases: number;
  openCases: number;
  pendingReports: number;
  reportedThisMonth: number;
  ctrCount: number;
  strCount: number;
  avgInvestigationTime: number;
}

export interface RiskScore {
  entityId: string;
  entityType: 'user' | 'merchant';
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; impact: number; description: string }[];
  lastUpdated: string;
}

// ==================== Response Types ====================

export interface FDSAlertListResponse {
  alerts: FDSAlert[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AMLCaseListResponse {
  cases: AMLCase[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ==================== Compliance Service ====================

class ComplianceService {
  // ==================== FDS ====================

  /**
   * Get FDS alerts
   */
  async getFDSAlerts(filters?: { page?: number; size?: number; severity?: string; status?: string }): Promise<FDSAlertListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/compliance/fds/alerts?${queryString}` : '/compliance/fds/alerts';

    const response = await backendApiClient.get<{ success: boolean; data: FDSAlertListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Update FDS alert
   */
  async updateFDSAlert(alertId: string, data: { status?: string; resolution?: string; assignedTo?: string }): Promise<FDSAlert> {
    const response = await backendApiClient.put<{ success: boolean; data: { alert: FDSAlert } }>(`/compliance/fds/alerts/${alertId}`, data);
    return response.data.alert;
  }

  /**
   * Get FDS rules
   */
  async getFDSRules(): Promise<FDSRule[]> {
    const response = await backendApiClient.get<{ success: boolean; data: { rules: FDSRule[] } }>('/compliance/fds/rules');
    return response.data.rules;
  }

  /**
   * Get FDS statistics
   */
  async getFDSStats(): Promise<FDSStats> {
    const response = await backendApiClient.get<{ success: boolean; data: FDSStats }>('/compliance/fds/stats');
    return response.data;
  }

  // ==================== AML ====================

  /**
   * Get AML cases
   */
  async getAMLCases(filters?: { page?: number; size?: number; type?: string; status?: string; priority?: string }): Promise<AMLCaseListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);

    const queryString = params.toString();
    const endpoint = queryString ? `/compliance/aml/cases?${queryString}` : '/compliance/aml/cases';

    const response = await backendApiClient.get<{ success: boolean; data: AMLCaseListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get AML case details
   */
  async getAMLCase(caseId: string): Promise<AMLCase> {
    const response = await backendApiClient.get<{ success: boolean; data: { case: AMLCase } }>(`/compliance/aml/cases/${caseId}`);
    return response.data.case;
  }

  /**
   * Update AML case
   */
  async updateAMLCase(caseId: string, data: Partial<AMLCase>): Promise<AMLCase> {
    const response = await backendApiClient.put<{ success: boolean; data: { case: AMLCase } }>(`/compliance/aml/cases/${caseId}`, data);
    return response.data.case;
  }

  /**
   * Get AML statistics
   */
  async getAMLStats(): Promise<AMLStats> {
    const response = await backendApiClient.get<{ success: boolean; data: AMLStats }>('/compliance/aml/stats');
    return response.data;
  }

  /**
   * Get risk score
   */
  async getRiskScore(entityType: 'user' | 'merchant', entityId: string): Promise<RiskScore> {
    const response = await backendApiClient.get<{ success: boolean; data: RiskScore }>(`/compliance/risk-score?entityType=${entityType}&entityId=${entityId}`);
    return response.data;
  }

  /**
   * Screen entity for AML
   */
  async screenEntity(entityType: 'user' | 'merchant', entityId: string): Promise<{ passed: boolean; alerts: FDSAlert[] }> {
    const response = await backendApiClient.post<{ success: boolean; data: { passed: boolean; alerts: FDSAlert[] } }>(
      '/compliance/aml/screening',
      { entityType, entityId }
    );
    return response.data;
  }
}

// Export singleton instance
export const complianceService = new ComplianceService();

export default complianceService;
