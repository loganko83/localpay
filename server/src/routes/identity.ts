/**
 * Identity Routes
 * DID/VC (Decentralized Identity / Verifiable Credentials) integration
 * Integration with DID-BaaS service at trendy.storydot.kr/did-baas/
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== DID-BaaS Configuration ====================

const DID_BAAS_CONFIG = {
  baseUrl: 'https://trendy.storydot.kr/did-baas/api/v1',
  issuerDid: 'did:xphere:issuer:localpay',
  networkId: 'xphere-mainnet',
};

// ==================== Type Definitions ====================

interface UserDidRow {
  id: string;
  user_id: string;
  did: string;
  did_document: string | null;
  public_key: string | null;
  status: 'pending' | 'active' | 'revoked';
  created_at: string;
  updated_at: string;
}

interface VerifiableCredentialRow {
  id: string;
  user_id: string;
  credential_type: string;
  issuer: string;
  subject_did: string;
  claims: string;
  proof: string | null;
  issuance_date: string;
  expiration_date: string | null;
  status: 'valid' | 'expired' | 'revoked';
  blockchain_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface CredentialRequestRow {
  id: string;
  user_id: string;
  credential_type: string;
  required_claims: string;
  supporting_documents: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Credential Types ====================

const CREDENTIAL_TYPES = {
  resident: {
    name: 'Resident Credential',
    description: 'Proof of residency in a specific region',
    requiredClaims: ['region', 'address', 'verifiedAt'],
    validityDays: 365,
  },
  youth: {
    name: 'Youth Credential',
    description: 'Age verification for youth benefits (19-34 years)',
    requiredClaims: ['birthDate', 'ageRange', 'verifiedAt'],
    validityDays: 365,
  },
  senior: {
    name: 'Senior Credential',
    description: 'Age verification for senior benefits (65+ years)',
    requiredClaims: ['birthDate', 'ageRange', 'verifiedAt'],
    validityDays: 365,
  },
  disability: {
    name: 'Disability Credential',
    description: 'Disability status verification',
    requiredClaims: ['disabilityType', 'grade', 'verifiedAt'],
    validityDays: 365,
  },
  income: {
    name: 'Income Credential',
    description: 'Income level verification for welfare eligibility',
    requiredClaims: ['incomeLevel', 'verifiedAt'],
    validityDays: 180,
  },
  merchant: {
    name: 'Merchant Credential',
    description: 'Verified merchant status',
    requiredClaims: ['businessNumber', 'storeName', 'category', 'verifiedAt'],
    validityDays: 365,
  },
  kyc: {
    name: 'KYC Credential',
    description: 'Know Your Customer verification',
    requiredClaims: ['kycLevel', 'verifiedAt', 'method'],
    validityDays: 365,
  },
};

// ==================== Helper Functions ====================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function generateDid(userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `did:xphere:user:${timestamp}${random}`;
}

function generateKeyPair(): { publicKey: string; privateKey: string } {
  // Mock key generation - in production would use proper crypto
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return {
    publicKey: `0x${timestamp}${random}`.substring(0, 66).padEnd(66, '0'),
    privateKey: `0x${random}${timestamp}`.substring(0, 66).padEnd(66, '0'),
  };
}

function generateProof(data: Record<string, unknown>): string {
  // Mock proof generation
  const serialized = JSON.stringify(data);
  const hash = serialized.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

function logAudit(
  action: string,
  actorId: string,
  actorType: string,
  targetType: string,
  targetId: string,
  description: string,
  metadata?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), action, actorId, actorType, targetType, targetId, description, metadata ? JSON.stringify(metadata) : null);
}

// ==================== User Endpoints ====================

/**
 * GET /api/identity/did
 * Get user's DID
 */
