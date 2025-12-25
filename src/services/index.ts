/**
 * Services Index
 *
 * Export all platform services.
 *
 * Architecture Note:
 * - bankAPI: Communication with IBK Bank (financial operations)
 * - policyEngine: Local currency policy management (our responsibility)
 * - auditLog: Immutable audit trail (our responsibility)
 * - identityService: DID/VC management (our responsibility)
 *
 * "Money handled by bank, Proof handled by technology"
 */

export { bankAPI } from './bankAPI';
export type {
  BankBalanceResponse,
  BankPaymentRequest,
  BankPaymentResponse,
  BankChargeRequest,
  BankChargeResponse,
  BankRefundRequest,
  BankRefundResponse,
  BankSettlementData,
} from './bankAPI';

export { auditLog, auditLogService } from './auditLog';
export type {
  AuditActionType,
  AuditLogEntry,
  AuditQuery,
} from './auditLog';

export { identityService } from './identity';
export type {
  CredentialType,
  DID,
  VerifiableCredential,
  VerificationResult as IdentityVerificationResult,
} from './identity';

export { policyEngine } from './policyEngine';
export type {
  PolicyRuleType,
  PolicyRule,
  Policy,
  PolicyValidationRequest,
  PolicyValidationResult,
} from './policyEngine';

export { apiGateway, validationSchemas } from './apiGateway';
export type {
  RequestContext,
  ValidationSchema,
  RateLimitConfig,
} from './apiGateway';

export { fraudDetectionService } from './fraudDetection';
export type {
  TransactionPattern,
  RiskAssessment,
  RiskFactor,
} from './fraudDetection';

export { twoFactorAuthService } from './twoFactorAuth';
export type {
  TwoFactorMethod,
  TwoFactorResult,
  UserTwoFactorSettings,
} from './twoFactorAuth';

export { blockchainAnchoringService } from './blockchainAnchoring';
export type {
  AnchorStatus,
  TransactionHash,
  AnchorRecord,
  VerificationResult as BlockchainVerificationResult,
} from './blockchainAnchoring';

export { didSignedAuditService } from './didSignedAudit';
export type {
  SignedAuditEntry,
  DIDProof,
  AnchorInfo,
} from './didSignedAudit';

// ============================================
// Phase 6: Programmable Money (Sprint 21-22)
// ============================================
export { programmableMoneyService } from './programmableMoney';
export type {
  ProgrammableToken,
  TokenRestriction,
  ValidationResult as TokenValidationResult,
} from './programmableMoney';

export { tokenLifecycleService } from './tokenLifecycle';
export type {
  TrackedToken,
  TokenEvent,
  LifecycleStage,
  CirculationMetrics,
} from './tokenLifecycle';

// ============================================
// Phase 7: Tourism Services (Sprint 23-24)
// ============================================
export { touristWalletService } from './touristWallet';
export type {
  TouristWallet,
  ChargeRecord,
  ExchangeRate,
  SupportedCurrency,
  StablecoinType,
} from './touristWallet';

export { taxRefundService } from './taxRefund';
export type {
  TaxRefundRecord,
  TaxFreePurchase,
  RefundStatus,
  EligibilityResult,
} from './taxRefund';

// ============================================
// Phase 8: Delivery & Market (Sprint 25-26)
// ============================================
export { publicDeliveryService } from './publicDelivery';
export type {
  DeliveryOrder,
  SettlementRecord,
  RiderProfile,
  WorkHistoryEntry,
  OrderStatus,
} from './publicDelivery';

export { productTraceabilityService } from './productTraceability';
export type {
  TrackedProduct,
  TrackingEvent,
  ProductHistoryView,
  ProductCategory,
  TrackingEventType,
} from './productTraceability';

export { sharedLoyaltyService } from './sharedLoyalty';
export type {
  LoyaltyMember,
  PointTransaction,
  AllianceMerchant,
  MemberTier,
  AllianceStats,
} from './sharedLoyalty';

// ============================================
// Phase 9: ESG & Carbon (Sprint 27-28)
// ============================================
export { carbonPointsService } from './carbonPoints';
export type {
  EcoAction,
  EcoActionType,
  CarbonAccount,
  CarbonReportCard,
  VerificationMethod,
} from './carbonPoints';

// ============================================
// Phase 10: B2B Services (Sprint 29-30)
// ============================================
export { corporateWelfareService } from './corporateWelfare';
export type {
  CompanyAccount,
  Department,
  EmployeeWelfare,
  DistributionBatch,
  WelfareUsageReport,
  WelfareCategory,
} from './corporateWelfare';

export { donationPlatformService } from './donationPlatform';
export type {
  RegisteredCharity,
  DonationCampaign,
  DonationRecord,
  Distribution,
  ImpactReport,
  TaxReceipt,
  CharityCategory,
  DonationType,
} from './donationPlatform';

// ============================================
// Phase 11: MyData & AML (Sprint 31-32)
// ============================================
export { myDataService } from './myDataService';
export type {
  MyDataProfile,
  DataInventoryItem,
  DataConsent,
  DataRequest,
  PrivacySettings,
  FinancialSummary,
  DataPurpose,
  ConsentStatus,
} from './myDataService';

export { merchantCreditService } from './merchantCredit';
export type {
  MerchantCreditProfile,
  CreditAssessment,
  LoanRecord,
  LoanApplication,
  FinancialMetrics,
  CreditGrade,
} from './merchantCredit';

export { amlComplianceService } from './amlCompliance';
export type {
  MonitoredTransaction,
  AMLAlert,
  CustomerRiskProfile,
  SuspiciousTransactionReport,
  TravelRuleRecord,
  RiskLevel,
  AlertType,
} from './amlCompliance';

// ============================================
// Demo Data (for testing and development)
// ============================================
export { initializeDemoData, DEMO_USERS } from './demoData';
