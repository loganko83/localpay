/**
 * Policy Engine Service
 *
 * Core responsibility of SW Developer:
 * - Define and manage local currency usage policies
 * - Validate transactions against policy rules
 * - Support municipality-specific configurations
 *
 * "Policy engine absorbs different policies per municipality"
 * "Bank core modification minimized through API integration"
 */

import { auditLog } from './auditLog';
import type { CredentialType } from './identity';

export type PolicyRuleType =
  | 'REGION_RESTRICTION'      // Geographic area limitation
  | 'MERCHANT_CATEGORY'       // Business type restriction
  | 'USAGE_LIMIT_DAILY'       // Daily spending cap
  | 'USAGE_LIMIT_MONTHLY'     // Monthly spending cap
  | 'USAGE_LIMIT_TRANSACTION' // Per-transaction cap
  | 'TIME_RESTRICTION'        // Operating hours
  | 'USER_ELIGIBILITY'        // User qualification requirement
  | 'DISCOUNT_RATE'           // Cashback or discount
  | 'EXPIRATION';             // Currency expiration

export interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  enabled: boolean;
  parameters: Record<string, unknown>;
  priority: number; // Lower = higher priority
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  municipalityId: string;
  rules: PolicyRule[];
  effectiveFrom: string;
  effectiveUntil?: string;
  status: 'draft' | 'active' | 'paused' | 'expired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyValidationRequest {
  userId: string;
  merchantId: string;
  amount: number;
  timestamp: string;
  userCredentials?: CredentialType[];
}

export interface PolicyValidationResult {
  allowed: boolean;
  appliedPolicies: string[];
  violations: {
    policyId: string;
    ruleId: string;
    message: string;
  }[];
  modifiedAmount?: number; // If discount applied
  discountApplied?: number;
}

/**
 * Policy Engine
 *
 * Evaluates transactions against configured policies.
 * This is where SW developer adds value - not in financial processing.
 */
class PolicyEngineService {
  private policies: Map<string, Policy> = new Map();
  private merchantCategories: Map<string, string[]> = new Map();
  private regionMerchants: Map<string, string[]> = new Map();

