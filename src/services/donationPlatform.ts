/**
 * Donation Platform Service
 *
 * Transparent donation system using blockchain for:
 * - Full traceability of donations
 * - Smart contract-based fund distribution
 * - Tax receipt automation
 * - Impact reporting
 *
 * Based on:
 * - Korean Donation Law (기부금품의 모집 및 사용에 관한 법률)
 * - Tax deduction rules for donations
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Donation records, campaigns (in-memory)
 * - [REAL] Tax deduction rates (Korean tax law)
 * - [INTEGRATION READY] National Tax Service, charity registries
 */

import { auditLogService } from './auditLog';
import { blockchainAnchoringService } from './blockchainAnchoring';

// ============================================
// [REAL] Korean donation tax deduction rules
// Based on Income Tax Act and Corporate Tax Act
// ============================================
const TAX_DEDUCTION_CONFIG = {
  // Individual donors
  individual: {
    // Designated donations (to registered charities)
    designatedDonationLimit: 0.30,    // [REAL] Up to 30% of total income
    // Statutory donations (to government, schools)
    statutoryDonationLimit: 1.0,      // [REAL] 100% deductible
    // Political donations
    politicalDonationCredit: 0.10,    // [REAL] 10/100,000 KRW credit
    // Religious donations
    religiousDonationLimit: 0.10,     // [REAL] 10% of income
  },
  // Corporate donors
  corporate: {
    designatedDonationLimit: 0.10,    // [REAL] 10% of net income
    statutoryDonationLimit: 1.0,      // [REAL] 100% deductible
  },
  // Minimum for receipt
  minReceiptAmount: 1000,             // 1,000 KRW minimum
};

// Charity category
type CharityCategory =
  | 'WELFARE'           // Social welfare
  | 'EDUCATION'         // Education support
  | 'MEDICAL'           // Medical/health
  | 'DISASTER'          // Disaster relief
  | 'ENVIRONMENT'       // Environmental protection
  | 'CULTURE'           // Cultural preservation
  | 'INTERNATIONAL'     // International aid
  | 'LOCAL_COMMUNITY';  // Local community support

// Donation type for tax purposes
type DonationType = 'STATUTORY' | 'DESIGNATED' | 'POLITICAL' | 'RELIGIOUS';

// Registered charity
interface RegisteredCharity {
  id: string;
  name: string;
  registrationNumber: string;      // Registration with Ministry
  category: CharityCategory;
  donationType: DonationType;
  description: string;
  website?: string;
  isVerified: boolean;
  totalReceived: number;
  totalDistributed: number;
  impactReports: ImpactReport[];
  createdAt: number;
}

// Donation campaign
interface DonationCampaign {
  id: string;
  charityId: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  startDate: number;
  endDate: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  milestones: Array<{
    amount: number;
    description: string;
    reached: boolean;
    reachedAt?: number;
  }>;
  distributions: Distribution[];
}

// Donation record
interface DonationRecord {
  id: string;
  donorId: string;
  donorType: 'INDIVIDUAL' | 'CORPORATE';
  donorName: string;
  charityId: string;
  campaignId?: string;
  amount: number;
  timestamp: number;
  isAnonymous: boolean;
  message?: string;
  taxReceiptId?: string;
  blockchainTxHash: string;
  status: 'CONFIRMED' | 'PENDING' | 'REFUNDED';
}

// Distribution record (how donations are used)
interface Distribution {
  id: string;
  campaignId: string;
  amount: number;
  recipient: string;
  purpose: string;
  timestamp: number;
  proofDocuments: string[];
  blockchainTxHash: string;
  verifiedBy?: string;
}

// Impact report
interface ImpactReport {
  id: string;
  charityId: string;
  period: { start: string; end: string };
  totalReceived: number;
  totalDistributed: number;
  beneficiaries: number;
  keyAchievements: string[];
  financialSummary: {
    programExpenses: number;
    adminExpenses: number;
    fundraisingExpenses: number;
  };
  blockchainHash: string;
  publishedAt: number;
}

