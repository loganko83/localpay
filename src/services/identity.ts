/**
 * DID/VC Identity Service
 *
 * Integration with SuperWallet DID BaaS
 * Server: https://trendy.storydot.kr/did-baas
 *
 * Purpose:
 * - Policy target verification (not KYC replacement)
 * - Responsible party identification for audit
 * - Merchant credential verification
 *
 * "DID = Policy execution automation tool"
 * "VC = Administrative efficiency improvement tool"
 */

// DID BaaS API Configuration
const DID_BAAS_CONFIG = {
  baseUrl: import.meta.env.VITE_DID_BAAS_URL || 'https://trendy.storydot.kr/did-baas',
  apiKey: import.meta.env.VITE_DID_BAAS_API_KEY || '',
};

// Verifiable Credential Types
export type CredentialType =
  | 'RESIDENT'           // Regional resident status
  | 'YOUTH'              // Youth program eligibility (19-34)
  | 'SENIOR'             // Senior citizen status (65+)
  | 'MULTI_CHILD'        // Multi-child family
  | 'LOW_INCOME'         // Low-income household
  | 'MERCHANT'           // Verified merchant
  | 'ADMIN'              // Platform administrator
  | 'POLICY_ELIGIBLE';   // Generic policy eligibility

// DID BaaS API Response Types
export interface DIDBAASResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface DIDIssueRequest {
  civilId: string;
  metadata?: Record<string, unknown>;
}

export interface DIDIssueResponse {
  didAddress: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface DIDVerifyResponse {
  valid: boolean;
  didAddress: string;
  status: 'active' | 'revoked' | 'unknown';
  metadata?: Record<string, unknown>;
}

export interface CredentialIssueRequest {
  holderDid: string;
  credentialType: string;
  claims: Record<string, unknown>;
  expirationDate?: string;
}

export interface CredentialIssueResponse {
  credentialId: string;
  holderDid: string;
  issuerDid: string;
  transactionHash: string;
}

export interface DID {
  id: string;                    // did:xphere:123456
  controller: string;            // Entity controlling this DID
  created: string;
  updated: string;
  publicKey: string;
  status: 'active' | 'revoked';
}

export interface VerifiableCredential {
  id: string;
  type: CredentialType[];
  issuer: string;                // DID of issuing authority
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;                  // DID of the subject
    claims: Record<string, unknown>;
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    signature: string;
  };
}

export interface VerificationResult {
  verified: boolean;
  credential?: VerifiableCredential;
  errors?: string[];
}

/**
 * Identity Service
 *
 * Integrates with SuperWallet DID BaaS at trendy.storydot.kr/did-baas
 * Manages DIDs and VCs for policy automation.
 * NOT a KYC service - identity verification is bank's responsibility.
 */
