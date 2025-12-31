/**
 * Welfare Routes
 * Welfare program management, beneficiaries, distributions
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface WelfareProgramRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  budget: number;
  spent: number;
  beneficiary_count: number;
  eligibility_criteria: string | null;
  amount_per_person: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WelfareBeneficiaryRow {
  id: string;
  program_id: string;
  user_id: string;
  did: string | null;
  verification_type: string | null;
  verified_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface WelfareDistributionRow {
  id: string;
  program_id: string;
  beneficiary_id: string;
  amount: number;
  transaction_id: string | null;
  blockchain_hash: string | null;
  status: string;
  distributed_at: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  did: string | null;
}

// ==================== Welfare Programs ====================

/**
 * GET /api/welfare/programs
 * List welfare programs with filters
 */
router.get('/programs', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isString(),
  query('status').optional().isIn(['draft', 'active', 'paused', 'completed']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM welfare_programs ${whereClause}`).get(...params) as { count: number };

    const programs = db.prepare(`
      SELECT * FROM welfare_programs ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as WelfareProgramRow[];

    res.json({
      success: true,
      data: {
        programs: programs.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          type: p.type,
          budget: p.budget,
          spent: p.spent,
          beneficiaryCount: p.beneficiary_count,
          eligibilityCriteria: p.eligibility_criteria ? JSON.parse(p.eligibility_criteria) : null,
          amountPerPerson: p.amount_per_person,
          startDate: p.start_date,
          endDate: p.end_date,
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List welfare programs error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list welfare programs' } });
  }
});

/**
 * POST /api/welfare/programs
 * Create welfare program (admin only)
 */
router.post('/programs', authenticate, requireAdmin, [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['youth', 'senior', 'disability', 'culture', 'education', 'housing', 'medical']).withMessage('Invalid program type'),
  body('budget').isInt({ min: 0 }).withMessage('Budget must be a non-negative integer'),
  body('amountPerPerson').optional().isInt({ min: 0 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, description, type, budget, eligibilityCriteria, amountPerPerson, startDate, endDate, status } = req.body;
    const db = getDb();

    const programId = uuidv4();
    db.prepare(`
      INSERT INTO welfare_programs (id, name, description, type, budget, eligibility_criteria, amount_per_person, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      programId,
      name,
      description || null,
      type,
      budget,
      eligibilityCriteria ? JSON.stringify(eligibilityCriteria) : null,
      amountPerPerson || null,
      startDate || null,
      endDate || null,
      status || 'draft'
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_PROGRAM_CREATED',
      req.user!.userId,
      'admin',
      'welfare_program',
      programId,
      `Welfare program "${name}" created`,
      JSON.stringify({ type, budget })
    );

    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(programId) as WelfareProgramRow;

    res.status(201).json({
      success: true,
      data: {
        id: program.id,
        name: program.name,
        description: program.description,
        type: program.type,
        budget: program.budget,
        spent: program.spent,
        beneficiaryCount: program.beneficiary_count,
        eligibilityCriteria: program.eligibility_criteria ? JSON.parse(program.eligibility_criteria) : null,
        amountPerPerson: program.amount_per_person,
        startDate: program.start_date,
        endDate: program.end_date,
        status: program.status,
        createdAt: program.created_at,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    console.error('Create welfare program error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create welfare program' } });
  }
});

/**
 * GET /api/welfare/programs/:id
 * Get welfare program details
 */
router.get('/programs/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(req.params.id) as WelfareProgramRow | undefined;

    if (!program) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Welfare program not found' } });
      return;
    }

    // Get beneficiary statistics
    const beneficiaryStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM welfare_beneficiaries
      WHERE program_id = ?
    `).get(program.id) as { total: number; approved: number; pending: number; rejected: number };

    // Get distribution statistics
    const distributionStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as totalAmount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM welfare_distributions
      WHERE program_id = ?
    `).get(program.id) as { total: number; totalAmount: number; completed: number; pending: number };

    res.json({
      success: true,
      data: {
        id: program.id,
        name: program.name,
        description: program.description,
        type: program.type,
        budget: program.budget,
        spent: program.spent,
        remaining: program.budget - program.spent,
        beneficiaryCount: program.beneficiary_count,
        eligibilityCriteria: program.eligibility_criteria ? JSON.parse(program.eligibility_criteria) : null,
        amountPerPerson: program.amount_per_person,
        startDate: program.start_date,
        endDate: program.end_date,
        status: program.status,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
        beneficiaryStats,
        distributionStats,
      },
    });
  } catch (error) {
    console.error('Get welfare program error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get welfare program' } });
  }
});

/**
 * PUT /api/welfare/programs/:id
 * Update welfare program (admin only)
 */
router.put('/programs/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, budget, eligibilityCriteria, amountPerPerson, startDate, endDate, status } = req.body;
    const db = getDb();

    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(req.params.id) as WelfareProgramRow | undefined;
    if (!program) {
      throw new NotFoundError('Welfare program not found');
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      params.push(budget);
    }
    if (eligibilityCriteria !== undefined) {
      updates.push('eligibility_criteria = ?');
      params.push(eligibilityCriteria ? JSON.stringify(eligibilityCriteria) : null);
    }
    if (amountPerPerson !== undefined) {
      updates.push('amount_per_person = ?');
      params.push(amountPerPerson);
    }
    if (startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push('end_date = ?');
      params.push(endDate);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE welfare_programs SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, previous_state, new_state)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_PROGRAM_UPDATED',
      req.user!.userId,
      'admin',
      'welfare_program',
      req.params.id,
      `Welfare program "${program.name}" updated`,
      JSON.stringify({ status: program.status, budget: program.budget }),
      JSON.stringify({ status: status || program.status, budget: budget || program.budget })
    );

    const updatedProgram = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(req.params.id) as WelfareProgramRow;

    res.json({
      success: true,
      data: {
        id: updatedProgram.id,
        name: updatedProgram.name,
        description: updatedProgram.description,
        type: updatedProgram.type,
        budget: updatedProgram.budget,
        spent: updatedProgram.spent,
        beneficiaryCount: updatedProgram.beneficiary_count,
        eligibilityCriteria: updatedProgram.eligibility_criteria ? JSON.parse(updatedProgram.eligibility_criteria) : null,
        amountPerPerson: updatedProgram.amount_per_person,
        startDate: updatedProgram.start_date,
        endDate: updatedProgram.end_date,
        status: updatedProgram.status,
        updatedAt: updatedProgram.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update welfare program error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update welfare program' } });
  }
});

/**
 * DELETE /api/welfare/programs/:id
 * Delete welfare program (admin only)
 */
router.delete('/programs/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(req.params.id) as WelfareProgramRow | undefined;

    if (!program) {
      throw new NotFoundError('Welfare program not found');
    }

    // Check if there are any distributions
    const distributionCount = db.prepare('SELECT COUNT(*) as count FROM welfare_distributions WHERE program_id = ?').get(req.params.id) as { count: number };
    if (distributionCount.count > 0) {
      throw new BadRequestError('Cannot delete program with existing distributions');
    }

    // Delete beneficiaries first
    db.prepare('DELETE FROM welfare_beneficiaries WHERE program_id = ?').run(req.params.id);

    // Delete program
    db.prepare('DELETE FROM welfare_programs WHERE id = ?').run(req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_PROGRAM_DELETED',
      req.user!.userId,
      'admin',
      'welfare_program',
      req.params.id,
      `Welfare program "${program.name}" deleted`
    );

    res.json({ success: true, message: 'Welfare program deleted' });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete welfare program error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete welfare program' } });
  }
});

// ==================== Beneficiaries ====================

/**
 * GET /api/welfare/beneficiaries
 * List beneficiaries with filters
 */
router.get('/beneficiaries', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('programId').optional().isString(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const programId = req.query.programId as string;
    const status = req.query.status as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (programId) {
      whereClause += ' AND b.program_id = ?';
      params.push(programId);
    }

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM welfare_beneficiaries b ${whereClause}
    `).get(...params) as { count: number };

    const beneficiaries = db.prepare(`
      SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone, p.name as program_name
      FROM welfare_beneficiaries b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN welfare_programs p ON b.program_id = p.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (WelfareBeneficiaryRow & { user_name: string; user_email: string; user_phone: string; program_name: string })[];

    res.json({
      success: true,
      data: {
        beneficiaries: beneficiaries.map(b => ({
          id: b.id,
          programId: b.program_id,
          programName: b.program_name,
          userId: b.user_id,
          userName: b.user_name,
          userEmail: b.user_email,
          userPhone: b.user_phone,
          did: b.did,
          verificationType: b.verification_type,
          verifiedAt: b.verified_at,
          status: b.status,
          notes: b.notes,
          createdAt: b.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List beneficiaries error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list beneficiaries' } });
  }
});

/**
 * POST /api/welfare/beneficiaries
 * Add beneficiary (admin only)
 */
router.post('/beneficiaries', authenticate, requireAdmin, [
  body('programId').notEmpty().withMessage('Program ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { programId, userId, did, verificationType, status, notes } = req.body;
    const db = getDb();

    // Verify program exists
    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(programId) as WelfareProgramRow | undefined;
    if (!program) {
      throw new NotFoundError('Welfare program not found');
    }

    // Verify user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already a beneficiary
    const existingBeneficiary = db.prepare('SELECT id FROM welfare_beneficiaries WHERE program_id = ? AND user_id = ?').get(programId, userId);
    if (existingBeneficiary) {
      throw new ConflictError('User is already a beneficiary of this program');
    }

    const beneficiaryId = uuidv4();
    const beneficiaryStatus = status || 'pending';

    db.prepare(`
      INSERT INTO welfare_beneficiaries (id, program_id, user_id, did, verification_type, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(beneficiaryId, programId, userId, did || user.did || null, verificationType || null, beneficiaryStatus, notes || null);

    // Update beneficiary count if approved
    if (beneficiaryStatus === 'approved') {
      db.prepare('UPDATE welfare_programs SET beneficiary_count = beneficiary_count + 1 WHERE id = ?').run(programId);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_BENEFICIARY_ADDED',
      req.user!.userId,
      'admin',
      'welfare_beneficiary',
      beneficiaryId,
      `Beneficiary added to program "${program.name}"`,
      JSON.stringify({ userId, status: beneficiaryStatus })
    );

    const beneficiary = db.prepare(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM welfare_beneficiaries b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).get(beneficiaryId) as WelfareBeneficiaryRow & { user_name: string; user_email: string };

    res.status(201).json({
      success: true,
      data: {
        id: beneficiary.id,
        programId: beneficiary.program_id,
        userId: beneficiary.user_id,
        userName: beneficiary.user_name,
        userEmail: beneficiary.user_email,
        did: beneficiary.did,
        verificationType: beneficiary.verification_type,
        status: beneficiary.status,
        notes: beneficiary.notes,
        createdAt: beneficiary.created_at,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: (error as ValidationError).details } });
      return;
    }
    console.error('Add beneficiary error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add beneficiary' } });
  }
});

