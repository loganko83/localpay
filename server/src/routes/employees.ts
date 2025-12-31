/**
 * Employee Routes
 * Merchant employee management endpoints
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// Available permissions
const VALID_PERMISSIONS = [
  'view_transactions',
  'process_payments',
  'issue_refunds',
  'view_reports',
  'manage_inventory',
];

interface EmployeeRow {
  id: string;
  merchant_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'manager' | 'cashier';
  permissions: string | null;
  status: 'active' | 'pending' | 'revoked';
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditLogRow {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  metadata: string | null;
}

/**
 * Format employee data for API response
 */
function formatEmployee(employee: EmployeeRow) {
  return {
    id: employee.id,
    merchantId: employee.merchant_id,
    userId: employee.user_id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    permissions: employee.permissions ? JSON.parse(employee.permissions) : [],
    status: employee.status,
    lastActiveAt: employee.last_active_at,
    createdAt: employee.created_at,
    updatedAt: employee.updated_at,
  };
}

/**
 * Verify employee belongs to requesting merchant
 */
function verifyEmployeeOwnership(employeeId: string, merchantId: string): EmployeeRow | null {
  const db = getDb();
  const employee = db.prepare(
    'SELECT * FROM employees WHERE id = ? AND merchant_id = ?'
  ).get(employeeId, merchantId) as EmployeeRow | undefined;
  return employee || null;
}

/**
 * Log employee-related audit events
 */
function logAudit(
  action: string,
  actorId: string,
  targetId: string,
  description: string,
  metadata?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
    VALUES (?, datetime('now'), ?, ?, 'merchant', 'employee', ?, ?, ?)
  `).run(
    uuidv4(),
    action,
    actorId,
    targetId,
    description,
    metadata ? JSON.stringify(metadata) : null
  );
}

// ==================== Employee Endpoints ====================

/**
 * GET /api/employees
 * List all employees for the authenticated merchant
 */
router.get('/', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const { status, role, search } = req.query;

    let whereClause = 'WHERE merchant_id = ?';
    const params: (string | number)[] = [req.user!.merchantId!];

    if (status && ['active', 'pending', 'revoked'].includes(status as string)) {
      whereClause += ' AND status = ?';
      params.push(status as string);
    }

    if (role && ['owner', 'manager', 'cashier'].includes(role as string)) {
      whereClause += ' AND role = ?';
      params.push(role as string);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const employees = db.prepare(`
      SELECT * FROM employees
      ${whereClause}
      ORDER BY
        CASE role
          WHEN 'owner' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'cashier' THEN 3
        END,
        name
    `).all(...params) as EmployeeRow[];

    // Get counts by status
    const statusCounts = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM employees
      WHERE merchant_id = ?
      GROUP BY status
    `).all(req.user!.merchantId!) as { status: string; count: number }[];

    const counts = {
      active: 0,
      pending: 0,
      revoked: 0,
      total: employees.length,
    };
    statusCounts.forEach(sc => {
      counts[sc.status as keyof typeof counts] = sc.count;
    });

    res.json({
      success: true,
      data: {
        employees: employees.map(formatEmployee),
        counts,
      },
    });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list employees' } });
  }
});

/**
 * POST /api/employees
 * Add a new employee to the merchant
 */
