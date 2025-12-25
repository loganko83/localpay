/**
 * Tax Refund Service
 *
 * Instant VAT refund for foreign tourists using blockchain verification.
 * Refund is issued as tourism-only local currency to encourage local spending.
 *
 * Flow:
 * 1. Tourist makes purchase at participating merchant
 * 2. DID/passport verification confirms eligibility
 * 3. VAT refund issued to tourist wallet instantly
 * 4. Tourist spends refund in local economy before departure
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Refund processing, eligibility check (in-memory)
 * - [REAL] VAT rate (10% standard Korean VAT)
 * - [INTEGRATION READY] Customs API, Trip.PASS integration
 */

import { auditLogService } from './auditLog';
import { touristWalletService } from './touristWallet';

// ============================================
// [REAL] Korean Tax Refund Rules
// Based on actual Korean Tax-Free Shopping regulations
// ============================================
const TAX_REFUND_CONFIG = {
  vatRate: 0.10,                    // [REAL] Standard Korean VAT 10%
  minPurchaseAmount: 15000,         // [REAL] Minimum 15,000 KRW per receipt
  maxRefundPerReceipt: 500000,      // [REAL] Max refund per single receipt
  maxTotalRefund: 5000000,          // [REAL] Max total refund per person
  maxStayDays: 90,                  // [REAL] Must leave within 3 months
  refundRate: 0.07,                 // Effective refund rate after fees (~7% of purchase)
  eligibleCountries: 'ALL_EXCEPT_KR', // All foreign passports eligible
};

// Refund status
type RefundStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'USED' | 'EXPIRED' | 'REJECTED';

// Purchase record for refund
interface TaxFreePurchase {
  id: string;
  receiptNumber: string;
  merchantId: string;
  merchantName: string;
  merchantTaxId: string;           // Business registration number
  purchaseAmount: number;
  vatAmount: number;
  purchaseDate: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }>;
}

// Refund record
interface TaxRefundRecord {
  id: string;
  visitorId: string;
  passportCountry: string;
  purchase: TaxFreePurchase;
  refundAmount: number;
  status: RefundStatus;
  createdAt: number;
  processedAt?: number;
  issuedToWallet?: boolean;
  blockchainTxHash?: string;
  rejectionReason?: string;
  expiryDate: number;              // Refund expires if not used
}

// Eligibility check result
interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  remainingQuota?: number;
  daysUntilDeparture?: number;
}

// ============================================
// [MOCK] In-memory storage
// Production: Database + Customs API
// ============================================
const refundStore = new Map<string, TaxRefundRecord[]>();
const merchantRegistry = new Map<string, {
  id: string;
  name: string;
  taxId: string;
  isTaxFreeRegistered: boolean;
}>();