// Tax receipt
interface TaxReceipt {
  id: string;
  donorId: string;
  donorName: string;
  donorIdNumber: string;           // Hashed for privacy
  charityId: string;
  charityName: string;
  charityRegNumber: string;
  donationType: DonationType;
  amount: number;
  donationDate: number;
  issuedAt: number;
  fiscalYear: number;
  receiptNumber: string;
  digitalSignature: string;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const charityStore = new Map<string, RegisteredCharity>();
const campaignStore = new Map<string, DonationCampaign>();
const donationStore = new Map<string, DonationRecord[]>();
const receiptStore = new Map<string, TaxReceipt[]>();

// Generate IDs
const generateDonationId = (): string => `DON-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateReceiptId = (): string => `RCP-${new Date().getFullYear()}-${Date.now().toString(36)}`;
const generateCampaignId = (): string => `CMP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class DonationPlatformService {
  /**
   * [MOCK] Register charity
   * Production: Verify with Ministry of Health and Welfare registry
   */
  registerCharity(params: {
    name: string;
    registrationNumber: string;
    category: CharityCategory;
    donationType: DonationType;
    description: string;
    website?: string;
  }): RegisteredCharity {
    const charity: RegisteredCharity = {
      id: `CHR-${Date.now().toString(36)}`,
      ...params,
      isVerified: true, // In production: pending verification
      totalReceived: 0,
      totalDistributed: 0,
      impactReports: [],
      createdAt: Date.now(),
    };

    charityStore.set(charity.id, charity);
    return charity;
  }

  /**
   * [MOCK] Create donation campaign
   */
  createCampaign(params: {
    charityId: string;
    title: string;
    description: string;
    targetAmount: number;
    endDate: number;
    milestones?: Array<{ amount: number; description: string }>;
  }): DonationCampaign | null {
    const charity = charityStore.get(params.charityId);
    if (!charity || !charity.isVerified) return null;

    const campaign: DonationCampaign = {
      id: generateCampaignId(),
      charityId: params.charityId,
      title: params.title,
      description: params.description,
      targetAmount: params.targetAmount,
      raisedAmount: 0,
      donorCount: 0,
      startDate: Date.now(),
      endDate: params.endDate,
      status: 'ACTIVE',
      milestones: (params.milestones || []).map(m => ({
        ...m,
        reached: false,
      })),
      distributions: [],
    };

    campaignStore.set(campaign.id, campaign);
    return campaign;
  }

  /**
   * [MOCK + BLOCKCHAIN] Make donation
   */
  async makeDonation(params: {
    donorId: string;
    donorType: 'INDIVIDUAL' | 'CORPORATE';
    donorName: string;
    charityId: string;
    campaignId?: string;
    amount: number;
    isAnonymous?: boolean;
    message?: string;
  }): Promise<DonationRecord | null> {
    const charity = charityStore.get(params.charityId);
    if (!charity || !charity.isVerified) {
      console.warn('[Donation] Charity not found or not verified');
      return null;
    }

    if (params.campaignId) {
      const campaign = campaignStore.get(params.campaignId);
      if (!campaign || campaign.status !== 'ACTIVE') {
        console.warn('[Donation] Campaign not active');
        return null;
      }
    }

    // Anchor to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      generateDonationId(),
      'donation',
      {
        charityId: params.charityId,
        amount: params.amount,
        timestamp: Date.now(),
        anonymous: params.isAnonymous,
      }
    );

    const donation: DonationRecord = {
      id: anchorResult.hash.substring(0, 20),
      donorId: params.donorId,
      donorType: params.donorType,
      donorName: params.isAnonymous ? 'Anonymous' : params.donorName,
      charityId: params.charityId,
      campaignId: params.campaignId,
      amount: params.amount,
      timestamp: Date.now(),
      isAnonymous: params.isAnonymous || false,
      message: params.message,
      blockchainTxHash: anchorResult.hash,
      status: 'CONFIRMED',
    };

    // Update charity totals
    charity.totalReceived += params.amount;
    charityStore.set(params.charityId, charity);

    // Update campaign if applicable
    if (params.campaignId) {
      const campaign = campaignStore.get(params.campaignId);
      if (campaign) {
        campaign.raisedAmount += params.amount;
        campaign.donorCount++;

        // Check milestones
        for (const milestone of campaign.milestones) {
          if (!milestone.reached && campaign.raisedAmount >= milestone.amount) {
            milestone.reached = true;
            milestone.reachedAt = Date.now();
          }
        }

        // Check if campaign is complete
        if (campaign.raisedAmount >= campaign.targetAmount) {
          campaign.status = 'COMPLETED';
        }

        campaignStore.set(params.campaignId, campaign);
      }
    }

    // Store donation
    const donorDonations = donationStore.get(params.donorId) || [];
    donorDonations.push(donation);
    donationStore.set(params.donorId, donorDonations);

    // Generate tax receipt if eligible
    if (params.amount >= TAX_DEDUCTION_CONFIG.minReceiptAmount) {
      const receipt = await this.generateTaxReceipt(donation, params.donorName, charity);
      donation.taxReceiptId = receipt.id;
    }

    // Audit log
    await auditLogService.log({
      action: 'PAYMENT_COMPLETED',
      actorId: params.donorId,
      actorType: params.donorType === 'INDIVIDUAL' ? 'consumer' : 'merchant',
      targetType: 'donation',
      targetId: donation.id,
      metadata: {
        charityId: params.charityId,
        amount: params.amount,
        blockchainTxHash: anchorResult.hash,
      },
    });

    return donation;
  }