/**
 * PUT /api/welfare/beneficiaries/:id
 * Update beneficiary status
 */
router.put('/beneficiaries/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, notes, verificationType, verifiedAt } = req.body;
    const db = getDb();

    const beneficiary = db.prepare(`
      SELECT b.*, p.name as program_name
      FROM welfare_beneficiaries b
      LEFT JOIN welfare_programs p ON b.program_id = p.id
      WHERE b.id = ?
    `).get(req.params.id) as (WelfareBeneficiaryRow & { program_name: string }) | undefined;

    if (!beneficiary) {
      throw new NotFoundError('Beneficiary not found');
    }

    const oldStatus = beneficiary.status;
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (verificationType !== undefined) {
      updates.push('verification_type = ?');
      params.push(verificationType);
    }
    if (verifiedAt !== undefined) {
      updates.push('verified_at = ?');
      params.push(verifiedAt);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    params.push(req.params.id);
    db.prepare(`UPDATE welfare_beneficiaries SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Update beneficiary count based on status change
    if (status !== undefined && status !== oldStatus) {
      if (oldStatus !== 'approved' && status === 'approved') {
        db.prepare('UPDATE welfare_programs SET beneficiary_count = beneficiary_count + 1 WHERE id = ?').run(beneficiary.program_id);
      } else if (oldStatus === 'approved' && status !== 'approved') {
        db.prepare('UPDATE welfare_programs SET beneficiary_count = beneficiary_count - 1 WHERE id = ?').run(beneficiary.program_id);
      }
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, previous_state, new_state)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_BENEFICIARY_UPDATED',
      req.user!.userId,
      'admin',
      'welfare_beneficiary',
      req.params.id,
      `Beneficiary status updated for program "${beneficiary.program_name}"`,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status: status || oldStatus })
    );

    const updatedBeneficiary = db.prepare(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM welfare_beneficiaries b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).get(req.params.id) as WelfareBeneficiaryRow & { user_name: string; user_email: string };

    res.json({
      success: true,
      data: {
        id: updatedBeneficiary.id,
        programId: updatedBeneficiary.program_id,
        userId: updatedBeneficiary.user_id,
        userName: updatedBeneficiary.user_name,
        userEmail: updatedBeneficiary.user_email,
        did: updatedBeneficiary.did,
        verificationType: updatedBeneficiary.verification_type,
        verifiedAt: updatedBeneficiary.verified_at,
        status: updatedBeneficiary.status,
        notes: updatedBeneficiary.notes,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update beneficiary error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update beneficiary' } });
  }
});

// ==================== Distributions ====================

/**
 * GET /api/welfare/distributions
 * List distributions with filters
 */
router.get('/distributions', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('programId').optional().isString(),
  query('status').optional().isIn(['pending', 'completed', 'failed']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const programId = req.query.programId as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (programId) {
      whereClause += ' AND d.program_id = ?';
      params.push(programId);
    }

    if (status) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND d.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND d.created_at <= ?';
      params.push(endDate);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM welfare_distributions d ${whereClause}
    `).get(...params) as { count: number };

    const distributions = db.prepare(`
      SELECT d.*, p.name as program_name, u.name as user_name, u.email as user_email
      FROM welfare_distributions d
      LEFT JOIN welfare_programs p ON d.program_id = p.id
      LEFT JOIN welfare_beneficiaries b ON d.beneficiary_id = b.id
      LEFT JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (WelfareDistributionRow & { program_name: string; user_name: string; user_email: string })[];

    res.json({
      success: true,
      data: {
        distributions: distributions.map(d => ({
          id: d.id,
          programId: d.program_id,
          programName: d.program_name,
          beneficiaryId: d.beneficiary_id,
          userName: d.user_name,
          userEmail: d.user_email,
          amount: d.amount,
          transactionId: d.transaction_id,
          blockchainHash: d.blockchain_hash,
          status: d.status,
          distributedAt: d.distributed_at,
          createdAt: d.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List distributions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list distributions' } });
  }
});

/**
 * POST /api/welfare/distributions
 * Create distribution (admin only)
 */
router.post('/distributions', authenticate, requireAdmin, [
  body('programId').notEmpty().withMessage('Program ID is required'),
  body('beneficiaryId').notEmpty().withMessage('Beneficiary ID is required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { programId, beneficiaryId, amount } = req.body;
    const db = getDb();

    // Verify program exists and is active
    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(programId) as WelfareProgramRow | undefined;
    if (!program) {
      throw new NotFoundError('Welfare program not found');
    }
    if (program.status !== 'active') {
      throw new BadRequestError('Welfare program is not active');
    }

    // Check budget
    if (program.spent + amount > program.budget) {
      throw new BadRequestError('Distribution amount exceeds remaining budget');
    }

    // Verify beneficiary exists and is approved
    const beneficiary = db.prepare(`
      SELECT b.*, u.id as user_id
      FROM welfare_beneficiaries b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ? AND b.program_id = ?
    `).get(beneficiaryId, programId) as (WelfareBeneficiaryRow & { user_id: string }) | undefined;

    if (!beneficiary) {
      throw new NotFoundError('Beneficiary not found for this program');
    }
    if (beneficiary.status !== 'approved') {
      throw new BadRequestError('Beneficiary is not approved');
    }

    const distributionId = uuidv4();
    const transactionId = `TX-WEL-${Date.now()}`;

    // Create distribution record
    db.prepare(`
      INSERT INTO welfare_distributions (id, program_id, beneficiary_id, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(distributionId, programId, beneficiaryId, amount);

    // Create transaction record (display only - actual funds via bank)
    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, 'topup', 'pending', ?)
    `).run(uuidv4(), transactionId, beneficiary.user_id, amount, `Welfare distribution: ${program.name}`);

    // Simulate bank approval (in production, this would call bank API)
    // Update distribution status to completed
    db.prepare(`
      UPDATE welfare_distributions
      SET status = 'completed', distributed_at = datetime('now'), transaction_id = ?
      WHERE id = ?
    `).run(transactionId, distributionId);

    // Update transaction status
    db.prepare(`
      UPDATE transactions SET status = 'completed' WHERE tx_id = ?
    `).run(transactionId);

    // Update program spent amount
    db.prepare('UPDATE welfare_programs SET spent = spent + ? WHERE id = ?').run(amount, programId);

    // Update wallet balance (display only)
    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(beneficiary.user_id) as { id: string } | undefined;
    if (wallet) {
      db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(amount, wallet.id);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_DISTRIBUTION_CREATED',
      req.user!.userId,
      'admin',
      'welfare_distribution',
      distributionId,
      `Welfare distribution of ${amount} for program "${program.name}"`,
      JSON.stringify({ amount, beneficiaryId, transactionId })
    );

    const distribution = db.prepare(`
      SELECT d.*, p.name as program_name, u.name as user_name
      FROM welfare_distributions d
      LEFT JOIN welfare_programs p ON d.program_id = p.id
      LEFT JOIN welfare_beneficiaries b ON d.beneficiary_id = b.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE d.id = ?
    `).get(distributionId) as WelfareDistributionRow & { program_name: string; user_name: string };

    res.status(201).json({
      success: true,
      data: {
        id: distribution.id,
        programId: distribution.program_id,
        programName: distribution.program_name,
        beneficiaryId: distribution.beneficiary_id,
        userName: distribution.user_name,
        amount: distribution.amount,
        transactionId: distribution.transaction_id,
        blockchainHash: distribution.blockchain_hash,
        status: distribution.status,
        distributedAt: distribution.distributed_at,
        createdAt: distribution.created_at,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: (error as ValidationError).details } });
      return;
    }
    console.error('Create distribution error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create distribution' } });
  }
});

// ==================== DID Eligibility Verification ====================

/**
 * POST /api/welfare/verify-eligibility
 * DID-based eligibility check
 */
router.post('/verify-eligibility', authenticate, [
  body('programId').notEmpty().withMessage('Program ID is required'),
  body('did').notEmpty().withMessage('DID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { programId, did, verifiableCredentials } = req.body;
    const db = getDb();

    // Verify program exists
    const program = db.prepare('SELECT * FROM welfare_programs WHERE id = ?').get(programId) as WelfareProgramRow | undefined;
    if (!program) {
      throw new NotFoundError('Welfare program not found');
    }

    // Parse eligibility criteria
    const criteria = program.eligibility_criteria ? JSON.parse(program.eligibility_criteria) : null;

    // Simulate DID verification (in production, this would call DID-BaaS API)
    // Check if DID matches any registered user
    const user = db.prepare('SELECT * FROM users WHERE did = ?').get(did) as UserRow | undefined;

    const verificationResult = {
      did,
      isVerified: !!user,
      isEligible: false,
      eligibilityDetails: {
        programId,
        programName: program.name,
        programType: program.type,
        criteria,
        matchedCriteria: [] as string[],
        unmatchedCriteria: [] as string[],
      },
      verifiableCredentials: verifiableCredentials || [],
      verifiedAt: new Date().toISOString(),
    };

    // Simulate eligibility check based on program type and criteria
    if (user) {
      // In production, verify against actual VCs from DID-BaaS
      // For demo, we'll simulate based on program type
      switch (program.type) {
        case 'youth':
          // Would verify age from birth date VC
          verificationResult.isEligible = true;
          verificationResult.eligibilityDetails.matchedCriteria.push('age_requirement');
          break;
        case 'senior':
          // Would verify senior status from age VC
          verificationResult.isEligible = true;
          verificationResult.eligibilityDetails.matchedCriteria.push('senior_status');
          break;
        case 'disability':
          // Would verify disability status from official VC
          verificationResult.isEligible = true;
          verificationResult.eligibilityDetails.matchedCriteria.push('disability_verification');
          break;
        case 'culture':
        case 'education':
        case 'housing':
        case 'medical':
          // General eligibility based on residency
          verificationResult.isEligible = true;
          verificationResult.eligibilityDetails.matchedCriteria.push('residency');
          break;
        default:
          verificationResult.isEligible = false;
          verificationResult.eligibilityDetails.unmatchedCriteria.push('unknown_program_type');
      }
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WELFARE_ELIGIBILITY_CHECK',
      req.user!.userId,
      req.user!.userType,
      'welfare_program',
      programId,
      `Eligibility check for program "${program.name}"`,
      JSON.stringify({ did, isEligible: verificationResult.isEligible })
    );

    res.json({
      success: true,
      data: verificationResult,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: (error as ValidationError).details } });
      return;
    }
    console.error('Verify eligibility error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify eligibility' } });
  }
});

// ==================== Statistics ====================

/**
 * GET /api/welfare/stats
 * Welfare statistics
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Program statistics by type
    const programStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as program_count,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(spent), 0) as total_spent,
        COALESCE(SUM(beneficiary_count), 0) as total_beneficiaries
      FROM welfare_programs
      GROUP BY type
    `).all() as { type: string; program_count: number; total_budget: number; total_spent: number; total_beneficiaries: number }[];

    // Overall statistics
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_programs,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(spent), 0) as total_spent,
        COALESCE(SUM(beneficiary_count), 0) as total_beneficiaries,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_programs
      FROM welfare_programs
    `).get() as { total_programs: number; total_budget: number; total_spent: number; total_beneficiaries: number; active_programs: number; completed_programs: number };

    // Distribution statistics
    const distributionStats = db.prepare(`
      SELECT
        COUNT(*) as total_distributions,
        COALESCE(SUM(amount), 0) as total_amount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM welfare_distributions
    `).get() as { total_distributions: number; total_amount: number; completed: number; pending: number; failed: number };

    // Beneficiary statistics
    const beneficiaryStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
      FROM welfare_beneficiaries
    `).get() as { total: number; approved: number; pending: number; rejected: number; suspended: number };

    // Monthly distribution trend (last 12 months)
    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as distribution_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM welfare_distributions
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all() as { month: string; distribution_count: number; total_amount: number }[];

    res.json({
      success: true,
      data: {
        overview: {
          totalPrograms: overallStats.total_programs,
          activePrograms: overallStats.active_programs,
          completedPrograms: overallStats.completed_programs,
          totalBudget: overallStats.total_budget,
          totalSpent: overallStats.total_spent,
          budgetUtilization: overallStats.total_budget > 0 ? (overallStats.total_spent / overallStats.total_budget) * 100 : 0,
          totalBeneficiaries: overallStats.total_beneficiaries,
        },
        byType: programStats.map(s => ({
          type: s.type,
          programCount: s.program_count,
          totalBudget: s.total_budget,
          totalSpent: s.total_spent,
          totalBeneficiaries: s.total_beneficiaries,
          utilization: s.total_budget > 0 ? (s.total_spent / s.total_budget) * 100 : 0,
        })),
        distributions: {
          total: distributionStats.total_distributions,
          totalAmount: distributionStats.total_amount,
          completed: distributionStats.completed,
          pending: distributionStats.pending,
          failed: distributionStats.failed,
          successRate: distributionStats.total_distributions > 0
            ? (distributionStats.completed / distributionStats.total_distributions) * 100
            : 0,
        },
        beneficiaries: beneficiaryStats,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Get welfare stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get welfare statistics' } });
  }
});