router.post('/', authenticate, requireMerchant, [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true }).matches(/^[0-9-+\s()]{7,20}$/).withMessage('Invalid phone format'),
  body('role').isIn(['manager', 'cashier']).withMessage('Role must be manager or cashier'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, email, phone, role, permissions } = req.body;
    const db = getDb();

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter((p: string) => !VALID_PERMISSIONS.includes(p));
      if (invalidPerms.length > 0) {
        throw new BadRequestError(`Invalid permissions: ${invalidPerms.join(', ')}`);
      }
    }

    // Check for duplicate email within merchant
    if (email) {
      const existing = db.prepare(
        'SELECT id FROM employees WHERE merchant_id = ? AND email = ?'
      ).get(req.user!.merchantId!, email);
      if (existing) {
        throw new BadRequestError('An employee with this email already exists');
      }
    }

    // Default permissions based on role
    const defaultPermissions: Record<string, string[]> = {
      manager: ['view_transactions', 'process_payments', 'issue_refunds', 'view_reports'],
      cashier: ['view_transactions', 'process_payments'],
    };

    const finalPermissions = permissions || defaultPermissions[role] || [];
    const employeeId = uuidv4();

    db.prepare(`
      INSERT INTO employees (id, merchant_id, name, email, phone, role, permissions, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).run(
      employeeId,
      req.user!.merchantId!,
      name,
      email || null,
      phone || null,
      role,
      JSON.stringify(finalPermissions)
    );

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as EmployeeRow;

    // Log audit
    logAudit(
      'EMPLOYEE_ADDED',
      req.user!.userId,
      employeeId,
      `Employee ${name} added as ${role}`,
      { role, email, phone }
    );

    res.status(201).json({
      success: true,
      data: formatEmployee(employee),
      message: 'Employee added successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    console.error('Add employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add employee' } });
  }
});

/**
 * GET /api/employees/:id
 * Get employee details
 */
router.get('/:id', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    res.json({
      success: true,
      data: formatEmployee(employee),
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get employee' } });
  }
});

/**
 * PUT /api/employees/:id
 * Update employee details
 */
router.put('/:id', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).matches(/^[0-9-+\s()]{7,20}$/),
  body('role').optional().isIn(['manager', 'cashier']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Cannot update owner role
    if (employee.role === 'owner') {
      throw new ForbiddenError('Cannot modify owner employee');
    }

    const { name, email, phone, role } = req.body;
    const db = getDb();

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      // Check for duplicate email
      if (email) {
        const existing = db.prepare(
          'SELECT id FROM employees WHERE merchant_id = ? AND email = ? AND id != ?'
        ).get(req.user!.merchantId!, email, req.params.id);
        if (existing) {
          throw new BadRequestError('An employee with this email already exists');
        }
      }
      updates.push('email = ?');
      params.push(email || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(req.params.id);

    db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id) as EmployeeRow;

    // Log audit
    logAudit(
      'EMPLOYEE_UPDATED',
      req.user!.userId,
      req.params.id,
      `Employee ${updatedEmployee.name} updated`,
      { name, email, phone, role }
    );

    res.json({
      success: true,
      data: formatEmployee(updatedEmployee),
      message: 'Employee updated successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update employee' } });
  }
});

/**
 * DELETE /api/employees/:id
 * Remove an employee
 */
router.delete('/:id', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Cannot delete owner
    if (employee.role === 'owner') {
      throw new ForbiddenError('Cannot remove owner employee');
    }

    const db = getDb();
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);

    // Log audit
    logAudit(
      'EMPLOYEE_REMOVED',
      req.user!.userId,
      req.params.id,
      `Employee ${employee.name} removed`,
      { role: employee.role }
    );

    res.json({
      success: true,
      message: 'Employee removed successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Remove employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove employee' } });
  }
});

/**
 * GET /api/employees/:id/permissions
 * Get employee permissions
 */
router.get('/:id/permissions', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const permissions = employee.permissions ? JSON.parse(employee.permissions) : [];

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.role,
        permissions,
        availablePermissions: VALID_PERMISSIONS,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get permissions' } });
  }
});

/**
 * PUT /api/employees/:id/permissions
 * Update employee permissions
 */
router.put('/:id/permissions', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
  body('permissions').isArray().withMessage('Permissions must be an array'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Cannot modify owner permissions
    if (employee.role === 'owner') {
      throw new ForbiddenError('Cannot modify owner permissions');
    }

    const { permissions } = req.body;

    // Validate all permissions
    const invalidPerms = permissions.filter((p: string) => !VALID_PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      throw new BadRequestError(`Invalid permissions: ${invalidPerms.join(', ')}`);
    }

    const db = getDb();
    db.prepare(`
      UPDATE employees
      SET permissions = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(permissions), req.params.id);

    // Log audit
    logAudit(
      'EMPLOYEE_PERMISSIONS_UPDATED',
      req.user!.userId,
      req.params.id,
      `Permissions updated for ${employee.name}`,
      { oldPermissions: employee.permissions ? JSON.parse(employee.permissions) : [], newPermissions: permissions }
    );

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        permissions,
      },
      message: 'Permissions updated successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update permissions' } });
  }
});

/**
 * GET /api/employees/:id/activity
 * Get employee activity log
 */
router.get('/:id/activity', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const db = getDb();
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;

    // Get audit logs for this employee (both as actor and target)
    const activityLogs = db.prepare(`
      SELECT id, timestamp, action, description, metadata
      FROM audit_logs
      WHERE (actor_id = ? OR target_id = ?)
        AND (target_type = 'employee' OR target_type = 'transaction')
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(employee.user_id || employee.id, req.params.id, size, page * size) as AuditLogRow[];

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE (actor_id = ? OR target_id = ?)
        AND (target_type = 'employee' OR target_type = 'transaction')
    `).get(employee.user_id || employee.id, req.params.id) as { count: number };

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          lastActiveAt: employee.last_active_at,
        },
        activities: activityLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          description: log.description,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
        page,
        size,
        totalElements: totalCount.count,
        totalPages: Math.ceil(totalCount.count / size),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity log' } });
  }
});