  /**
   * [MOCK] Generate tax receipt
   */
  private async generateTaxReceipt(
    donation: DonationRecord,
    donorRealName: string,
    charity: RegisteredCharity
  ): Promise<TaxReceipt> {
    const receipt: TaxReceipt = {
      id: generateReceiptId(),
      donorId: donation.donorId,
      donorName: donorRealName,
      donorIdNumber: `HASH-${donation.donorId.substring(0, 8)}`,
      charityId: charity.id,
      charityName: charity.name,
      charityRegNumber: charity.registrationNumber,
      donationType: charity.donationType,
      amount: donation.amount,
      donationDate: donation.timestamp,
      issuedAt: Date.now(),
      fiscalYear: new Date().getFullYear(),
      receiptNumber: `R${new Date().getFullYear()}${Date.now().toString().slice(-8)}`,
      digitalSignature: `SIG-${donation.blockchainTxHash.substring(0, 16)}`,
    };

    const receipts = receiptStore.get(donation.donorId) || [];
    receipts.push(receipt);
    receiptStore.set(donation.donorId, receipts);

    return receipt;
  }

  /**
   * [REAL FORMULA] Calculate tax deduction
   */
  calculateTaxDeduction(params: {
    donorType: 'INDIVIDUAL' | 'CORPORATE';
    donationType: DonationType;
    donationAmount: number;
    totalIncome: number;
  }): {
    deductibleAmount: number;
    taxSavings: number;
    limitPercentage: number;
  } {
    const config = params.donorType === 'INDIVIDUAL'
      ? TAX_DEDUCTION_CONFIG.individual
      : TAX_DEDUCTION_CONFIG.corporate;

    let limitPercentage: number;
    switch (params.donationType) {
      case 'STATUTORY':
        limitPercentage = config.statutoryDonationLimit;
        break;
      case 'DESIGNATED':
        limitPercentage = config.designatedDonationLimit;
        break;
      case 'RELIGIOUS':
        limitPercentage = (config as any).religiousDonationLimit || 0.10;
        break;
      default:
        limitPercentage = config.designatedDonationLimit;
    }

    const maxDeductible = params.totalIncome * limitPercentage;
    const deductibleAmount = Math.min(params.donationAmount, maxDeductible);

    // [REAL] Approximate tax rate (varies by income bracket)
    const taxRate = params.donorType === 'INDIVIDUAL' ? 0.24 : 0.22; // Simplified
    const taxSavings = Math.floor(deductibleAmount * taxRate);

    return {
      deductibleAmount,
      taxSavings,
      limitPercentage,
    };
  }

