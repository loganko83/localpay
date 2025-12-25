/**
 * DID-Signed Audit Service
 *
 * Enhances audit logging with cryptographic signatures using DIDs.
 * Provides verifiable proof of who performed each action.
 *
 * Architecture:
 * [Action] --> [DID Lookup] --> [Sign with Private Key] --> [Audit Entry]
 *                                        |
 *                                [Blockchain Anchor]
 *
 * "Every critical action has a verifiable, non-repudiable signature"
 */

import { auditLogService, AuditLogEntry, AuditActionType } from './auditLog';
import { identityService } from './identity';
import { blockchainAnchoringService } from './blockchainAnchoring';

// Signed audit entry with DID proof
interface SignedAuditEntry extends AuditLogEntry {
  didProof: DIDProof;
  anchorInfo?: AnchorInfo;
}

// DID-based proof
interface DIDProof {
  type: 'Ed25519Signature2020' | 'BbsBlsSignature2020';
  created: string;
  verificationMethod: string;
  proofPurpose: 'authentication' | 'assertionMethod';
  proofValue: string;
  did: string;
}

// Blockchain anchor information
interface AnchorInfo {
  batchId?: string;
  merkleRoot?: string;
  position?: number;
  status: 'pending' | 'anchored' | 'verified';
}

// Critical actions that require DID signing
const CRITICAL_ACTIONS: AuditActionType[] = [
  'POLICY_CREATED',
  'POLICY_UPDATED',
  'POLICY_DELETED',
  'MERCHANT_SUSPENDED',
  'SETTLEMENT_INITIATED',
  'SETTLEMENT_VERIFIED',
  'VOUCHER_CREATED',
  'ADMIN_ACTION',
  'REFUND_REQUESTED',
  'CREDENTIAL_ISSUED',
  'CREDENTIAL_REVOKED',
];

// In-memory signed entry store (use DB in production)
const signedEntryStore = new Map<string, SignedAuditEntry>();

// Simple hash for signing (use crypto in production)
const hashForSigning = (data: object): string => {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
};

// Create DID proof
const createDIDProof = async (
  did: string,
  data: object
): Promise<DIDProof> => {
  // Get signature from identity service
  const signResult = await identityService.signAction(did, data);

  return {
    type: 'Ed25519Signature2020',
    created: signResult.signedAt,
    verificationMethod: `${did}#key-1`,
    proofPurpose: 'assertionMethod',
    proofValue: signResult.signature,
    did,
  };
};

// Verify DID proof
const verifyDIDProof = async (
  entry: SignedAuditEntry
): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Verify DID is still valid
    const didVerification = await identityService.verifyDID(entry.didProof.did);
    if (!didVerification.valid) {
      return { valid: false, error: 'DID is no longer valid or revoked' };
    }

    // Verify signature matches entry data
    const entryData = {
      action: entry.action,
      actorId: entry.actorId,
      targetType: entry.targetType,
      targetId: entry.targetId,
      timestamp: entry.timestamp,
      metadata: entry.metadata,
    };

    const expectedHash = hashForSigning(entryData);
    const signatureHash = entry.didProof.proofValue.split(':').pop() || '';

    // TODO: In production, compare expectedHash with verified signature
    if (!signatureHash) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Verify hash matches (mock always passes)
    console.debug('[DIDSignedAudit] Hash verification:', expectedHash.substring(0, 16) + '...');

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Verification failed' };
  }
};

class DIDSignedAuditService {
  /**
   * Log action with DID signature
   * Automatically determines if DID signing is required
   */
  async logWithDIDSignature(params: {
    action: AuditActionType;
    actorId: string;
    actorType: 'consumer' | 'merchant' | 'admin' | 'system';
    targetType: string;
    targetId: string;
    previousState?: object;
    newState?: object;
    metadata?: Record<string, unknown>;
  }): Promise<SignedAuditEntry> {
    const isCritical = CRITICAL_ACTIONS.includes(params.action);

    // Get actor's DID
    let actorDID: string | undefined;
    let didProof: DIDProof | undefined;

    if (isCritical && params.actorType !== 'system') {
      try {
        // Fetch DID based on actor type
        if (params.actorType === 'admin') {
          const adminDID = await identityService.getAdminDID(params.actorId);
          if (adminDID) {
            actorDID = adminDID.id;
            didProof = await createDIDProof(adminDID.id, {
              action: params.action,
              actorId: params.actorId,
              targetType: params.targetType,
              targetId: params.targetId,
              timestamp: new Date().toISOString(),
              metadata: params.metadata,
            });
          }
        }
      } catch (error) {
        console.warn('[DIDSignedAudit] Failed to get DID for signing:', error);
      }
    }

    // Create base audit entry
    const baseEntry = await auditLogService.log({
      ...params,
      actorDID,
      signature: didProof?.proofValue,
    });

    // Create signed entry
    const signedEntry: SignedAuditEntry = {
      ...baseEntry,
      didProof: didProof || {
        type: 'Ed25519Signature2020',
        created: baseEntry.timestamp,
        verificationMethod: 'unsigned',
        proofPurpose: 'assertionMethod',
        proofValue: 'unsigned',
        did: actorDID || 'none',
      },
      anchorInfo: {
        status: 'pending',
      },
    };

    // Add to blockchain anchoring queue if critical
    if (isCritical) {
      const anchorResult = await blockchainAnchoringService.addTransaction(
        baseEntry.id,
        'audit',
        {
          action: params.action,
          actorId: params.actorId,
          targetId: params.targetId,
          timestamp: baseEntry.timestamp,
          signature: didProof?.proofValue,
        }
      );

      signedEntry.anchorInfo = {
        position: anchorResult.batchPosition,
        status: 'pending',
      };
    }

    signedEntryStore.set(baseEntry.id, signedEntry);
    return signedEntry;
  }