  /**
   * Create a new policy
   * Requires admin DID signature for audit
   */
  async createPolicy(
    policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string,
    adminDID: string
  ): Promise<Policy> {
    const newPolicy: Policy = {
      ...policy,
      id: `POL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(newPolicy.id, newPolicy);

    // Log for audit trail
    await auditLog.logPolicyChange(
      adminId,
      adminDID,
      newPolicy.id,
      'POLICY_CREATED',
      undefined,
      newPolicy
    );

    return newPolicy;
  }

  /**
   * Update existing policy
   * Changes are tracked in audit log
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Policy>,
    adminId: string,
    adminDID: string
  ): Promise<Policy | null> {
    const existing = this.policies.get(policyId);
    if (!existing) return null;

    const updated: Policy = {
      ...existing,
      ...updates,
      id: policyId,
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(policyId, updated);

    await auditLog.logPolicyChange(
      adminId,
      adminDID,
      policyId,
      'POLICY_UPDATED',
      existing,
      updated
    );

    return updated;
  }

  /**
   * Validate a transaction against active policies
   * Called before requesting payment from bank
   */
  async validateTransaction(
    request: PolicyValidationRequest
  ): Promise<PolicyValidationResult> {
    const violations: PolicyValidationResult['violations'] = [];
    const appliedPolicies: string[] = [];
    let discountApplied = 0;

    // Get active policies for the municipality
    const activePolicies = Array.from(this.policies.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => {
        // Sort by rule priority
        const aMin = Math.min(...a.rules.map(r => r.priority));
        const bMin = Math.min(...b.rules.map(r => r.priority));
        return aMin - bMin;
      });

    for (const policy of activePolicies) {
      appliedPolicies.push(policy.id);

      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        const ruleResult = await this.evaluateRule(rule, request);

        if (!ruleResult.passed) {
          violations.push({
            policyId: policy.id,
            ruleId: rule.id,
            message: ruleResult.message || 'Policy violation',
          });
        }

        if (ruleResult.discount) {
          discountApplied += ruleResult.discount;
        }
      }
    }

    return {
      allowed: violations.length === 0,
      appliedPolicies,
      violations,
      modifiedAmount: discountApplied > 0 ? request.amount - discountApplied : undefined,
      discountApplied: discountApplied > 0 ? discountApplied : undefined,
    };
  }

  /**
   * Evaluate a single policy rule
   */
  private async evaluateRule(
    rule: PolicyRule,
    request: PolicyValidationRequest
  ): Promise<{
    passed: boolean;
    message?: string;
    discount?: number;
  }> {
    switch (rule.type) {
      case 'REGION_RESTRICTION': {
        const allowedRegions = rule.parameters.regions as string[];
        const merchantRegion = await this.getMerchantRegion(request.merchantId);
        if (!allowedRegions.includes(merchantRegion)) {
          return { passed: false, message: 'Merchant outside allowed region' };
        }
        return { passed: true };
      }

      case 'MERCHANT_CATEGORY': {
        const allowedCategories = rule.parameters.categories as string[];
        const merchantCategories = await this.getMerchantCategories(request.merchantId);
        const hasAllowed = merchantCategories.some(c => allowedCategories.includes(c));
        if (!hasAllowed) {
          return { passed: false, message: 'Merchant category not eligible' };
        }
        return { passed: true };
      }

      case 'USAGE_LIMIT_TRANSACTION': {
        const maxAmount = rule.parameters.maxAmount as number;
        if (request.amount > maxAmount) {
          return {
            passed: false,
            message: `Transaction exceeds limit of ${maxAmount}`,
          };
        }
        return { passed: true };
      }

      case 'USER_ELIGIBILITY': {
        const requiredCredentials = rule.parameters.credentials as CredentialType[];
        const userCredentials = request.userCredentials || [];
        const hasRequired = requiredCredentials.some(c => userCredentials.includes(c));
        if (!hasRequired) {
          return { passed: false, message: 'User not eligible for this policy' };
        }
        return { passed: true };
      }

      case 'DISCOUNT_RATE': {
        const rate = rule.parameters.rate as number;
        const maxDiscount = rule.parameters.maxDiscount as number;
        const discount = Math.min(request.amount * rate, maxDiscount);
        return { passed: true, discount };
      }

      case 'TIME_RESTRICTION': {
        const startHour = rule.parameters.startHour as number;
        const endHour = rule.parameters.endHour as number;
        const txHour = new Date(request.timestamp).getHours();
        if (txHour < startHour || txHour >= endHour) {
          return { passed: false, message: 'Outside operating hours' };
        }
        return { passed: true };
      }

      default:
        return { passed: true };
    }
  }

  /**
   * Get all policies for a municipality
   */
  async getPolicies(municipalityId: string): Promise<Policy[]> {
    return Array.from(this.policies.values())
      .filter(p => p.municipalityId === municipalityId);
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    return this.policies.get(policyId) || null;
  }

  // Helper methods

  private async getMerchantRegion(_merchantId: string): Promise<string> {
    // TODO: In production, lookup from merchant database
    return 'jeonju';
  }

  private async getMerchantCategories(merchantId: string): Promise<string[]> {
    // TODO: In production, lookup from merchant database
    return this.merchantCategories.get(merchantId) || ['general'];
  }

  /**
   * Register merchant with categories
   * Called when merchant is onboarded
   */
  async registerMerchant(
    merchantId: string,
    categories: string[],
    region: string
  ): Promise<void> {
    this.merchantCategories.set(merchantId, categories);

    const regionList = this.regionMerchants.get(region) || [];
    regionList.push(merchantId);
    this.regionMerchants.set(region, regionList);
  }
}

// Singleton instance
export const policyEngine = new PolicyEngineService();
export default policyEngine;