/**
 * POST /api/employees/invite
 * Send invite email to potential employee (mock)
 */
router.post('/invite', authenticate, requireMerchant, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('role').isIn(['manager', 'cashier']).withMessage('Role must be manager or cashier'),
  body('permissions').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { email, name, role, permissions, message } = req.body;
    const db = getDb();

    // Check if email already exists for this merchant
    const existing = db.prepare(
      'SELECT id FROM employees WHERE merchant_id = ? AND email = ?'
    ).get(req.user!.merchantId!, email);

    if (existing) {
      throw new BadRequestError('An employee with this email already exists');
    }

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter((p: string) => !VALID_PERMISSIONS.includes(p));
      if (invalidPerms.length > 0) {
        throw new BadRequestError(`Invalid permissions: ${invalidPerms.join(', ')}`);
      }
    }

    // Create employee record with pending status
    const employeeId = uuidv4();
    const inviteToken = uuidv4(); // In production, this would be used for email verification

    const defaultPermissions: Record<string, string[]> = {
      manager: ['view_transactions', 'process_payments', 'issue_refunds', 'view_reports'],
      cashier: ['view_transactions', 'process_payments'],
    };

    const finalPermissions = permissions || defaultPermissions[role] || [];

    db.prepare(`
      INSERT INTO employees (id, merchant_id, name, email, role, permissions, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).run(
      employeeId,
      req.user!.merchantId!,
      name,
      email,
      role,
      JSON.stringify(finalPermissions)
    );

    // Log audit
    logAudit(
      'EMPLOYEE_INVITED',
      req.user!.userId,
      employeeId,
      `Invite sent to ${email} for ${role} role`,
      { email, role, message }
    );

    // Mock email sending - in production, this would integrate with email service
    console.log(`[MOCK EMAIL] Sending invite to ${email} with token ${inviteToken}`);

    res.status(201).json({
      success: true,
      data: {
        employeeId,
        email,
        name,
        role,
        status: 'pending',
        inviteSent: true,
        // Mock: In production, don't expose this
        _mockInviteToken: inviteToken,
      },
      message: 'Invite sent successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    console.error('Send invite error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send invite' } });
  }
});

/**
 * POST /api/employees/:id/resend-invite
 * Resend invite email to pending employee
 */
router.post('/:id/resend-invite', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status !== 'pending') {
      throw new BadRequestError('Can only resend invite to pending employees');
    }

    if (!employee.email) {
      throw new BadRequestError('Employee has no email address');
    }

    // Generate new invite token
    const inviteToken = uuidv4();

    // Log audit
    logAudit(
      'EMPLOYEE_INVITE_RESENT',
      req.user!.userId,
      req.params.id,
      `Invite resent to ${employee.email}`,
      { email: employee.email }
    );

    // Mock email sending
    console.log(`[MOCK EMAIL] Resending invite to ${employee.email} with token ${inviteToken}`);

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        email: employee.email,
        inviteSent: true,
      },
      message: 'Invite resent successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Resend invite error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resend invite' } });
  }
});

/**
 * POST /api/employees/:id/revoke
 * Revoke employee access
 */
router.post('/:id/revoke', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
  body('reason').optional().isString().isLength({ max: 500 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Cannot revoke owner
    if (employee.role === 'owner') {
      throw new ForbiddenError('Cannot revoke owner access');
    }

    if (employee.status === 'revoked') {
      throw new BadRequestError('Employee access is already revoked');
    }

    const { reason } = req.body;
    const db = getDb();

    db.prepare(`
      UPDATE employees
      SET status = 'revoked', updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    // Log audit
    logAudit(
      'EMPLOYEE_REVOKED',
      req.user!.userId,
      req.params.id,
      `Access revoked for ${employee.name}`,
      { reason, previousStatus: employee.status }
    );

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        status: 'revoked',
      },
      message: 'Employee access revoked successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Revoke access error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke access' } });
  }
});

/**
 * POST /api/employees/:id/activate
 * Activate an employee (from pending or revoked status)
 */
router.post('/:id/activate', authenticate, requireMerchant, [
  param('id').isUUID().withMessage('Invalid employee ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const employee = verifyEmployeeOwnership(req.params.id, req.user!.merchantId!);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status === 'active') {
      throw new BadRequestError('Employee is already active');
    }

    const db = getDb();

    db.prepare(`
      UPDATE employees
      SET status = 'active', updated_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    // Log audit
    logAudit(
      'EMPLOYEE_ACTIVATED',
      req.user!.userId,
      req.params.id,
      `Employee ${employee.name} activated`,
      { previousStatus: employee.status }
    );

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        status: 'active',
      },
      message: 'Employee activated successfully',
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Activate employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to activate employee' } });
  }
});

export default router;
