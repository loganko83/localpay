/**
 * DID-BaaS Client
 * Integration with our DID-BaaS service at trendy.storydot.kr/did-baas/
 */

import { DID_BAAS_CONFIG } from '../blockchain/config';

// Types based on DID-BaaS SDK
export interface DidBaasConfig {
  baseUrl: string;
  apiKey?: string;
  jwtToken?: string;
  timeout?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp?: string;
}

export interface Did {
  id: string;
  didAddress: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REVOKED';
  txHash?: string;
  blockNumber?: number;
  createdAt: string;
  confirmedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface DidDocument {
  '@context': string[];
  id: string;
  controller?: string | string[];
  verificationMethod?: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  service?: DidService[];
  created?: string;
  updated?: string;
  deactivated?: boolean;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: Record<string, unknown>;
  publicKeyMultibase?: string;
}

export interface DidService {
  id: string;
  type: string;
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

export interface VerifiableCredential {
  '@context': (string | Record<string, unknown>)[];
  id?: string;
  type: string[];
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id?: string;
    [key: string]: unknown;
  };
  credentialStatus?: {
    id: string;
    type: string;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue?: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface VerifyDidResponse {
  valid: boolean;
  did?: Did;
  onChainStatus?: {
    isValid: boolean;
    issuedAt: number;
    revokedAt?: number;
  };
  message?: string;
}

export interface IssueCredentialRequest {
  subjectDid: string;
  credentialType: string;
  claims: Record<string, unknown>;
  expirationDate?: string;
}

class DidBaasClient {
  private config: DidBaasConfig;
  private accessToken: string | null = null;

  constructor(config?: Partial<DidBaasConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || DID_BAAS_CONFIG.baseUrl,
      apiKey: config?.apiKey,
      jwtToken: config?.jwtToken,
      timeout: config?.timeout || 30000,
    };
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Set JWT token for authentication
   */
  setJwtToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Build headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || data.message || 'Request failed');
    }

    return data.data as T;
  }

  // ==================== Authentication ====================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>(
      'POST',
      DID_BAAS_CONFIG.endpoints.auth.login,
      { email, password }
    );
    this.accessToken = result.accessToken;
    return result;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>(
      'POST',
      DID_BAAS_CONFIG.endpoints.auth.refresh,
      { refreshToken }
    );
    this.accessToken = result.accessToken;
    return result;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.request<void>('POST', DID_BAAS_CONFIG.endpoints.auth.logout);
    this.accessToken = null;
  }

  // ==================== DID Operations ====================

  /**
   * Issue a new DID
   */
  async issueDid(metadata?: Record<string, unknown>): Promise<Did> {
    return this.request<Did>('POST', DID_BAAS_CONFIG.endpoints.did.issue, { metadata });
  }

  /**
   * Resolve a DID to its document
   */
  async resolveDid(didAddress: string): Promise<DidDocument> {
    return this.request<DidDocument>(
      'GET',
      `${DID_BAAS_CONFIG.endpoints.did.resolve}/${encodeURIComponent(didAddress)}`
    );
  }

  /**
   * Verify a DID
   */
  async verifyDid(didAddress: string): Promise<VerifyDidResponse> {
    return this.request<VerifyDidResponse>(
      'GET',
      `${DID_BAAS_CONFIG.endpoints.did.verify}/${encodeURIComponent(didAddress)}`
    );
  }

  /**
   * Revoke a DID
   */
  async revokeDid(didAddress: string, reason: string): Promise<void> {
    return this.request<void>('POST', DID_BAAS_CONFIG.endpoints.did.revoke, {
      didAddress,
      reason,
    });
  }

  /**
   * List DIDs
   */
  async listDids(page: number = 0, size: number = 20): Promise<{ content: Did[]; totalElements: number }> {
    return this.request<{ content: Did[]; totalElements: number }>(
      'GET',
      `${DID_BAAS_CONFIG.endpoints.did.list}?page=${page}&size=${size}`
    );
  }

  // ==================== Credential Operations ====================

  /**
   * Issue a verifiable credential
   */
  async issueCredential(request: IssueCredentialRequest): Promise<VerifiableCredential> {
    return this.request<VerifiableCredential>(
      'POST',
      DID_BAAS_CONFIG.endpoints.credentials.issue,
      request
    );
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credential: VerifiableCredential): Promise<{
    valid: boolean;
    checks: Record<string, boolean>;
    errors?: string[];
  }> {
    return this.request<{
      valid: boolean;
      checks: Record<string, boolean>;
      errors?: string[];
    }>('POST', DID_BAAS_CONFIG.endpoints.credentials.verify, { credential });
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string, reason: string): Promise<void> {
    return this.request<void>('POST', DID_BAAS_CONFIG.endpoints.credentials.revoke, {
      credentialId,
      reason,
    });
  }

  /**
   * List credentials
   */
  async listCredentials(
    page: number = 0,
    size: number = 20
  ): Promise<{ content: VerifiableCredential[]; totalElements: number }> {
    return this.request<{ content: VerifiableCredential[]; totalElements: number }>(
      'GET',
      `${DID_BAAS_CONFIG.endpoints.credentials.list}?page=${page}&size=${size}`
    );
  }

  // ==================== W3C Verification ====================

  /**
   * W3C compliant verification
   */
  async verifyW3c(credential: VerifiableCredential): Promise<{
    verified: boolean;
    results: Array<{
      proof: Record<string, unknown>;
      verified: boolean;
      purposeResult?: { valid: boolean };
    }>;
  }> {
    return this.request<{
      verified: boolean;
      results: Array<{
        proof: Record<string, unknown>;
        verified: boolean;
        purposeResult?: { valid: boolean };
      }>;
    }>('POST', DID_BAAS_CONFIG.endpoints.w3c.verify, { verifiableCredential: credential });
  }

  // ==================== Batch Operations ====================

  /**
   * Batch issue DIDs
   */
  async batchIssueDids(count: number): Promise<Did[]> {
    return this.request<Did[]>('POST', DID_BAAS_CONFIG.endpoints.batch.issueDids, { count });
  }

  /**
   * Batch issue credentials
   */
  async batchIssueCredentials(
    requests: IssueCredentialRequest[]
  ): Promise<VerifiableCredential[]> {
    return this.request<VerifiableCredential[]>(
      'POST',
      DID_BAAS_CONFIG.endpoints.batch.issueCredentials,
      { requests }
    );
  }
}

// Singleton instance
export const didBaasClient = new DidBaasClient();
export default didBaasClient;
