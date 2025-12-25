/**
 * MyData Service
 *
 * Personal data sovereignty implementation based on Korean MyData law.
 * Users control their financial data and can share it selectively.
 *
 * Based on:
 * - Korean MyData Business Act (2022)
 * - Credit Information Use and Protection Act
 * - Financial Services Commission MyData Guidelines
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Data storage, consent management (in-memory)
 * - [REAL] Data categories and consent structure (based on MyData standards)
 * - [INTEGRATION READY] MyData API, financial institution APIs
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] MyData standard data categories
// Based on Financial Services Commission MyData API specifications
// ============================================
const MYDATA_CATEGORIES = {
  // Bank account information
  BANK_ACCOUNT: {
    code: '01',
    name: 'Bank Account Information',
    nameKo: '은행 계좌정보',
    includes: ['balance', 'transactions', 'account_details'],
  },
  // Card usage history
  CARD_USAGE: {
    code: '02',
    name: 'Card Usage History',
    nameKo: '카드 이용내역',
    includes: ['transactions', 'limits', 'benefits'],
  },
  // Investment information
  INVESTMENT: {
    code: '03',
    name: 'Investment Information',
    nameKo: '투자 정보',
    includes: ['holdings', 'transactions', 'returns'],
  },
  // Insurance information
  INSURANCE: {
    code: '04',
    name: 'Insurance Information',
    nameKo: '보험 정보',
    includes: ['policies', 'claims', 'premiums'],
  },
  // Loan information
  LOAN: {
    code: '05',
    name: 'Loan Information',
    nameKo: '대출 정보',
    includes: ['outstanding', 'payments', 'interest'],
  },
  // Pension information
  PENSION: {
    code: '06',
    name: 'Pension Information',
    nameKo: '연금 정보',
    includes: ['contributions', 'projected_payout'],
  },
  // Local currency usage
  LOCAL_CURRENCY: {
    code: '10',
    name: 'Local Currency Usage',
    nameKo: '지역화폐 이용내역',
    includes: ['balance', 'transactions', 'rewards'],
  },
};

// Consent status
type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED' | 'PENDING';

// Data request purpose
type DataPurpose =
  | 'CREDIT_SCORING'        // Credit evaluation
  | 'FINANCIAL_PLANNING'    // Financial advice
  | 'LOAN_APPLICATION'      // Loan review
  | 'ACCOUNT_AGGREGATION'   // Account summary
  | 'SPENDING_ANALYSIS'     // Spending patterns
  | 'REWARD_OPTIMIZATION'   // Optimize rewards
  | 'TAX_FILING'            // Tax preparation
  | 'IDENTITY_VERIFICATION'; // KYC

// User's MyData profile
interface MyDataProfile {
  id: string;
  userId: string;
  didDocument?: string;           // DID for data sovereignty
  dataInventory: DataInventoryItem[];
  consents: DataConsent[];
  dataRequests: DataRequest[];
  privacySettings: PrivacySettings;
  createdAt: number;
  lastUpdatedAt: number;
}

// Data inventory item
interface DataInventoryItem {
  category: keyof typeof MYDATA_CATEGORIES;
  provider: string;                // e.g., "KB Bank", "Samsung Card"
  providerId: string;
  lastSyncedAt: number;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  dataPoints: number;              // Number of data records
}

// Data consent record
interface DataConsent {
  id: string;
  userId: string;
  requesterId: string;             // Who is requesting data
  requesterName: string;
  purpose: DataPurpose;
  categories: (keyof typeof MYDATA_CATEGORIES)[];
  scope: 'FULL' | 'SUMMARY' | 'LIMITED';
  startDate: number;
  endDate: number;
  status: ConsentStatus;
  grantedAt?: number;
  revokedAt?: number;
  accessLog: AccessLogEntry[];
}

// Access log entry
interface AccessLogEntry {
  id: string;
  timestamp: number;
  category: keyof typeof MYDATA_CATEGORIES;
  action: 'READ' | 'EXPORT' | 'ANALYZE';
  dataPoints: number;
  ipAddress?: string;
}

// Data request
interface DataRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  purpose: DataPurpose;
  categories: (keyof typeof MYDATA_CATEGORIES)[];
  scope: 'FULL' | 'SUMMARY' | 'LIMITED';
  validityDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: number;
  respondedAt?: number;
}

// Privacy settings
interface PrivacySettings {
  allowAnalytics: boolean;
  allowPersonalization: boolean;
  autoRevokeAfterDays: number;
  requireMFA: boolean;
  notifyOnAccess: boolean;
  dataRetentionDays: number;
}

// Aggregated financial summary
interface FinancialSummary {
  userId: string;
  generatedAt: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  assetBreakdown: Record<string, number>;
  spendingByCategory: Record<string, number>;
  creditScore?: number;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const profileStore = new Map<string, MyDataProfile>();
const consentStore = new Map<string, DataConsent>();

// Generate IDs
const generateProfileId = (): string => `MDP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateConsentId = (): string => `CNS-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateRequestId = (): string => `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class MyDataService {
  /**
   * [MOCK] Create MyData profile for user
   */
  async createProfile(userId: string): Promise<MyDataProfile> {
    const existing = profileStore.get(userId);
    if (existing) return existing;

    // DID document would be obtained from identity service in production
    // For now, generate a placeholder DID reference
    const didDoc = `did:localpay:${userId}`;

    const profile: MyDataProfile = {
      id: generateProfileId(),
      userId,
      didDocument: didDoc,
      dataInventory: [],
      consents: [],
      dataRequests: [],
      privacySettings: {
        allowAnalytics: false,
        allowPersonalization: true,
        autoRevokeAfterDays: 365,
        requireMFA: true,
        notifyOnAccess: true,
        dataRetentionDays: 730, // 2 years
      },
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    profileStore.set(userId, profile);

    await auditLogService.log({
      action: 'USER_REGISTERED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'mydata_profile',
      targetId: profile.id,
      metadata: { hasDid: !!didDoc },
    });

    return profile;
  }

  /**
   * [MOCK] Connect data source (bank, card, etc.)
   * Production: OAuth flow with financial institution
   */
  async connectDataSource(params: {
    userId: string;
    category: keyof typeof MYDATA_CATEGORIES;
    provider: string;
    providerId: string;
  }): Promise<DataInventoryItem | null> {
    let profile = profileStore.get(params.userId);
    if (!profile) {
      profile = await this.createProfile(params.userId);
    }

    // Check if already connected
    const existing = profile.dataInventory.find(
      i => i.category === params.category && i.providerId === params.providerId
    );
    if (existing) return existing;

    const item: DataInventoryItem = {
      category: params.category,
      provider: params.provider,
      providerId: params.providerId,
      lastSyncedAt: Date.now(),
      syncStatus: 'SYNCED',
      dataPoints: Math.floor(Math.random() * 100) + 10, // Mock data points
    };

    profile.dataInventory.push(item);
    profile.lastUpdatedAt = Date.now();
    profileStore.set(params.userId, profile);

    return item;
  }

  /**
   * [MOCK] Request data access from user
   */
  async requestDataAccess(params: {
    requesterId: string;
    requesterName: string;
    userId: string;
    purpose: DataPurpose;
    categories: (keyof typeof MYDATA_CATEGORIES)[];
    scope: 'FULL' | 'SUMMARY' | 'LIMITED';
    validityDays: number;
  }): Promise<DataRequest | null> {
    const profile = profileStore.get(params.userId);
    if (!profile) return null;

    const request: DataRequest = {
      id: generateRequestId(),
      requesterId: params.requesterId,
      requesterName: params.requesterName,
      purpose: params.purpose,
      categories: params.categories,
      scope: params.scope,
      validityDays: params.validityDays,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    profile.dataRequests.push(request);
    profile.lastUpdatedAt = Date.now();
    profileStore.set(params.userId, profile);

    return request;
  }

  /**
   * [MOCK] User grants or denies data request
   */
  async respondToRequest(params: {
    userId: string;
    requestId: string;
    approved: boolean;
  }): Promise<DataConsent | null> {
    const profile = profileStore.get(params.userId);
    if (!profile) return null;

    const request = profile.dataRequests.find(r => r.id === params.requestId);
    if (!request || request.status !== 'PENDING') return null;

    request.status = params.approved ? 'APPROVED' : 'REJECTED';
    request.respondedAt = Date.now();

    if (!params.approved) {
      profileStore.set(params.userId, profile);
      return null;
    }

    // Create consent record
    const consent: DataConsent = {
      id: generateConsentId(),
      userId: params.userId,
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      purpose: request.purpose,
      categories: request.categories,
      scope: request.scope,
      startDate: Date.now(),
      endDate: Date.now() + request.validityDays * 24 * 60 * 60 * 1000,
      status: 'GRANTED',
      grantedAt: Date.now(),
      accessLog: [],
    };

    profile.consents.push(consent);
    profile.lastUpdatedAt = Date.now();
    profileStore.set(params.userId, profile);
    consentStore.set(consent.id, consent);

    await auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      actorId: params.userId,
      actorType: 'consumer',
      targetType: 'data_consent',
      targetId: consent.id,
      metadata: {
        requesterId: request.requesterId,
        purpose: request.purpose,
        categories: request.categories,
      },
    });

    return consent;
  }

  /**
   * [MOCK] Revoke consent
   */
  async revokeConsent(userId: string, consentId: string): Promise<boolean> {
    const profile = profileStore.get(userId);
    if (!profile) return false;

    const consent = profile.consents.find(c => c.id === consentId);
    if (!consent || consent.status !== 'GRANTED') return false;

    consent.status = 'REVOKED';
    consent.revokedAt = Date.now();
    profile.lastUpdatedAt = Date.now();

    profileStore.set(userId, profile);
    consentStore.set(consentId, consent);

    await auditLogService.log({
      action: 'CREDENTIAL_REVOKED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'data_consent',
      targetId: consentId,
      metadata: { requesterId: consent.requesterId },
    });

    return true;
  }

  /**
   * [MOCK] Access user data (by authorized requester)
   */
  async accessData(params: {
    consentId: string;
    requesterId: string;
    category: keyof typeof MYDATA_CATEGORIES;
    action: 'READ' | 'EXPORT' | 'ANALYZE';
  }): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    const consent = consentStore.get(params.consentId);
    if (!consent) {
      return { success: false, error: 'Consent not found' };
    }

    if (consent.status !== 'GRANTED') {
      return { success: false, error: 'Consent not active' };
    }

    if (consent.requesterId !== params.requesterId) {
      return { success: false, error: 'Unauthorized requester' };
    }

    if (!consent.categories.includes(params.category)) {
      return { success: false, error: 'Category not authorized' };
    }

    if (Date.now() > consent.endDate) {
      consent.status = 'EXPIRED';
      consentStore.set(params.consentId, consent);
      return { success: false, error: 'Consent expired' };
    }

    // Log access
    const accessEntry: AccessLogEntry = {
      id: `ACC-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      category: params.category,
      action: params.action,
      dataPoints: Math.floor(Math.random() * 50) + 1,
    };

    consent.accessLog.push(accessEntry);
    consentStore.set(params.consentId, consent);

    // Return mock data based on category and scope
    const mockData = this.generateMockData(params.category, consent.scope);

    return { success: true, data: mockData };
  }

  /**
   * [MOCK] Generate mock data for category
   */
  private generateMockData(
    category: keyof typeof MYDATA_CATEGORIES,
    scope: 'FULL' | 'SUMMARY' | 'LIMITED'
  ): Record<string, unknown> {
    if (scope === 'LIMITED') {
      return { available: true, dataPoints: 'Contact user for details' };
    }

    if (scope === 'SUMMARY') {
      switch (category) {
        case 'BANK_ACCOUNT':
          return { accountCount: 2, totalBalance: 5000000 };
        case 'CARD_USAGE':
          return { cardCount: 3, monthlySpending: 1500000 };
        case 'LOCAL_CURRENCY':
          return { balance: 50000, monthlyUsage: 200000 };
        default:
          return { summary: 'Data available' };
      }
    }

    // FULL scope - return detailed mock data
    switch (category) {
      case 'LOCAL_CURRENCY':
        return {
          balance: 50000,
          transactions: [
            { date: '2024-01-15', merchant: 'Local Cafe', amount: 5000 },
            { date: '2024-01-14', merchant: 'Market', amount: 15000 },
          ],
          rewards: { totalEarned: 5000, available: 2000 },
        };
      default:
        return { details: 'Full data access granted' };
    }
  }

  /**
   * [MOCK] Generate financial summary
   */
  generateFinancialSummary(userId: string): FinancialSummary | null {
    const profile = profileStore.get(userId);
    if (!profile) return null;

    // Mock financial summary
    return {
      userId,
      generatedAt: Date.now(),
      totalAssets: 15000000,
      totalLiabilities: 5000000,
      netWorth: 10000000,
      monthlyIncome: 4000000,
      monthlyExpenses: 2500000,
      savingsRate: 0.375,
      assetBreakdown: {
        'Bank Deposits': 8000000,
        'Investments': 5000000,
        'Local Currency': 50000,
        'Other': 1950000,
      },
      spendingByCategory: {
        'Food & Dining': 600000,
        'Transportation': 200000,
        'Shopping': 400000,
        'Utilities': 300000,
        'Other': 1000000,
      },
    };
  }

  /**
   * Get user's MyData profile
   */
  getProfile(userId: string): MyDataProfile | null {
    return profileStore.get(userId) || null;
  }

  /**
   * Get active consents for user
   */
  getActiveConsents(userId: string): DataConsent[] {
    const profile = profileStore.get(userId);
    if (!profile) return [];

    return profile.consents.filter(
      c => c.status === 'GRANTED' && c.endDate > Date.now()
    );
  }

  /**
   * Get pending requests for user
   */
  getPendingRequests(userId: string): DataRequest[] {
    const profile = profileStore.get(userId);
    if (!profile) return [];

    return profile.dataRequests.filter(r => r.status === 'PENDING');
  }

  /**
   * Get data categories info
   */
  getDataCategories(): typeof MYDATA_CATEGORIES {
    return { ...MYDATA_CATEGORIES };
  }

  /**
   * Update privacy settings
   */
  updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): PrivacySettings | null {
    const profile = profileStore.get(userId);
    if (!profile) return null;

    profile.privacySettings = {
      ...profile.privacySettings,
      ...settings,
    };
    profile.lastUpdatedAt = Date.now();

    profileStore.set(userId, profile);
    return profile.privacySettings;
  }
}

// Export singleton
export const myDataService = new MyDataService();

// Export types
export type {
  MyDataProfile,
  DataInventoryItem,
  DataConsent,
  DataRequest,
  PrivacySettings,
  FinancialSummary,
  DataPurpose,
  ConsentStatus,
};