  /**
   * [MOCK + BLOCKCHAIN] Record fund distribution
   */
  async recordDistribution(params: {
    campaignId: string;
    amount: number;
    recipient: string;
    purpose: string;
    proofDocuments: string[];
    verifiedBy: string;
  }): Promise<Distribution | null> {
    const campaign = campaignStore.get(params.campaignId);
    if (!campaign) return null;

    const charity = charityStore.get(campaign.charityId);
    if (!charity) return null;

    // Anchor to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      `DIST-${Date.now()}`,
      'distribution',
      {
        campaignId: params.campaignId,
        amount: params.amount,
        recipient: params.recipient,
        purpose: params.purpose,
      }
    );

    const distribution: Distribution = {
      id: `DIST-${Date.now().toString(36)}`,
      campaignId: params.campaignId,
      amount: params.amount,
      recipient: params.recipient,
      purpose: params.purpose,
      timestamp: Date.now(),
      proofDocuments: params.proofDocuments,
      blockchainTxHash: anchorResult.hash,
      verifiedBy: params.verifiedBy,
    };

    campaign.distributions.push(distribution);
    campaignStore.set(params.campaignId, campaign);

    // Update charity totals
    charity.totalDistributed += params.amount;
    charityStore.set(campaign.charityId, charity);

    return distribution;
  }

  /**
   * Get donor's donation history
   */
  getDonorHistory(donorId: string): {
    donations: DonationRecord[];
    totalDonated: number;
    receipts: TaxReceipt[];
    annualSummary: Record<number, number>;
  } {
    const donations = donationStore.get(donorId) || [];
    const receipts = receiptStore.get(donorId) || [];

    const totalDonated = donations
      .filter(d => d.status === 'CONFIRMED')
      .reduce((sum, d) => sum + d.amount, 0);

    const annualSummary: Record<number, number> = {};
    for (const donation of donations) {
      const year = new Date(donation.timestamp).getFullYear();
      annualSummary[year] = (annualSummary[year] || 0) + donation.amount;
    }

    return {
      donations,
      totalDonated,
      receipts,
      annualSummary,
    };
  }

  /**
   * Get campaign details with transparency info
   */
  getCampaignDetails(campaignId: string): {
    campaign: DonationCampaign | null;
    charity: RegisteredCharity | null;
    transparencyScore: number;
    fundUtilization: number;
  } {
    const campaign = campaignStore.get(campaignId);
    if (!campaign) {
      return { campaign: null, charity: null, transparencyScore: 0, fundUtilization: 0 };
    }

    const charity = charityStore.get(campaign.charityId);

    // Calculate transparency score
    let transparencyScore = 50; // Base score
    if (campaign.distributions.length > 0) transparencyScore += 20;
    if (campaign.milestones.length > 0) transparencyScore += 10;
    if (charity?.impactReports.length) transparencyScore += 20;

    // Calculate fund utilization
    const totalDistributed = campaign.distributions.reduce((sum, d) => sum + d.amount, 0);
    const fundUtilization = campaign.raisedAmount > 0
      ? Math.round((totalDistributed / campaign.raisedAmount) * 100)
      : 0;

    return {
      campaign,
      charity: charity || null,
      transparencyScore: Math.min(100, transparencyScore),
      fundUtilization,
    };
  }

  /**
   * Get all active campaigns
   */
  getActiveCampaigns(): DonationCampaign[] {
    return Array.from(campaignStore.values())
      .filter(c => c.status === 'ACTIVE' && c.endDate > Date.now());
  }

  /**
   * Get charity by ID
   */
  getCharity(charityId: string): RegisteredCharity | null {
    return charityStore.get(charityId) || null;
  }

  /**
   * Get tax configuration
   */
  getTaxConfig(): typeof TAX_DEDUCTION_CONFIG {
    return { ...TAX_DEDUCTION_CONFIG };
  }
}

// Export singleton
export const donationPlatformService = new DonationPlatformService();

// Export types
export type {
  RegisteredCharity,
  DonationCampaign,
  DonationRecord,
  Distribution,
  ImpactReport,
  TaxReceipt,
  CharityCategory,
  DonationType,
};