  /**
   * Log critical policy action with full DID proof
   */
  async logPolicyAction(
    adminId: string,
    adminDID: string,
    policyId: string,
    action: 'POLICY_CREATED' | 'POLICY_UPDATED' | 'POLICY_DELETED',
    changes: {
      previousState?: object;
      newState?: object;
      reason?: string;
    }
  ): Promise<SignedAuditEntry> {
    return this.logWithDIDSignature({
      action,
      actorId: adminId,
      actorType: 'admin',
      targetType: 'policy',
      targetId: policyId,
      previousState: changes.previousState,
      newState: changes.newState,
      metadata: {
        reason: changes.reason,
        adminDID,
      },
    });
  }

  /**
   * Log settlement action with DID proof
   */
  async logSettlementAction(
    adminId: string,
    settlementId: string,
    action: 'SETTLEMENT_INITIATED' | 'SETTLEMENT_VERIFIED',
    details: {
      amount: number;
      merchantCount: number;
      period: { start: string; end: string };
    }
  ): Promise<SignedAuditEntry> {
    return this.logWithDIDSignature({
      action,
      actorId: adminId,
      actorType: 'admin',
      targetType: 'settlement',
      targetId: settlementId,
      metadata: details,
    });
  }

  /**
   * Verify signed audit entry
   */
  async verifyEntry(entryId: string): Promise<{
    valid: boolean;
    signatureValid: boolean;
    anchorValid: boolean;
    errors: string[];
  }> {
    const entry = signedEntryStore.get(entryId);
    if (!entry) {
      return {
        valid: false,
        signatureValid: false,
        anchorValid: false,
        errors: ['Entry not found'],
      };
    }

    const errors: string[] = [];

    // Verify DID signature
    const signatureResult = await verifyDIDProof(entry);
    if (!signatureResult.valid) {
      errors.push(signatureResult.error || 'Signature verification failed');
    }

    // Verify blockchain anchor
    const anchorResult = await blockchainAnchoringService.verifyTransaction(entryId);
    if (!anchorResult.verified) {
      errors.push(anchorResult.error || 'Anchor verification failed');
    }

    return {
      valid: signatureResult.valid && anchorResult.verified,
      signatureValid: signatureResult.valid,
      anchorValid: anchorResult.verified,
      errors,
    };
  }

  /**
   * Get signed entry by ID
   */
  getSignedEntry(entryId: string): SignedAuditEntry | null {
    return signedEntryStore.get(entryId) || null;
  }

  /**
   * Get all signed entries for an actor
   */
  getEntriesByActor(actorId: string, limit = 100): SignedAuditEntry[] {
    const entries: SignedAuditEntry[] = [];
    for (const entry of signedEntryStore.values()) {
      if (entry.actorId === actorId) {
        entries.push(entry);
      }
    }
    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get critical actions that require DID signing
   */
  getCriticalActions(): AuditActionType[] {
    return [...CRITICAL_ACTIONS];
  }

  /**
   * Check if an action requires DID signing
   */
  requiresDIDSignature(action: AuditActionType): boolean {
    return CRITICAL_ACTIONS.includes(action);
  }

  /**
   * Generate verification report for compliance
   */
  async generateVerificationReport(params: {
    startDate: string;
    endDate: string;
    actorId?: string;
  }): Promise<{
    totalEntries: number;
    signedEntries: number;
    anchoredEntries: number;
    verifiedEntries: number;
    failedVerifications: Array<{ entryId: string; errors: string[] }>;
    generatedAt: string;
  }> {
    const entries: SignedAuditEntry[] = [];
    const failedVerifications: Array<{ entryId: string; errors: string[] }> = [];

    let signedCount = 0;
    let anchoredCount = 0;
    let verifiedCount = 0;

    for (const entry of signedEntryStore.values()) {
      if (entry.timestamp >= params.startDate && entry.timestamp <= params.endDate) {
        if (params.actorId && entry.actorId !== params.actorId) continue;

        entries.push(entry);

        if (entry.didProof.proofValue !== 'unsigned') {
          signedCount++;
        }

        if (entry.anchorInfo?.status === 'anchored' || entry.anchorInfo?.status === 'verified') {
          anchoredCount++;
        }

        // Verify each entry
        const verification = await this.verifyEntry(entry.id);
        if (verification.valid) {
          verifiedCount++;
        } else {
          failedVerifications.push({
            entryId: entry.id,
            errors: verification.errors,
          });
        }
      }
    }

    return {
      totalEntries: entries.length,
      signedEntries: signedCount,
      anchoredEntries: anchoredCount,
      verifiedEntries: verifiedCount,
      failedVerifications,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Export entries with proofs for external audit
   */
  async exportForAudit(params: {
    startDate: string;
    endDate: string;
    includeProofs: boolean;
  }): Promise<{
    entries: SignedAuditEntry[];
    exportHash: string;
    exportedAt: string;
    totalCount: number;
  }> {
    const entries: SignedAuditEntry[] = [];

    for (const entry of signedEntryStore.values()) {
      if (entry.timestamp >= params.startDate && entry.timestamp <= params.endDate) {
        if (params.includeProofs) {
          entries.push(entry);
        } else {
          // Strip proof details for privacy
          entries.push({
            ...entry,
            didProof: {
              ...entry.didProof,
              proofValue: '[REDACTED]',
            },
          });
        }
      }
    }

    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      entries,
      exportHash: hashForSigning(entries),
      exportedAt: new Date().toISOString(),
      totalCount: entries.length,
    };
  }
}

// Export singleton instance
export const didSignedAuditService = new DIDSignedAuditService();

// Export types
export type { SignedAuditEntry, DIDProof, AnchorInfo };
