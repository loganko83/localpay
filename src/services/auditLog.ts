/**
 * Audit Logging Service
 *
 * This is a KEY RESPONSIBILITY of our platform.
 * We provide immutable audit trails for:
 * - Policy changes
 * - Administrative actions
 * - Transaction history (as reported by bank)
 * - Merchant status changes
 *
 * In production, this integrates with blockchain for immutability.
 * "Blockchain is used for verification, audit, and integrity purposes only"
 */

export type AuditActionType =
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'POLICY_DELETED'
  | 'MERCHANT_REGISTERED'
  | 'MERCHANT_UPDATED'
  | 'MERCHANT_SUSPENDED'
  | 'MERCHANT_ACTIVATED'
  | 'USER_REGISTERED'
  | 'USER_UPDATED'
  | 'ADMIN_ACTION'
  | 'SETTLEMENT_INITIATED'
  | 'SETTLEMENT_VERIFIED'
  | 'VOUCHER_CREATED'
  | 'VOUCHER_UPDATED'
  | 'VOUCHER_EXPIRED'
  // Transaction-related actions (wallet operations)
  | 'BALANCE_SYNC'
  | 'TOPUP_REQUESTED'
  | 'TOPUP_COMPLETED'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_COMPLETED'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'
  // Identity actions
  | 'CREDENTIAL_ISSUED'
  | 'CREDENTIAL_VERIFIED'
  | 'CREDENTIAL_REVOKED'
  // Security actions
  | 'SESSION_CREATED'
  | 'SESSION_DESTROYED'
  | 'ALL_SESSIONS_DESTROYED'
  | 'FRAUD_CHECK'
  | 'FRAUD_REPORT'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'OTP_REQUESTED'
  | 'OTP_VERIFIED'
  | 'OTP_VERIFY_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'RECOVERY_CODE_USED'
  | 'RECOVERY_CODES_REGENERATED'
  // Compliance actions
  | 'TRANSACTION_MONITORED'
  | 'STR_SUBMITTED'
  // API and system actions
  | 'API_REQUEST'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BLOCKCHAIN_TX_ADDED'
  | 'BLOCKCHAIN_ANCHOR_CONFIRMED'
  | 'BLOCKCHAIN_ANCHOR_FAILED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  actorId: string;
  actorType: 'consumer' | 'merchant' | 'admin' | 'system' | 'producer';
  actorDID?: string; // DID for identity verification
  targetType: string;
  targetId: string;
  previousState?: object;
  newState?: object;
  metadata?: Record<string, unknown>;
  signature?: string; // Digital signature for verification
  blockchainHash?: string; // Hash anchored to blockchain
}

export interface AuditQuery {
  startDate?: string;
  endDate?: string;
  action?: AuditActionType;
  actorId?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit Logging Service
 *
 * Responsibilities:
 * - Log all policy and administrative changes
 * - Maintain immutable audit trail
 * - Support compliance and regulatory audits
 * - Enable quick verification during inspections
 */
class AuditLogService {
  private logs: AuditLogEntry[] = [];

  /**
   * Log an action
   * In production: Writes to database and anchors hash to blockchain
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'blockchainHash'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      blockchainHash: await this.anchorToBlockchain(entry),
    };

    this.logs.push(fullEntry);

    // TODO: In production, persist to database
    console.log('[AUDIT]', fullEntry.action, fullEntry.targetType, fullEntry.targetId);

    return fullEntry;
  }

  /**
   * Log policy change
   * Critical for regulatory compliance
   */
  async logPolicyChange(
    actorId: string,
    actorDID: string,
    policyId: string,
    action: 'POLICY_CREATED' | 'POLICY_UPDATED' | 'POLICY_DELETED',
    previousState?: object,
    newState?: object
  ): Promise<AuditLogEntry> {
    return this.log({
      action,
      actorId,
      actorType: 'admin',
      actorDID,
      targetType: 'policy',
      targetId: policyId,
      previousState,
      newState,
      signature: await this.signEntry(actorDID, { action, policyId, newState }),
    });
  }

  /**
   * Log merchant status change
   */
  async logMerchantChange(
    actorId: string,
    merchantId: string,
    action: 'MERCHANT_REGISTERED' | 'MERCHANT_UPDATED' | 'MERCHANT_SUSPENDED' | 'MERCHANT_ACTIVATED',
    previousState?: object,
    newState?: object
  ): Promise<AuditLogEntry> {
    return this.log({
      action,
      actorId,
      actorType: 'admin',
      targetType: 'merchant',
      targetId: merchantId,
      previousState,
      newState,
    });
  }

  /**
   * Log settlement verification
   * Important for financial audit trails
   */
  async logSettlementAction(
    actorId: string,
    settlementId: string,
    action: 'SETTLEMENT_INITIATED' | 'SETTLEMENT_VERIFIED',
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.log({
      action,
      actorId,
      actorType: 'admin',
      targetType: 'settlement',
      targetId: settlementId,
      metadata,
    });
  }

  /**
   * Query audit logs
   * Used for compliance reporting and audit response
   */
  async query(params: AuditQuery): Promise<AuditLogEntry[]> {
    let results = [...this.logs];

    if (params.startDate) {
      results = results.filter(log => log.timestamp >= params.startDate!);
    }
    if (params.endDate) {
      results = results.filter(log => log.timestamp <= params.endDate!);
    }
    if (params.action) {
      results = results.filter(log => log.action === params.action);
    }
    if (params.actorId) {
      results = results.filter(log => log.actorId === params.actorId);
    }
    if (params.targetId) {
      results = results.filter(log => log.targetId === params.targetId);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Verify audit log integrity
   * Check blockchain hash matches stored data
   */
  async verifyIntegrity(logId: string): Promise<{
    verified: boolean;
    log: AuditLogEntry | null;
    blockchainRecord?: object;
  }> {
    const log = this.logs.find(l => l.id === logId);
    if (!log) {
      return { verified: false, log: null };
    }

    // TODO: In production, verify against blockchain
    const blockchainRecord = await this.getBlockchainRecord(log.blockchainHash);

    return {
      verified: true, // TODO: Actually verify hash
      log,
      blockchainRecord,
    };
  }

  /**
   * Export audit logs for regulatory submission
   */
  async exportForAudit(params: AuditQuery): Promise<{
    logs: AuditLogEntry[];
    exportTimestamp: string;
    totalCount: number;
    integrityHash: string;
  }> {
    const logs = await this.query(params);
    return {
      logs,
      exportTimestamp: new Date().toISOString(),
      totalCount: logs.length,
      integrityHash: await this.computeExportHash(logs),
    };
  }

  // Private methods

  private async anchorToBlockchain(entry: object): Promise<string> {
    // TODO: In production, submit hash to blockchain
    // For now, return mock hash
    const dataString = JSON.stringify(entry);
    return `BC-${this.simpleHash(dataString)}`;
  }

  private async signEntry(did: string, _data: object): Promise<string> {
    // TODO: In production, use DID-based signing
    return `SIG-${did}-${Date.now()}`;
  }

  private async getBlockchainRecord(hash?: string): Promise<object | undefined> {
    // TODO: In production, fetch from blockchain
    if (!hash) return undefined;
    return { hash, verified: true };
  }

  private async computeExportHash(logs: AuditLogEntry[]): Promise<string> {
    const dataString = JSON.stringify(logs);
    return this.simpleHash(dataString);
  }

  private simpleHash(str: string): string {
    // Simple hash for development - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance
export const auditLog = new AuditLogService();
export const auditLogService = auditLog; // Alias for walletStore
export default auditLog;