/**
 * GET /api/welfare/impact
 * Economic impact analysis
 */
router.get('/impact', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = req.query.period as string || '12m';
    const db = getDb();

    let dateFilter = '';
    if (period === '3m') {
      dateFilter = "AND d.created_at >= date('now', '-3 months')";
    } else if (period === '6m') {
      dateFilter = "AND d.created_at >= date('now', '-6 months')";
    } else if (period === '12m') {
      dateFilter = "AND d.created_at >= date('now', '-12 months')";
    }

    // Total welfare distribution amount
    const totalDistribution = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM welfare_distributions d
      WHERE status = 'completed' ${dateFilter}
    `).get() as { total: number };

    // Distribution by program type
    const distributionByType = db.prepare(`
      SELECT
        p.type,
        COALESCE(SUM(d.amount), 0) as total_amount,
        COUNT(DISTINCT d.beneficiary_id) as unique_beneficiaries
      FROM welfare_distributions d
      JOIN welfare_programs p ON d.program_id = p.id
      WHERE d.status = 'completed' ${dateFilter}
      GROUP BY p.type
    `).all() as { type: string; total_amount: number; unique_beneficiaries: number }[];

    // Calculate local economic impact (welfare funds typically have 1.5-2x multiplier effect)
    const economicMultiplier = 1.7;
    const localEconomicImpact = totalDistribution.total * economicMultiplier;

    // Transactions made using welfare funds (approximate based on topup transactions)
    const consumptionRate = db.prepare(`
      SELECT
        COUNT(CASE WHEN type = 'payment' THEN 1 END) as payment_count,
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as payment_total
      FROM transactions
      WHERE user_id IN (
        SELECT DISTINCT b.user_id FROM welfare_beneficiaries b
        JOIN welfare_distributions d ON d.beneficiary_id = b.id
        WHERE d.status = 'completed' ${dateFilter.replace('d.', '')}
      )
      ${dateFilter.replace('d.', '')}
    `).get() as { payment_count: number; payment_total: number };

    // Calculate average distribution per beneficiary
    const avgDistribution = db.prepare(`
      SELECT
        AVG(d.amount) as avg_amount,
        COUNT(DISTINCT d.beneficiary_id) as unique_beneficiaries
      FROM welfare_distributions d
      WHERE d.status = 'completed' ${dateFilter}
    `).get() as { avg_amount: number; unique_beneficiaries: number };

    // Top merchant categories receiving welfare spending
    const topCategories = db.prepare(`
      SELECT
        m.category,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM transactions t
      JOIN merchants m ON t.merchant_id = m.id
      WHERE t.user_id IN (
        SELECT DISTINCT b.user_id FROM welfare_beneficiaries b
        JOIN welfare_distributions d ON d.beneficiary_id = b.id
        WHERE d.status = 'completed'
      )
      AND t.type = 'payment'
      AND t.status = 'completed'
      GROUP BY m.category
      ORDER BY total_amount DESC
      LIMIT 10
    `).all() as { category: string; transaction_count: number; total_amount: number }[];

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalDistributed: totalDistribution.total,
          uniqueBeneficiaries: avgDistribution.unique_beneficiaries,
          averagePerBeneficiary: avgDistribution.avg_amount || 0,
          localEconomicImpact,
          economicMultiplier,
        },
        consumption: {
          totalPayments: consumptionRate.payment_total,
          paymentCount: consumptionRate.payment_count,
          consumptionRate: totalDistribution.total > 0
            ? (consumptionRate.payment_total / totalDistribution.total) * 100
            : 0,
        },
        distributionByType: distributionByType.map(d => ({
          type: d.type,
          totalAmount: d.total_amount,
          uniqueBeneficiaries: d.unique_beneficiaries,
          percentageOfTotal: totalDistribution.total > 0
            ? (d.total_amount / totalDistribution.total) * 100
            : 0,
        })),
        topSpendingCategories: topCategories.map(c => ({
          category: c.category,
          transactionCount: c.transaction_count,
          totalAmount: c.total_amount,
          percentageOfSpending: consumptionRate.payment_total > 0
            ? (c.total_amount / consumptionRate.payment_total) * 100
            : 0,
        })),
        socialImpact: {
          householdsReached: avgDistribution.unique_beneficiaries,
          localMerchantsSupported: topCategories.length,
          estimatedJobsSupported: Math.round(localEconomicImpact / 30000000), // Rough estimate: 30M KRW per job
        },
      },
    });
  } catch (error) {
    console.error('Get welfare impact error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get welfare impact' } });
  }
});

export default router;