// Generate IDs
const generateRefundId = (): string => `TXR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateReceiptId = (): string => `RCP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class TaxRefundService {
  /**
   * [MOCK] Register merchant for tax-free shopping
   * Production: Integrate with National Tax Service
   */
  registerMerchant(params: {
    merchantId: string;
    name: string;
    taxId: string;
  }): void {
    merchantRegistry.set(params.merchantId, {
      ...params,
      id: params.merchantId,
      isTaxFreeRegistered: true,
    });
  }

  /**
   * Check if tourist is eligible for tax refund
   */
  async checkEligibility(visitorId: string): Promise<EligibilityResult> {
    // Check wallet exists
    const wallet = touristWalletService.getWallet(visitorId);
    if (!wallet) {
      return { eligible: false, reason: 'Tourist wallet not found' };
    }

    // Check stay duration
    const stayCheck = touristWalletService.checkTaxRefundEligibility(visitorId);
    if (!stayCheck.eligible) {
      return { eligible: false, reason: stayCheck.reason };
    }

    // Check existing refunds (quota)
    const existingRefunds = refundStore.get(visitorId) || [];
    const totalRefunded = existingRefunds
      .filter(r => r.status === 'ISSUED' || r.status === 'USED')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    const remainingQuota = TAX_REFUND_CONFIG.maxTotalRefund - totalRefunded;
    if (remainingQuota <= 0) {
      return { eligible: false, reason: 'Maximum refund quota exceeded' };
    }

    return {
      eligible: true,
      remainingQuota,
      daysUntilDeparture: wallet.plannedDepartureDate
        ? Math.floor((wallet.plannedDepartureDate - Date.now()) / (24 * 60 * 60 * 1000))
        : undefined,
    };
  }

  /**
   * [MOCK + REAL VAT CALC] Process instant tax refund
   * Production: Integrate with customs verification
   */
  async processRefund(params: {
    visitorId: string;
    merchantId: string;
    purchaseAmount: number;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      category: string;
    }>;
  }): Promise<TaxRefundRecord | null> {
    // Verify merchant
    const merchant = merchantRegistry.get(params.merchantId);
    if (!merchant || !merchant.isTaxFreeRegistered) {
      console.warn('[TaxRefund] Merchant not registered for tax-free');
      return null;
    }

    // Check eligibility
    const eligibility = await this.checkEligibility(params.visitorId);
    if (!eligibility.eligible) {
      console.warn('[TaxRefund] Not eligible:', eligibility.reason);
      return null;
    }

    // Check minimum purchase
    if (params.purchaseAmount < TAX_REFUND_CONFIG.minPurchaseAmount) {
      console.warn('[TaxRefund] Below minimum purchase amount');
      return null;
    }

    // [REAL] Calculate VAT amount
    // VAT is included in Korean prices, so: VAT = Price - (Price / 1.1)
    const vatAmount = Math.floor(params.purchaseAmount - (params.purchaseAmount / (1 + TAX_REFUND_CONFIG.vatRate)));

    // Calculate actual refund (after processing fee)
    const refundAmount = Math.min(
      Math.floor(params.purchaseAmount * TAX_REFUND_CONFIG.refundRate),
      TAX_REFUND_CONFIG.maxRefundPerReceipt,
      eligibility.remainingQuota || TAX_REFUND_CONFIG.maxRefundPerReceipt
    );

    const purchase: TaxFreePurchase = {
      id: generateReceiptId(),
      receiptNumber: `R${Date.now()}`,
      merchantId: params.merchantId,
      merchantName: merchant.name,
      merchantTaxId: merchant.taxId,
      purchaseAmount: params.purchaseAmount,
      vatAmount,
      purchaseDate: Date.now(),
      items: params.items,
    };

    const refund: TaxRefundRecord = {
      id: generateRefundId(),
      visitorId: params.visitorId,
      passportCountry: touristWalletService.getWallet(params.visitorId)?.passportCountry || 'UNKNOWN',
      purchase,
      refundAmount,
      status: 'APPROVED',
      createdAt: Date.now(),
      expiryDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
    };

    // Store refund
    const userRefunds = refundStore.get(params.visitorId) || [];
    userRefunds.push(refund);
    refundStore.set(params.visitorId, userRefunds);

    // Issue refund to wallet immediately
    await this.issueRefundToWallet(refund);

    // Audit log
    await auditLogService.log({
      action: 'REFUND_COMPLETED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'tax_refund',
      targetId: refund.id,
      metadata: {
        visitorId: params.visitorId,
        merchantId: params.merchantId,
        purchaseAmount: params.purchaseAmount,
        vatAmount,
        refundAmount,
      },
    });

    return refund;
  }

  /**
   * [MOCK] Issue refund to tourist wallet
   * This is the key innovation - refund goes to local currency, not cash
   */
  private async issueRefundToWallet(refund: TaxRefundRecord): Promise<boolean> {
    const wallet = touristWalletService.getWallet(refund.visitorId);
    if (!wallet) return false;

    // Add refund to wallet balance
    // In production: This would be a special "tax refund" token type
    wallet.balanceKRW += refund.refundAmount;

    refund.status = 'ISSUED';
    refund.processedAt = Date.now();
    refund.issuedToWallet = true;

    // Update store
    const userRefunds = refundStore.get(refund.visitorId) || [];
    const index = userRefunds.findIndex(r => r.id === refund.id);
    if (index >= 0) {
      userRefunds[index] = refund;
      refundStore.set(refund.visitorId, userRefunds);
    }

    return true;
  }

  /**
   * Get refund history for visitor
   */
  getRefundHistory(visitorId: string): TaxRefundRecord[] {
    return refundStore.get(visitorId) || [];
  }

  /**
   * Get refund summary
   */
  getRefundSummary(visitorId: string): {
    totalPurchases: number;
    totalRefunded: number;
    pendingRefunds: number;
    remainingQuota: number;
    refundCount: number;
  } {
    const refunds = refundStore.get(visitorId) || [];

    const totalPurchases = refunds.reduce((sum, r) => sum + r.purchase.purchaseAmount, 0);
    const totalRefunded = refunds
      .filter(r => r.status === 'ISSUED' || r.status === 'USED')
      .reduce((sum, r) => sum + r.refundAmount, 0);
    const pendingRefunds = refunds
      .filter(r => r.status === 'PENDING' || r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    return {
      totalPurchases,
      totalRefunded,
      pendingRefunds,
      remainingQuota: TAX_REFUND_CONFIG.maxTotalRefund - totalRefunded,
      refundCount: refunds.length,
    };
  }

  /**
   * [MOCK] Verify refund at departure (airport/port)
   * Production: Customs system integration
   */
  async verifyAtDeparture(visitorId: string): Promise<{
    verified: boolean;
    totalVerified: number;
    issues?: string[];
  }> {
    const refunds = refundStore.get(visitorId) || [];
    const issuedRefunds = refunds.filter(r => r.status === 'ISSUED');

    if (issuedRefunds.length === 0) {
      return { verified: true, totalVerified: 0 };
    }

    // In production: Would verify against customs system
    // For now, mark all as used (verified)
    for (const refund of issuedRefunds) {
      refund.status = 'USED';
    }

    refundStore.set(visitorId, refunds);

    return {
      verified: true,
      totalVerified: issuedRefunds.reduce((sum, r) => sum + r.refundAmount, 0),
    };
  }

  /**
   * Get tax refund configuration (for display)
   */
  getConfig(): typeof TAX_REFUND_CONFIG {
    return { ...TAX_REFUND_CONFIG };
  }
}

// Export singleton
export const taxRefundService = new TaxRefundService();

// Export types
export type {
  TaxRefundRecord,
  TaxFreePurchase,
  RefundStatus,
  EligibilityResult,
};