class IdentityService {
  private baseUrl: string;
  private apiKey: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = DID_BAAS_CONFIG.baseUrl;
    this.apiKey = DID_BAAS_CONFIG.apiKey;
  }

  /**
   * Make authenticated API request to DID BaaS
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<DIDBAASResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Use API Key for programmatic access
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`DID BaaS API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Issue a new DID via DID BaaS
   * POST /api/v1/did/issue
   */
  async issueDID(civilId: string, metadata?: Record<string, unknown>): Promise<DIDIssueResponse> {
    const response = await this.request<DIDIssueResponse>('/api/v1/did/issue', {
      method: 'POST',
      body: JSON.stringify({ civilId, metadata }),
    });
    return response.data;
  }

  /**
   * Verify DID status
   * GET /api/v1/did/verify/{didAddress}
   */
  async verifyDID(didAddress: string): Promise<DIDVerifyResponse> {
    const response = await this.request<DIDVerifyResponse>(`/api/v1/did/verify/${didAddress}`);
    return response.data;
  }

  /**
   * Revoke a DID
   * POST /api/v1/did/revoke
   */
  async revokeDID(didAddress: string, reason: string): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>('/api/v1/did/revoke', {
      method: 'POST',
      body: JSON.stringify({ didAddress, reason }),
    });
    return response.data;
  }

  /**
   * List DIDs for organization
   * GET /api/v1/did/list
   */
  async listDIDs(page = 1, limit = 20): Promise<DID[]> {
    const response = await this.request<{ items: DID[] }>(`/api/v1/did/list?page=${page}&limit=${limit}`);
    return response.data.items;
  }

  /**
   * Issue Verifiable Credential
   * POST /api/v1/credentials/issue
   */
  async issueCredential(request: CredentialIssueRequest): Promise<CredentialIssueResponse> {
    const response = await this.request<CredentialIssueResponse>('/api/v1/credentials/issue', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data;
  }

  /**
   * Issue W3C format Verifiable Credential
   * GET /api/v1/w3c/credentials/issue
   */
  async issueW3CCredential(request: CredentialIssueRequest): Promise<VerifiableCredential> {
    const response = await this.request<VerifiableCredential>('/api/v1/w3c/credentials/issue', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data;
  }

  /**
   * Generate Zero-Knowledge Proof
   * POST /api/v1/zkp/proofs/generate
   */
  async generateZKProof(credentialId: string, disclosedAttributes: string[]): Promise<{
    proof: string;
    proofId: string;
  }> {
    const response = await this.request<{ proof: string; proofId: string }>('/api/v1/zkp/proofs/generate', {
      method: 'POST',
      body: JSON.stringify({ credentialId, disclosedAttributes }),
    });
    return response.data;
  }

  /**
   * Verify Zero-Knowledge Proof
   * POST /api/v1/zkp/proofs/verify
   */
  async verifyZKProof(proof: string): Promise<{ valid: boolean; claims?: Record<string, unknown> }> {
    const response = await this.request<{ valid: boolean; claims?: Record<string, unknown> }>('/api/v1/zkp/proofs/verify', {
      method: 'POST',
      body: JSON.stringify({ proof }),
    });
    return response.data;
  }

  /**
   * Sign with BBS+ signature (selective disclosure)
   * POST /api/v1/bbs/sign
   */
  async bbsSign(message: object): Promise<{ signature: string }> {
    const response = await this.request<{ signature: string }>('/api/v1/bbs/sign', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return response.data;
  }
  /**
   * Verify a credential for policy eligibility
   * Used to automate "is this user eligible for policy X?"
   */
  async verifyCredential(
    _credentialId: string,
    _requiredTypes: CredentialType[]
  ): Promise<VerificationResult> {
    // TODO: In production, verify against credential registry
    // Check signature, expiration, revocation status

    return {
      verified: true,
      credential: undefined, // Would contain actual credential
    };
  }

  /**
   * Check if user is eligible for a specific policy
   * Based on their VCs
   */
  async checkPolicyEligibility(
    _userDID: string,
    policyRequirements: CredentialType[]
  ): Promise<{
    eligible: boolean;
    matchedCredentials: CredentialType[];
    missingCredentials: CredentialType[];
  }> {
    // TODO: In production, fetch user's VCs and check against requirements

    return {
      eligible: true,
      matchedCredentials: policyRequirements,
      missingCredentials: [],
    };
  }

  /**
   * Get admin's DID for audit logging
   * Every administrative action should be signed
   */
  async getAdminDID(adminId: string): Promise<DID | null> {
    // TODO: In production, lookup admin's DID
    return {
      id: `did:localpay:admin:${adminId}`,
      controller: adminId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      publicKey: 'mock-public-key',
      status: 'active',
    };
  }

  /**
   * Verify merchant credential
   * Check if merchant is registered and active
   */
  async verifyMerchantCredential(_merchantDID: string): Promise<{
    verified: boolean;
    status: 'active' | 'suspended' | 'unknown';
    credential?: VerifiableCredential;
  }> {
    // TODO: In production, verify against merchant registry

    return {
      verified: true,
      status: 'active',
    };
  }

  /**
   * Issue a policy eligibility credential
   * Called when user qualifies for a specific policy
   */
  async issuePolicyCredential(
    userDID: string,
    policyId: string,
    credentialType: CredentialType,
    claims: Record<string, unknown>,
    expirationDays: number = 365
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const expiration = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

    const credential: VerifiableCredential = {
      id: `vc:localpay:${policyId}:${Date.now()}`,
      type: ['POLICY_ELIGIBLE', credentialType],
      issuer: 'did:localpay:issuer:jeonju-city',
      issuanceDate: now.toISOString(),
      expirationDate: expiration.toISOString(),
      credentialSubject: {
        id: userDID,
        claims: {
          policyId,
          ...claims,
        },
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: now.toISOString(),
        verificationMethod: 'did:localpay:issuer:jeonju-city#key-1',
        signature: 'mock-signature', // TODO: Real signature
      },
    };

    // TODO: Store credential in registry

    return credential;
  }

  /**
   * Sign an action with admin's DID
   * Used for audit trail
   */
  async signAction(
    adminDID: string,
    _actionData: object
  ): Promise<{
    signature: string;
    signedAt: string;
    did: string;
  }> {
    // TODO: In production, use actual cryptographic signing

    return {
      signature: `sig:${adminDID}:${Date.now()}`,
      signedAt: new Date().toISOString(),
      did: adminDID,
    };
  }
}

// Singleton instance
export const identityService = new IdentityService();
export default identityService;