router.get('/did', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    let userDid = db.prepare(`
      SELECT * FROM user_dids WHERE user_id = ?
    `).get(req.user!.userId) as UserDidRow | undefined;

    // Create DID if not exists
    if (!userDid) {
      const did = generateDid(req.user!.userId);
      const keyPair = generateKeyPair();
      const didDocument = {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [{
          id: `${did}#keys-1`,
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: did,
          publicKeyHex: keyPair.publicKey,
        }],
        authentication: [`${did}#keys-1`],
      };

      const didId = uuidv4();
      db.prepare(`
        INSERT INTO user_dids (id, user_id, did, did_document, public_key, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(didId, req.user!.userId, did, JSON.stringify(didDocument), keyPair.publicKey);

      userDid = db.prepare(`SELECT * FROM user_dids WHERE id = ?`).get(didId) as UserDidRow;

      // Log audit
      logAudit('DID_CREATED', req.user!.userId, req.user!.userType, 'did', didId,
        `DID created: ${did}`, { did });
    }

    res.json({
      success: true,
      data: {
        id: userDid.id,
        did: userDid.did,
        didDocument: userDid.did_document ? JSON.parse(userDid.did_document) : null,
        publicKey: userDid.public_key,
        status: userDid.status,
        createdAt: userDid.created_at,
      },
    });
  } catch (error) {
    console.error('Get DID error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get DID' } });
  }
});

/**
 * GET /api/identity/credentials
 * Get user's verifiable credentials
 */
router.get('/credentials', authenticate, [
  query('type').optional().isString(),
  query('status').optional().isIn(['valid', 'expired', 'revoked']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { type, status } = req.query;

    let whereClause = 'WHERE user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (type) {
      whereClause += ' AND credential_type = ?';
      params.push(String(type));
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(String(status));
    }

    const credentials = db.prepare(`
      SELECT * FROM verifiable_credentials
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params) as VerifiableCredentialRow[];

    // Check and update expired credentials
    const now = new Date();
    credentials.forEach(cred => {
      if (cred.status === 'valid' && cred.expiration_date && new Date(cred.expiration_date) < now) {
        db.prepare(`UPDATE verifiable_credentials SET status = 'expired' WHERE id = ?`).run(cred.id);
        cred.status = 'expired';
      }
    });

    res.json({
      success: true,
      data: {
        credentials: credentials.map(c => ({
          id: c.id,
          type: c.credential_type,
          typeName: CREDENTIAL_TYPES[c.credential_type as keyof typeof CREDENTIAL_TYPES]?.name || c.credential_type,
          issuer: c.issuer,
          subjectDid: c.subject_did,
          claims: JSON.parse(c.claims),
          issuanceDate: c.issuance_date,
          expirationDate: c.expiration_date,
          status: c.status,
          blockchainHash: c.blockchain_hash,
          createdAt: c.created_at,
        })),
        availableTypes: Object.entries(CREDENTIAL_TYPES).map(([key, config]) => ({
          type: key,
          name: config.name,
          description: config.description,
        })),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get credentials error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credentials' } });
  }
});

/**
 * GET /api/identity/credentials/:id
 * Get credential details
 */
router.get('/credentials/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const credential = db.prepare(`
      SELECT * FROM verifiable_credentials WHERE id = ? AND user_id = ?
    `).get(id, req.user!.userId) as VerifiableCredentialRow | undefined;

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    const typeConfig = CREDENTIAL_TYPES[credential.credential_type as keyof typeof CREDENTIAL_TYPES];

    res.json({
      success: true,
      data: {
        id: credential.id,
        type: credential.credential_type,
        typeName: typeConfig?.name || credential.credential_type,
        typeDescription: typeConfig?.description || null,
        issuer: credential.issuer,
        subjectDid: credential.subject_did,
        claims: JSON.parse(credential.claims),
        proof: credential.proof ? JSON.parse(credential.proof) : null,
        issuanceDate: credential.issuance_date,
        expirationDate: credential.expiration_date,
        status: credential.status,
        blockchainHash: credential.blockchain_hash,
        createdAt: credential.created_at,
        updatedAt: credential.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get credential details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credential details' } });
  }
});

/**
 * POST /api/identity/verify
 * Verify a credential
 */
router.post('/verify', authenticate, [
  body('credentialId').isString().notEmpty().withMessage('Credential ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { credentialId } = req.body;

    const credential = db.prepare(`
      SELECT * FROM verifiable_credentials WHERE id = ?
    `).get(credentialId) as VerifiableCredentialRow | undefined;

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    // Verification checks
    const checks = {
      exists: true,
      notRevoked: credential.status !== 'revoked',
      notExpired: !credential.expiration_date || new Date(credential.expiration_date) > new Date(),
      validIssuer: credential.issuer === DID_BAAS_CONFIG.issuerDid,
      hasProof: !!credential.proof,
      blockchainAnchored: !!credential.blockchain_hash,
    };

    const isValid = Object.values(checks).every(v => v);

    // Log verification
    logAudit('CREDENTIAL_VERIFIED', req.user!.userId, req.user!.userType, 'credential', credentialId,
      `Credential verification: ${isValid ? 'passed' : 'failed'}`,
      { credentialType: credential.credential_type, isValid, checks });

    res.json({
      success: true,
      data: {
        credentialId,
        credentialType: credential.credential_type,
        isValid,
        checks,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Verify credential error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify credential' } });
  }
});

/**
 * POST /api/identity/request-vc
 * Request a new verifiable credential
 */
router.post('/request-vc', authenticate, [
  body('credentialType').isIn(Object.keys(CREDENTIAL_TYPES)).withMessage('Invalid credential type'),
  body('claims').isObject().withMessage('Claims must be an object'),
  body('supportingDocuments').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { credentialType, claims, supportingDocuments } = req.body;

    // Check if user has DID
    const userDid = db.prepare(`SELECT * FROM user_dids WHERE user_id = ?`).get(req.user!.userId) as UserDidRow | undefined;

    if (!userDid || userDid.status !== 'active') {
      throw new BadRequestError('Active DID required to request credentials');
    }

    // Validate required claims
    const typeConfig = CREDENTIAL_TYPES[credentialType as keyof typeof CREDENTIAL_TYPES];
    const missingClaims = typeConfig.requiredClaims.filter(c => !claims[c]);

    if (missingClaims.length > 0) {
      throw new BadRequestError(`Missing required claims: ${missingClaims.join(', ')}`);
    }

    // Check for existing pending request
    const existingRequest = db.prepare(`
      SELECT * FROM credential_requests
      WHERE user_id = ? AND credential_type = ? AND status = 'pending'
    `).get(req.user!.userId, credentialType);

    if (existingRequest) {
      throw new BadRequestError('You already have a pending request for this credential type');
    }

    // Create request
    const requestId = uuidv4();
    db.prepare(`
      INSERT INTO credential_requests (
        id, user_id, credential_type, required_claims, supporting_documents, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(
      requestId,
      req.user!.userId,
      credentialType,
      JSON.stringify(claims),
      supportingDocuments ? JSON.stringify(supportingDocuments) : null
    );

    // Log audit
    logAudit('VC_REQUESTED', req.user!.userId, req.user!.userType, 'credential_request', requestId,
      `Requested ${typeConfig.name}`,
      { credentialType, claims: Object.keys(claims) });

    res.status(201).json({
      success: true,
      data: {
        requestId,
        credentialType,
        typeName: typeConfig.name,
        status: 'pending',
        message: 'Your credential request has been submitted for review',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Request VC error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to request credential' } });
  }
});

/**
 * GET /api/identity/requests
 * Get user's credential requests
 */
router.get('/requests', authenticate, [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'issued']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { status } = req.query;

    let whereClause = 'WHERE user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(String(status));
    }

    const requests = db.prepare(`
      SELECT * FROM credential_requests
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params) as CredentialRequestRow[];

    res.json({
      success: true,
      data: {
        requests: requests.map(r => ({
          id: r.id,
          credentialType: r.credential_type,
          typeName: CREDENTIAL_TYPES[r.credential_type as keyof typeof CREDENTIAL_TYPES]?.name || r.credential_type,
          claims: JSON.parse(r.required_claims),
          status: r.status,
          rejectionReason: r.rejection_reason,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get requests' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/identity/requests
 * Get all credential requests (admin)
 */
router.get('/admin/requests', authenticate, requireAdmin, [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'issued']),
  query('credentialType').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { status, credentialType, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND cr.status = ?';
      params.push(String(status));
    }

    if (credentialType) {
      whereClause += ' AND cr.credential_type = ?';
      params.push(String(credentialType));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM credential_requests cr ${whereClause}
    `).get(...params) as { count: number };

    // Get requests with user info
    const requests = db.prepare(`
      SELECT cr.*, u.name as user_name, u.email as user_email, ud.did as user_did
      FROM credential_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN user_dids ud ON cr.user_id = ud.user_id
      ${whereClause}
      ORDER BY cr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (CredentialRequestRow & { user_name: string; user_email: string; user_did: string })[];

    res.json({
      success: true,
      data: {
        requests: requests.map(r => ({
          id: r.id,
          user: {
            id: r.user_id,
            name: r.user_name,
            email: r.user_email,
            did: r.user_did,
          },
          credentialType: r.credential_type,
          typeName: CREDENTIAL_TYPES[r.credential_type as keyof typeof CREDENTIAL_TYPES]?.name || r.credential_type,
          claims: JSON.parse(r.required_claims),
          supportingDocuments: r.supporting_documents ? JSON.parse(r.supporting_documents) : null,
          status: r.status,
          rejectionReason: r.rejection_reason,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get admin requests error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get requests' } });
  }
});

/**
 * POST /api/admin/identity/issue-vc
 * Issue a verifiable credential (admin)
 */
router.post('/admin/issue-vc', authenticate, requireAdmin, [
  body('requestId').isString().notEmpty().withMessage('Request ID is required'),
  body('additionalClaims').optional().isObject(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { requestId, additionalClaims } = req.body;

    // Get request
    const request = db.prepare(`
      SELECT cr.*, ud.did as user_did
      FROM credential_requests cr
      LEFT JOIN user_dids ud ON cr.user_id = ud.user_id
      WHERE cr.id = ?
    `).get(requestId) as (CredentialRequestRow & { user_did: string }) | undefined;

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    if (request.status !== 'pending' && request.status !== 'approved') {
      throw new BadRequestError(`Cannot issue credential for ${request.status} request`);
    }

    if (!request.user_did) {
      throw new BadRequestError('User does not have an active DID');
    }

    // Get type config
    const typeConfig = CREDENTIAL_TYPES[request.credential_type as keyof typeof CREDENTIAL_TYPES];
    const validityDays = typeConfig?.validityDays || 365;

    // Merge claims
    const originalClaims = JSON.parse(request.required_claims);
    const finalClaims = { ...originalClaims, ...additionalClaims };

    // Calculate expiration
    const issuanceDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validityDays);

    // Generate proof
    const proofData = {
      type: 'EcdsaSecp256k1Signature2019',
      created: issuanceDate.toISOString(),
      verificationMethod: `${DID_BAAS_CONFIG.issuerDid}#keys-1`,
      proofPurpose: 'assertionMethod',
      proofValue: generateProof({ claims: finalClaims, subject: request.user_did }),
    };

    // Generate blockchain hash
    const blockchainHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2)}`.substring(0, 66).padEnd(66, '0');

    // Create credential
    const credentialId = uuidv4();
    db.prepare(`
      INSERT INTO verifiable_credentials (
        id, user_id, credential_type, issuer, subject_did, claims, proof,
        issuance_date, expiration_date, status, blockchain_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
    `).run(
      credentialId,
      request.user_id,
      request.credential_type,
      DID_BAAS_CONFIG.issuerDid,
      request.user_did,
      JSON.stringify(finalClaims),
      JSON.stringify(proofData),
      issuanceDate.toISOString(),
      expirationDate.toISOString(),
      blockchainHash
    );

    // Update request status
    db.prepare(`
      UPDATE credential_requests
      SET status = 'issued', reviewer_id = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(req.user!.userId, requestId);

    // Log audit
    logAudit('VC_ISSUED', req.user!.userId, 'admin', 'credential', credentialId,
      `Issued ${typeConfig?.name || request.credential_type} to user`,
      { requestId, credentialType: request.credential_type, userId: request.user_id, blockchainHash });

    res.status(201).json({
      success: true,
      data: {
        credentialId,
        requestId,
        credentialType: request.credential_type,
        typeName: typeConfig?.name || request.credential_type,
        subjectDid: request.user_did,
        issuer: DID_BAAS_CONFIG.issuerDid,
        issuanceDate: issuanceDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        blockchainHash,
        status: 'valid',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Issue VC error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to issue credential' } });
  }
});

/**
 * POST /api/admin/identity/revoke-vc
 * Revoke a verifiable credential (admin)
 */
router.post('/admin/revoke-vc', authenticate, requireAdmin, [
  body('credentialId').isString().notEmpty().withMessage('Credential ID is required'),
  body('reason').isString().notEmpty().withMessage('Revocation reason is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { credentialId, reason } = req.body;

    const credential = db.prepare(`
      SELECT * FROM verifiable_credentials WHERE id = ?
    `).get(credentialId) as VerifiableCredentialRow | undefined;

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    if (credential.status === 'revoked') {
      throw new BadRequestError('Credential is already revoked');
    }

    // Revoke credential
    db.prepare(`
      UPDATE verifiable_credentials
      SET status = 'revoked', updated_at = datetime('now')
      WHERE id = ?
    `).run(credentialId);

    // Log audit
    logAudit('VC_REVOKED', req.user!.userId, 'admin', 'credential', credentialId,
      `Revoked ${credential.credential_type} credential`,
      { credentialType: credential.credential_type, userId: credential.user_id, reason });

    res.json({
      success: true,
      data: {
        credentialId,
        credentialType: credential.credential_type,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        reason,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Revoke VC error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke credential' } });
  }
});

/**
 * POST /api/admin/identity/reject-request
 * Reject a credential request (admin)
 */
router.post('/admin/reject-request', authenticate, requireAdmin, [
  body('requestId').isString().notEmpty().withMessage('Request ID is required'),
  body('reason').isString().notEmpty().withMessage('Rejection reason is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { requestId, reason } = req.body;

    const request = db.prepare(`
      SELECT * FROM credential_requests WHERE id = ?
    `).get(requestId) as CredentialRequestRow | undefined;

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestError(`Cannot reject ${request.status} request`);
    }

    // Reject request
    db.prepare(`
      UPDATE credential_requests
      SET status = 'rejected', reviewer_id = ?, reviewed_at = datetime('now'), rejection_reason = ?
      WHERE id = ?
    `).run(req.user!.userId, reason, requestId);

    // Log audit
    logAudit('VC_REQUEST_REJECTED', req.user!.userId, 'admin', 'credential_request', requestId,
      `Rejected ${request.credential_type} request`,
      { credentialType: request.credential_type, userId: request.user_id, reason });

    res.json({
      success: true,
      data: {
        requestId,
        credentialType: request.credential_type,
        status: 'rejected',
        reason,
        rejectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Reject request error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject request' } });
  }
});

/**
 * GET /api/admin/identity/stats
 * Get DID/VC statistics (admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // DID stats
    const didStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
      FROM user_dids
    `).get() as { total: number; active: number; pending: number; revoked: number };

    // Credential stats
    const credentialStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
      FROM verifiable_credentials
    `).get() as { total: number; valid: number; expired: number; revoked: number };

    // Credentials by type
    const byType = db.prepare(`
      SELECT credential_type, COUNT(*) as count
      FROM verifiable_credentials
      WHERE status = 'valid'
      GROUP BY credential_type
    `).all() as { credential_type: string; count: number }[];

    // Request stats
    const requestStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued
      FROM credential_requests
    `).get() as { total: number; pending: number; approved: number; rejected: number; issued: number };

    // Recent activity (last 30 days)
    const recentActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as credentials_issued
      FROM verifiable_credentials
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; credentials_issued: number }[];

    res.json({
      success: true,
      data: {
        dids: {
          total: didStats.total || 0,
          active: didStats.active || 0,
          pending: didStats.pending || 0,
          revoked: didStats.revoked || 0,
        },
        credentials: {
          total: credentialStats.total || 0,
          valid: credentialStats.valid || 0,
          expired: credentialStats.expired || 0,
          revoked: credentialStats.revoked || 0,
        },
        byType: byType.map(t => ({
          type: t.credential_type,
          name: CREDENTIAL_TYPES[t.credential_type as keyof typeof CREDENTIAL_TYPES]?.name || t.credential_type,
          count: t.count,
        })),
        requests: {
          total: requestStats.total || 0,
          pending: requestStats.pending || 0,
          approved: requestStats.approved || 0,
          rejected: requestStats.rejected || 0,
          issued: requestStats.issued || 0,
        },
        recentActivity,
        issuerDid: DID_BAAS_CONFIG.issuerDid,
        networkId: DID_BAAS_CONFIG.networkId,
      },
    });
  } catch (error) {
    console.error('Get identity stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' } });
  }
});

export default router;
