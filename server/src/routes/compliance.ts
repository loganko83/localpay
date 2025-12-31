/**
 * Compliance Routes
 * FDS (Fraud Detection System) and AML (Anti-Money Laundering) APIs
 * All endpoints require admin authentication
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// Apply admin auth to all routes
router.use(authenticate);
router.use(requireAdmin);

// ==================== Type Definitions ====================

interface FdsAlertRow {
  id: string;
  alert_type: string;
  severity: string;
  target_type: string;
  target_id: string;
  transaction_id: string | null;
  description: string;
  details: string | null;
  risk_score: number | null;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FdsRuleRow {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: string;
  severity: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface AmlCaseRow {
  id: string;
  case_number: string;
  case_type: string;
  subject_type: string;
  subject_id: string;
  risk_level: string;
  total_amount: number | null;
  status: string;
  investigator_id: string | null;
  summary: string | null;
  findings: string | null;
  reported_to_kofiu: number;
  kofiu_reference: string | null;
  kofiu_reported_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AmlReportRow {
  id: string;
  case_id: string;
  report_type: string;
  report_data: string;
  amount: number | null;
  submitted_at: string | null;
  kofiu_status: string | null;
  kofiu_reference: string | null;
  created_at: string;
}

interface TransactionRow {
  id: string;
  tx_id: string;
  user_id: string;
  merchant_id: string | null;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  user_type: string;
  kyc_verified: number;
}

interface MerchantRow {
  id: string;
  store_name: string;
  business_number: string;
  is_verified: number;
}

// Korean AML thresholds (in KRW)
const CTR_THRESHOLD = 10000000; // 10 million KRW for CTR (Currency Transaction Report)
const STR_THRESHOLD = 5000000;  // 5 million KRW for suspicious transaction consideration

// ==================== FDS Alerts ====================

/**
 * GET /api/compliance/fds/alerts
 * List FDS alerts with filters
 */
router.get('/fds/alerts', [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['new', 'investigating', 'resolved', 'false_positive', 'escalated']),
  query('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
  query('alertType').optional().isIn(['velocity', 'amount_anomaly', 'phantom_merchant', 'qr_duplicate', 'geographic', 'time_pattern', 'device_anomaly']),
  query('targetType').optional().isIn(['user', 'merchant', 'transaction']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const { status, severity, alertType, targetType, startDate, endDate } = req.query;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status as string);
    }
    if (severity) {
      whereClause += ' AND a.severity = ?';
      params.push(severity as string);
    }
    if (alertType) {
      whereClause += ' AND a.alert_type = ?';
      params.push(alertType as string);
    }
    if (targetType) {
      whereClause += ' AND a.target_type = ?';
      params.push(targetType as string);
    }
    if (startDate) {
      whereClause += ' AND a.created_at >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      whereClause += ' AND a.created_at <= ?';
      params.push(endDate as string);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM fds_alerts a ${whereClause}
    `).get(...params) as { count: number };

    const alerts = db.prepare(`
      SELECT a.*, u.name as assigned_to_name
      FROM fds_alerts a
      LEFT JOIN users u ON a.assigned_to = u.id
      ${whereClause}
      ORDER BY
        CASE a.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (FdsAlertRow & { assigned_to_name?: string })[];

    res.json({
      success: true,
      data: {
        alerts: alerts.map(alert => ({
          id: alert.id,
          alertType: alert.alert_type,
          severity: alert.severity,
          targetType: alert.target_type,
          targetId: alert.target_id,
          transactionId: alert.transaction_id,
          description: alert.description,
          details: alert.details ? JSON.parse(alert.details) : null,
          riskScore: alert.risk_score,
          status: alert.status,
          assignedTo: alert.assigned_to,
          assignedToName: alert.assigned_to_name,
          resolvedAt: alert.resolved_at,
          resolutionNotes: alert.resolution_notes,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('List FDS alerts error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list alerts' } });
  }
});

/**
 * GET /api/compliance/fds/alerts/:id
 * Get FDS alert details
 */
router.get('/fds/alerts/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const alert = db.prepare(`
      SELECT a.*, u.name as assigned_to_name
      FROM fds_alerts a
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = ?
    `).get(req.params.id) as (FdsAlertRow & { assigned_to_name?: string }) | undefined;

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    // Get related transaction if exists
    let transaction = null;
    if (alert.transaction_id) {
      transaction = db.prepare(`
        SELECT t.*, m.store_name as merchant_name
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.id
        WHERE t.id = ?
      `).get(alert.transaction_id) as (TransactionRow & { merchant_name?: string }) | undefined;
    }

    // Get target info based on target_type
    let targetInfo = null;
    if (alert.target_type === 'user') {
      targetInfo = db.prepare('SELECT id, name, email, user_type, kyc_verified FROM users WHERE id = ?')
        .get(alert.target_id) as UserRow | undefined;
    } else if (alert.target_type === 'merchant') {
      targetInfo = db.prepare('SELECT id, store_name, business_number, is_verified FROM merchants WHERE id = ?')
        .get(alert.target_id) as MerchantRow | undefined;
    }

    res.json({
      success: true,
      data: {
        id: alert.id,
        alertType: alert.alert_type,
        severity: alert.severity,
        targetType: alert.target_type,
        targetId: alert.target_id,
        targetInfo,
        transactionId: alert.transaction_id,
        transaction: transaction ? {
          id: transaction.id,
          txId: transaction.tx_id,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          merchantName: transaction.merchant_name,
          createdAt: transaction.created_at,
        } : null,
        description: alert.description,
        details: alert.details ? JSON.parse(alert.details) : null,
        riskScore: alert.risk_score,
        status: alert.status,
        assignedTo: alert.assigned_to,
        assignedToName: alert.assigned_to_name,
        resolvedAt: alert.resolved_at,
        resolutionNotes: alert.resolution_notes,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get FDS alert error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get alert' } });
  }
});

/**
 * PUT /api/compliance/fds/alerts/:id
 * Update FDS alert status
 */
router.put('/fds/alerts/:id', [
  body('status').optional().isIn(['new', 'investigating', 'resolved', 'false_positive', 'escalated']),
  body('assignedTo').optional().isString(),
  body('resolutionNotes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { status, assignedTo, resolutionNotes } = req.body;
    const db = getDb();

    const existingAlert = db.prepare('SELECT * FROM fds_alerts WHERE id = ?').get(req.params.id) as FdsAlertRow | undefined;
    if (!existingAlert) {
      throw new NotFoundError('Alert not found');
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);

      // Set resolved_at if status is resolved or false_positive
      if (status === 'resolved' || status === 'false_positive') {
        updates.push("resolved_at = datetime('now')");
      }
    }
    if (assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assignedTo || null);
    }
    if (resolutionNotes !== undefined) {
      updates.push('resolution_notes = ?');
      params.push(resolutionNotes);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE fds_alerts SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'FDS_ALERT_UPDATED',
      req.user!.userId,
      'admin',
      'fds_alert',
      req.params.id,
      `FDS alert ${req.params.id} updated`,
      JSON.stringify({ previousStatus: existingAlert.status, newStatus: status })
    );

    const updatedAlert = db.prepare('SELECT * FROM fds_alerts WHERE id = ?').get(req.params.id) as FdsAlertRow;

    res.json({
      success: true,
      data: {
        id: updatedAlert.id,
        alertType: updatedAlert.alert_type,
        severity: updatedAlert.severity,
        status: updatedAlert.status,
        assignedTo: updatedAlert.assigned_to,
        resolvedAt: updatedAlert.resolved_at,
        resolutionNotes: updatedAlert.resolution_notes,
        updatedAt: updatedAlert.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update FDS alert error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update alert' } });
  }
});

// ==================== FDS Rules ====================

/**
 * GET /api/compliance/fds/rules
 * List FDS detection rules
 */
router.get('/fds/rules', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const enabled = req.query.enabled;

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (enabled !== undefined) {
      whereClause += ' AND enabled = ?';
      params.push(enabled === 'true' ? 1 : 0);
    }

    const rules = db.prepare(`
      SELECT * FROM fds_rules ${whereClause}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        name ASC
    `).all(...params) as FdsRuleRow[];

    res.json({
      success: true,
      data: {
        rules: rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          ruleType: rule.rule_type,
          conditions: JSON.parse(rule.conditions),
          severity: rule.severity,
          enabled: rule.enabled === 1,
          createdAt: rule.created_at,
          updatedAt: rule.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('List FDS rules error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list rules' } });
  }
});

/**
 * POST /api/compliance/fds/rules
 * Create FDS detection rule
 */
router.post('/fds/rules', [
  body('name').notEmpty().withMessage('Name is required'),
  body('ruleType').notEmpty().withMessage('Rule type is required'),
  body('conditions').isObject().withMessage('Conditions must be an object'),
  body('severity').isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid severity'),
  body('description').optional().isString(),
  body('enabled').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, description, ruleType, conditions, severity, enabled = true } = req.body;
    const db = getDb();

    const ruleId = uuidv4();
    db.prepare(`
      INSERT INTO fds_rules (id, name, description, rule_type, conditions, severity, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ruleId, name, description || null, ruleType, JSON.stringify(conditions), severity, enabled ? 1 : 0);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'FDS_RULE_CREATED',
      req.user!.userId,
      'admin',
      'fds_rule',
      ruleId,
      `FDS rule ${name} created`,
      JSON.stringify({ ruleType, severity })
    );

    const rule = db.prepare('SELECT * FROM fds_rules WHERE id = ?').get(ruleId) as FdsRuleRow;

    res.status(201).json({
      success: true,
      data: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        ruleType: rule.rule_type,
        conditions: JSON.parse(rule.conditions),
        severity: rule.severity,
        enabled: rule.enabled === 1,
        createdAt: rule.created_at,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create FDS rule error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create rule' } });
  }
});

/**
 * PUT /api/compliance/fds/rules/:id
 * Update FDS detection rule
 */
router.put('/fds/rules/:id', [
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('conditions').optional().isObject(),
  body('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('enabled').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, description, conditions, severity, enabled } = req.body;
    const db = getDb();

    const existingRule = db.prepare('SELECT * FROM fds_rules WHERE id = ?').get(req.params.id) as FdsRuleRow | undefined;
    if (!existingRule) {
      throw new NotFoundError('Rule not found');
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
    if (conditions !== undefined) {
      updates.push('conditions = ?');
      params.push(JSON.stringify(conditions));
    }
    if (severity !== undefined) {
      updates.push('severity = ?');
      params.push(severity);
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE fds_rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedRule = db.prepare('SELECT * FROM fds_rules WHERE id = ?').get(req.params.id) as FdsRuleRow;

    res.json({
      success: true,
      data: {
        id: updatedRule.id,
        name: updatedRule.name,
        description: updatedRule.description,
        ruleType: updatedRule.rule_type,
        conditions: JSON.parse(updatedRule.conditions),
        severity: updatedRule.severity,
        enabled: updatedRule.enabled === 1,
        updatedAt: updatedRule.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update FDS rule error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update rule' } });
  }
});

/**
 * POST /api/compliance/fds/analyze
 * Analyze transaction for fraud
 */
router.post('/fds/analyze', [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { transactionId } = req.body;
    const db = getDb();

    // Get the transaction
    const transaction = db.prepare(`
      SELECT t.*, u.name as user_name, m.store_name as merchant_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN merchants m ON t.merchant_id = m.id
      WHERE t.id = ?
    `).get(transactionId) as (TransactionRow & { user_name?: string; merchant_name?: string }) | undefined;

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Get enabled rules
    const rules = db.prepare('SELECT * FROM fds_rules WHERE enabled = 1').all() as FdsRuleRow[];

    const alerts: {
      ruleId: string;
      ruleName: string;
      alertType: string;
      severity: string;
      description: string;
      riskScore: number;
    }[] = [];

    let totalRiskScore = 0;

    // Analyze against each rule
    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions);
      let triggered = false;
      let riskScore = 0;

      // Amount threshold check
      if (conditions.amountThreshold && transaction.amount >= conditions.amountThreshold) {
        triggered = true;
        riskScore = Math.min(100, Math.floor((transaction.amount / conditions.amountThreshold) * 30));
      }

      // Velocity check (transactions in time period)
      if (conditions.velocityLimit && conditions.velocityPeriodMinutes) {
        const recentTxCount = db.prepare(`
          SELECT COUNT(*) as count FROM transactions
          WHERE user_id = ? AND created_at >= datetime('now', '-${conditions.velocityPeriodMinutes} minutes')
        `).get(transaction.user_id) as { count: number };

        if (recentTxCount.count >= conditions.velocityLimit) {
          triggered = true;
          riskScore = Math.max(riskScore, Math.min(100, (recentTxCount.count / conditions.velocityLimit) * 40));
        }
      }

      // Time pattern check (unusual hours)
      if (conditions.unusualHours) {
        const txHour = new Date(transaction.created_at).getHours();
        if (txHour >= 0 && txHour <= 5) {
          triggered = true;
          riskScore = Math.max(riskScore, 25);
        }
      }

      if (triggered) {
        alerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          alertType: rule.rule_type,
          severity: rule.severity,
          description: `Transaction triggered rule: ${rule.name}`,
          riskScore,
        });
        totalRiskScore += riskScore;
      }
    }

    // Calculate overall risk level
    const averageRiskScore = alerts.length > 0 ? Math.min(100, Math.floor(totalRiskScore / alerts.length)) : 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (averageRiskScore >= 80) riskLevel = 'critical';
    else if (averageRiskScore >= 60) riskLevel = 'high';
    else if (averageRiskScore >= 40) riskLevel = 'medium';

    // Create alerts for triggered rules
    const createdAlerts: string[] = [];
    for (const alert of alerts) {
      const alertId = uuidv4();
      db.prepare(`
        INSERT INTO fds_alerts (id, alert_type, severity, target_type, target_id, transaction_id, description, details, risk_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        alertId,
        alert.alertType,
        alert.severity,
        'transaction',
        transactionId,
        transactionId,
        alert.description,
        JSON.stringify({ ruleId: alert.ruleId, ruleName: alert.ruleName }),
        alert.riskScore,
        'new'
      );
      createdAlerts.push(alertId);
    }

    res.json({
      success: true,
      data: {
        transactionId,
        analyzed: true,
        riskLevel,
        riskScore: averageRiskScore,
        alertsGenerated: alerts.length,
        alertIds: createdAlerts,
        details: {
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            userName: transaction.user_name,
            merchantName: transaction.merchant_name,
          },
          rulesChecked: rules.length,
          rulesTriggered: alerts.length,
          alerts: alerts.map(a => ({
            ruleName: a.ruleName,
            severity: a.severity,
            riskScore: a.riskScore,
          })),
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Analyze transaction error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to analyze transaction' } });
  }
});

// ==================== AML Cases ====================

/**
 * GET /api/compliance/aml/cases
 * List AML cases
 */
router.get('/aml/cases', [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['open', 'investigating', 'pending_report', 'reported', 'closed']),
  query('riskLevel').optional().isIn(['critical', 'high', 'medium', 'low']),
  query('caseType').optional().isIn(['ctr', 'str', 'sar', 'suspicious_activity']),
  query('subjectType').optional().isIn(['user', 'merchant']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const { status, riskLevel, caseType, subjectType } = req.query;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status as string);
    }
    if (riskLevel) {
      whereClause += ' AND c.risk_level = ?';
      params.push(riskLevel as string);
    }
    if (caseType) {
      whereClause += ' AND c.case_type = ?';
      params.push(caseType as string);
    }
    if (subjectType) {
      whereClause += ' AND c.subject_type = ?';
      params.push(subjectType as string);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM aml_cases c ${whereClause}
    `).get(...params) as { count: number };

    const cases = db.prepare(`
      SELECT c.*, u.name as investigator_name
      FROM aml_cases c
      LEFT JOIN users u ON c.investigator_id = u.id
      ${whereClause}
      ORDER BY
        CASE c.risk_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (AmlCaseRow & { investigator_name?: string })[];

    res.json({
      success: true,
      data: {
        cases: cases.map(c => ({
          id: c.id,
          caseNumber: c.case_number,
          caseType: c.case_type,
          subjectType: c.subject_type,
          subjectId: c.subject_id,
          riskLevel: c.risk_level,
          totalAmount: c.total_amount,
          status: c.status,
          investigatorId: c.investigator_id,
          investigatorName: c.investigator_name,
          summary: c.summary,
          reportedToKofiu: c.reported_to_kofiu === 1,
          kofiuReference: c.kofiu_reference,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('List AML cases error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list cases' } });
  }
});

/**
 * POST /api/compliance/aml/cases
 * Create AML case
 */
router.post('/aml/cases', [
  body('caseType').isIn(['ctr', 'str', 'sar', 'suspicious_activity']).withMessage('Invalid case type'),
  body('subjectType').isIn(['user', 'merchant']).withMessage('Invalid subject type'),
  body('subjectId').notEmpty().withMessage('Subject ID is required'),
  body('riskLevel').isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid risk level'),
  body('totalAmount').optional().isInt({ min: 0 }),
  body('summary').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { caseType, subjectType, subjectId, riskLevel, totalAmount, summary } = req.body;
    const db = getDb();

    // Verify subject exists
    if (subjectType === 'user') {
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(subjectId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
    } else if (subjectType === 'merchant') {
      const merchant = db.prepare('SELECT id FROM merchants WHERE id = ?').get(subjectId);
      if (!merchant) {
        throw new NotFoundError('Merchant not found');
      }
    }

    // Generate case number
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM aml_cases').get() as { count: number };
    const caseNumber = `AML-${new Date().getFullYear()}-${String(caseCount.count + 1).padStart(6, '0')}`;

    const caseId = uuidv4();
    db.prepare(`
      INSERT INTO aml_cases (id, case_number, case_type, subject_type, subject_id, risk_level, total_amount, summary, investigator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(caseId, caseNumber, caseType, subjectType, subjectId, riskLevel, totalAmount || null, summary || null, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'AML_CASE_CREATED',
      req.user!.userId,
      'admin',
      'aml_case',
      caseId,
      `AML case ${caseNumber} created for ${subjectType} ${subjectId}`,
      JSON.stringify({ caseType, riskLevel, totalAmount })
    );

    const amlCase = db.prepare('SELECT * FROM aml_cases WHERE id = ?').get(caseId) as AmlCaseRow;

    res.status(201).json({
      success: true,
      data: {
        id: amlCase.id,
        caseNumber: amlCase.case_number,
        caseType: amlCase.case_type,
        subjectType: amlCase.subject_type,
        subjectId: amlCase.subject_id,
        riskLevel: amlCase.risk_level,
        totalAmount: amlCase.total_amount,
        status: amlCase.status,
        summary: amlCase.summary,
        createdAt: amlCase.created_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create AML case error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create case' } });
  }
});

/**
 * GET /api/compliance/aml/cases/:id
 * Get AML case details
 */
router.get('/aml/cases/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const amlCase = db.prepare(`
      SELECT c.*, u.name as investigator_name
      FROM aml_cases c
      LEFT JOIN users u ON c.investigator_id = u.id
      WHERE c.id = ?
    `).get(req.params.id) as (AmlCaseRow & { investigator_name?: string }) | undefined;

    if (!amlCase) {
      throw new NotFoundError('Case not found');
    }

    // Get subject info
    let subjectInfo = null;
    if (amlCase.subject_type === 'user') {
      subjectInfo = db.prepare('SELECT id, name, email, user_type, kyc_verified FROM users WHERE id = ?')
        .get(amlCase.subject_id) as UserRow | undefined;
    } else if (amlCase.subject_type === 'merchant') {
      subjectInfo = db.prepare('SELECT id, store_name, business_number, is_verified FROM merchants WHERE id = ?')
        .get(amlCase.subject_id) as MerchantRow | undefined;
    }

    // Get related reports
    const reports = db.prepare(`
      SELECT * FROM aml_reports WHERE case_id = ? ORDER BY created_at DESC
    `).all(req.params.id) as AmlReportRow[];

    // Get related transactions (if user)
    let relatedTransactions: TransactionRow[] = [];
    if (amlCase.subject_type === 'user') {
      relatedTransactions = db.prepare(`
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(amlCase.subject_id) as TransactionRow[];
    } else if (amlCase.subject_type === 'merchant') {
      relatedTransactions = db.prepare(`
        SELECT * FROM transactions
        WHERE merchant_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(amlCase.subject_id) as TransactionRow[];
    }

    res.json({
      success: true,
      data: {
        id: amlCase.id,
        caseNumber: amlCase.case_number,
        caseType: amlCase.case_type,
        subjectType: amlCase.subject_type,
        subjectId: amlCase.subject_id,
        subjectInfo,
        riskLevel: amlCase.risk_level,
        totalAmount: amlCase.total_amount,
        status: amlCase.status,
        investigatorId: amlCase.investigator_id,
        investigatorName: amlCase.investigator_name,
        summary: amlCase.summary,
        findings: amlCase.findings,
        reportedToKofiu: amlCase.reported_to_kofiu === 1,
        kofiuReference: amlCase.kofiu_reference,
        kofiuReportedAt: amlCase.kofiu_reported_at,
        createdAt: amlCase.created_at,
        updatedAt: amlCase.updated_at,
        reports: reports.map(r => ({
          id: r.id,
          reportType: r.report_type,
          amount: r.amount,
          submittedAt: r.submitted_at,
          kofiuStatus: r.kofiu_status,
          kofiuReference: r.kofiu_reference,
          createdAt: r.created_at,
        })),
        relatedTransactions: relatedTransactions.slice(0, 20).map(t => ({
          id: t.id,
          txId: t.tx_id,
          amount: t.amount,
          type: t.type,
          status: t.status,
          createdAt: t.created_at,
        })),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get AML case error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get case' } });
  }
});

/**
 * PUT /api/compliance/aml/cases/:id
 * Update AML case
 */
router.put('/aml/cases/:id', [
  body('status').optional().isIn(['open', 'investigating', 'pending_report', 'reported', 'closed']),
  body('riskLevel').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('investigatorId').optional().isString(),
  body('summary').optional().isString(),
  body('findings').optional().isString(),
  body('reportedToKofiu').optional().isBoolean(),
  body('kofiuReference').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { status, riskLevel, investigatorId, summary, findings, reportedToKofiu, kofiuReference } = req.body;
    const db = getDb();

    const existingCase = db.prepare('SELECT * FROM aml_cases WHERE id = ?').get(req.params.id) as AmlCaseRow | undefined;
    if (!existingCase) {
      throw new NotFoundError('Case not found');
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (riskLevel !== undefined) {
      updates.push('risk_level = ?');
      params.push(riskLevel);
    }
    if (investigatorId !== undefined) {
      updates.push('investigator_id = ?');
      params.push(investigatorId || null);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      params.push(summary);
    }
    if (findings !== undefined) {
      updates.push('findings = ?');
      params.push(findings);
    }
    if (reportedToKofiu !== undefined) {
      updates.push('reported_to_kofiu = ?');
      params.push(reportedToKofiu ? 1 : 0);
      if (reportedToKofiu) {
        updates.push("kofiu_reported_at = datetime('now')");
      }
    }
    if (kofiuReference !== undefined) {
      updates.push('kofiu_reference = ?');
      params.push(kofiuReference);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE aml_cases SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'AML_CASE_UPDATED',
      req.user!.userId,
      'admin',
      'aml_case',
      req.params.id,
      `AML case ${existingCase.case_number} updated`,
      JSON.stringify({ previousStatus: existingCase.status, newStatus: status })
    );

    const updatedCase = db.prepare('SELECT * FROM aml_cases WHERE id = ?').get(req.params.id) as AmlCaseRow;

    res.json({
      success: true,
      data: {
        id: updatedCase.id,
        caseNumber: updatedCase.case_number,
        status: updatedCase.status,
        riskLevel: updatedCase.risk_level,
        summary: updatedCase.summary,
        findings: updatedCase.findings,
        reportedToKofiu: updatedCase.reported_to_kofiu === 1,
        kofiuReference: updatedCase.kofiu_reference,
        updatedAt: updatedCase.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update AML case error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update case' } });
  }
});

// ==================== AML Reports ====================

/**
 * GET /api/compliance/aml/reports
 * List AML reports
 */
router.get('/aml/reports', [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('reportType').optional().isIn(['ctr', 'str']),
  query('kofiuStatus').optional().isIn(['draft', 'submitted', 'accepted', 'rejected']),
  query('caseId').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const { reportType, kofiuStatus, caseId } = req.query;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (reportType) {
      whereClause += ' AND r.report_type = ?';
      params.push(reportType as string);
    }
    if (kofiuStatus) {
      whereClause += ' AND r.kofiu_status = ?';
      params.push(kofiuStatus as string);
    }
    if (caseId) {
      whereClause += ' AND r.case_id = ?';
      params.push(caseId as string);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM aml_reports r ${whereClause}
    `).get(...params) as { count: number };

    const reports = db.prepare(`
      SELECT r.*, c.case_number
      FROM aml_reports r
      LEFT JOIN aml_cases c ON r.case_id = c.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (AmlReportRow & { case_number?: string })[];

    res.json({
      success: true,
      data: {
        reports: reports.map(r => ({
          id: r.id,
          caseId: r.case_id,
          caseNumber: r.case_number,
          reportType: r.report_type,
          amount: r.amount,
          submittedAt: r.submitted_at,
          kofiuStatus: r.kofiu_status,
          kofiuReference: r.kofiu_reference,
          createdAt: r.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('List AML reports error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' } });
  }
});

/**
 * POST /api/compliance/aml/reports
 * Create CTR/STR report
 */
router.post('/aml/reports', [
  body('caseId').notEmpty().withMessage('Case ID is required'),
  body('reportType').isIn(['ctr', 'str']).withMessage('Report type must be ctr or str'),
  body('reportData').isObject().withMessage('Report data must be an object'),
  body('amount').optional().isInt({ min: 0 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { caseId, reportType, reportData, amount } = req.body;
    const db = getDb();

    // Verify case exists
    const amlCase = db.prepare('SELECT * FROM aml_cases WHERE id = ?').get(caseId) as AmlCaseRow | undefined;
    if (!amlCase) {
      throw new NotFoundError('Case not found');
    }

    // Validate CTR threshold (10M KRW)
    if (reportType === 'ctr' && amount && amount < CTR_THRESHOLD) {
      throw new BadRequestError(`CTR requires amount >= ${CTR_THRESHOLD.toLocaleString()} KRW (10M threshold)`);
    }

    const reportId = uuidv4();
    db.prepare(`
      INSERT INTO aml_reports (id, case_id, report_type, report_data, amount, kofiu_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reportId, caseId, reportType, JSON.stringify(reportData), amount || null, 'draft');

    // Update case status to pending_report if it was open
    if (amlCase.status === 'open' || amlCase.status === 'investigating') {
      db.prepare(`UPDATE aml_cases SET status = 'pending_report', updated_at = datetime('now') WHERE id = ?`).run(caseId);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      reportType === 'ctr' ? 'AML_CTR_CREATED' : 'AML_STR_CREATED',
      req.user!.userId,
      'admin',
      'aml_report',
      reportId,
      `${reportType.toUpperCase()} report created for case ${amlCase.case_number}`,
      JSON.stringify({ caseId, amount })
    );

    const report = db.prepare('SELECT * FROM aml_reports WHERE id = ?').get(reportId) as AmlReportRow;

    res.status(201).json({
      success: true,
      data: {
        id: report.id,
        caseId: report.case_id,
        reportType: report.report_type,
        amount: report.amount,
        kofiuStatus: report.kofiu_status,
        createdAt: report.created_at,
        ctrThreshold: CTR_THRESHOLD,
        message: reportType === 'ctr'
          ? 'Currency Transaction Report created. Submit to KoFIU within required timeframe.'
          : 'Suspicious Transaction Report created. Review and submit to KoFIU.',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create AML report error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' } });
  }
});

// ==================== Screening ====================

/**
 * POST /api/compliance/aml/screening
 * Screen user/merchant for AML risks
 */
router.post('/aml/screening', [
  body('subjectType').isIn(['user', 'merchant']).withMessage('Subject type must be user or merchant'),
  body('subjectId').notEmpty().withMessage('Subject ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { subjectType, subjectId } = req.body;
    const db = getDb();

    let subject: UserRow | MerchantRow | undefined;
    let transactionQuery: string;

    if (subjectType === 'user') {
      subject = db.prepare('SELECT id, name, email, user_type, kyc_verified FROM users WHERE id = ?')
        .get(subjectId) as UserRow | undefined;
      transactionQuery = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC';
    } else {
      subject = db.prepare('SELECT id, store_name, business_number, is_verified FROM merchants WHERE id = ?')
        .get(subjectId) as MerchantRow | undefined;
      transactionQuery = 'SELECT * FROM transactions WHERE merchant_id = ? ORDER BY created_at DESC';
    }

    if (!subject) {
      throw new NotFoundError(`${subjectType} not found`);
    }

    // Get transaction history for analysis
    const transactions = db.prepare(transactionQuery).all(subjectId) as TransactionRow[];

    // Calculate risk indicators
    const riskIndicators: {
      indicator: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      value: number | string;
    }[] = [];

    // 1. Transaction volume analysis
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const last30DaysTransactions = transactions.filter(t => {
      const txDate = new Date(t.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return txDate >= thirtyDaysAgo;
    });
    const last30DaysVolume = last30DaysTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Check for high volume (threshold for STR consideration)
    if (last30DaysVolume >= STR_THRESHOLD * 3) {
      riskIndicators.push({
        indicator: 'high_volume',
        severity: 'high',
        description: 'High transaction volume in last 30 days',
        value: last30DaysVolume,
      });
    }

    // 2. CTR threshold check
    const ctrTransactions = transactions.filter(t => t.amount >= CTR_THRESHOLD);
    if (ctrTransactions.length > 0) {
      riskIndicators.push({
        indicator: 'ctr_threshold',
        severity: 'medium',
        description: `${ctrTransactions.length} transactions >= 10M KRW threshold`,
        value: ctrTransactions.length,
      });
    }

    // 3. Structuring detection (multiple transactions just under threshold)
    const nearThresholdTransactions = transactions.filter(t =>
      t.amount >= CTR_THRESHOLD * 0.8 && t.amount < CTR_THRESHOLD
    );
    if (nearThresholdTransactions.length >= 3) {
      riskIndicators.push({
        indicator: 'potential_structuring',
        severity: 'high',
        description: 'Multiple transactions just below reporting threshold',
        value: nearThresholdTransactions.length,
      });
    }

    // 4. Velocity check (rapid transactions)
    const transactionDates = transactions.slice(0, 20).map(t => new Date(t.created_at));
    let rapidTransactionCount = 0;
    for (let i = 1; i < transactionDates.length; i++) {
      const timeDiff = transactionDates[i - 1].getTime() - transactionDates[i].getTime();
      if (timeDiff < 60000) { // Less than 1 minute apart
        rapidTransactionCount++;
      }
    }
    if (rapidTransactionCount >= 5) {
      riskIndicators.push({
        indicator: 'rapid_transactions',
        severity: 'medium',
        description: 'Multiple rapid-fire transactions detected',
        value: rapidTransactionCount,
      });
    }

    // 5. KYC status check
    if (subjectType === 'user' && (subject as UserRow).kyc_verified === 0) {
      riskIndicators.push({
        indicator: 'unverified_kyc',
        severity: 'medium',
        description: 'User has not completed KYC verification',
        value: 'Not verified',
      });
    } else if (subjectType === 'merchant' && (subject as MerchantRow).is_verified === 0) {
      riskIndicators.push({
        indicator: 'unverified_merchant',
        severity: 'medium',
        description: 'Merchant has not completed verification',
        value: 'Not verified',
      });
    }

    // Calculate overall risk score
    let riskScore = 0;
    for (const indicator of riskIndicators) {
      if (indicator.severity === 'critical') riskScore += 30;
      else if (indicator.severity === 'high') riskScore += 20;
      else if (indicator.severity === 'medium') riskScore += 10;
      else riskScore += 5;
    }
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    // Check for existing AML cases
    const existingCases = db.prepare(`
      SELECT id, case_number, status FROM aml_cases
      WHERE subject_type = ? AND subject_id = ? AND status != 'closed'
    `).all(subjectType, subjectId) as { id: string; case_number: string; status: string }[];

    // Log screening
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'AML_SCREENING_PERFORMED',
      req.user!.userId,
      'admin',
      subjectType,
      subjectId,
      `AML screening performed on ${subjectType} ${subjectId}`,
      JSON.stringify({ riskScore, riskLevel, indicatorCount: riskIndicators.length })
    );

    res.json({
      success: true,
      data: {
        subject: {
          type: subjectType,
          id: subjectId,
          info: subject,
        },
        screening: {
          riskScore,
          riskLevel,
          indicators: riskIndicators,
          transactionSummary: {
            totalTransactions: transactions.length,
            totalVolume,
            last30DaysTransactions: last30DaysTransactions.length,
            last30DaysVolume,
            ctrThresholdTransactions: ctrTransactions.length,
          },
        },
        existingCases,
        recommendations: riskLevel === 'critical' || riskLevel === 'high'
          ? ['Create AML case for further investigation', 'Review transaction patterns', 'Verify KYC/merchant status']
          : riskLevel === 'medium'
          ? ['Monitor for changes in transaction patterns', 'Consider enhanced due diligence']
          : ['Continue regular monitoring'],
        thresholds: {
          ctr: CTR_THRESHOLD,
          str: STR_THRESHOLD,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('AML screening error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to perform screening' } });
  }
});

// ==================== Risk Score ====================

/**
 * GET /api/compliance/risk-score/:type/:id
 * Get risk score for user or merchant
 */
router.get('/risk-score/:type/:id', [
  param('type').isIn(['user', 'merchant']).withMessage('Type must be user or merchant'),
  param('id').notEmpty().withMessage('ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { type, id } = req.params;
    const db = getDb();

    // Verify subject exists
    let subject: UserRow | MerchantRow | undefined;
    if (type === 'user') {
      subject = db.prepare('SELECT id, name, email, user_type, kyc_verified FROM users WHERE id = ?')
        .get(id) as UserRow | undefined;
    } else {
      subject = db.prepare('SELECT id, store_name, business_number, is_verified FROM merchants WHERE id = ?')
        .get(id) as MerchantRow | undefined;
    }

    if (!subject) {
      throw new NotFoundError(`${type} not found`);
    }

    // Get FDS alerts for this subject
    const fdsAlerts = db.prepare(`
      SELECT * FROM fds_alerts
      WHERE target_type = ? AND target_id = ? AND status NOT IN ('resolved', 'false_positive')
    `).all(type, id) as FdsAlertRow[];

    // Get AML cases for this subject
    const amlCases = db.prepare(`
      SELECT * FROM aml_cases
      WHERE subject_type = ? AND subject_id = ? AND status != 'closed'
    `).all(type, id) as AmlCaseRow[];

    // Get transaction statistics
    let transactionQuery: string;
    if (type === 'user') {
      transactionQuery = `
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_volume,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM transactions
        WHERE user_id = ?
      `;
    } else {
      transactionQuery = `
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_volume,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM transactions
        WHERE merchant_id = ?
      `;
    }

    const txStats = db.prepare(transactionQuery).get(id) as {
      total_count: number;
      total_volume: number;
      avg_amount: number;
      max_amount: number;
    };

    // Calculate risk scores
    let fdsScore = 0;
    for (const alert of fdsAlerts) {
      if (alert.severity === 'critical') fdsScore += 30;
      else if (alert.severity === 'high') fdsScore += 20;
      else if (alert.severity === 'medium') fdsScore += 10;
      else fdsScore += 5;
    }
    fdsScore = Math.min(100, fdsScore);

    let amlScore = 0;
    for (const amlCase of amlCases) {
      if (amlCase.risk_level === 'critical') amlScore += 40;
      else if (amlCase.risk_level === 'high') amlScore += 30;
      else if (amlCase.risk_level === 'medium') amlScore += 20;
      else amlScore += 10;
    }
    amlScore = Math.min(100, amlScore);

    // Transaction pattern score
    let txScore = 0;
    if (txStats.max_amount >= CTR_THRESHOLD) txScore += 20;
    if (txStats.total_volume >= CTR_THRESHOLD * 10) txScore += 20;
    if (txStats.avg_amount >= CTR_THRESHOLD * 0.5) txScore += 15;
    txScore = Math.min(100, txScore);

    // Overall risk score (weighted average)
    const overallScore = Math.round(fdsScore * 0.35 + amlScore * 0.45 + txScore * 0.20);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overallScore >= 70) riskLevel = 'critical';
    else if (overallScore >= 50) riskLevel = 'high';
    else if (overallScore >= 25) riskLevel = 'medium';

    res.json({
      success: true,
      data: {
        subjectType: type,
        subjectId: id,
        riskScore: {
          overall: overallScore,
          fds: fdsScore,
          aml: amlScore,
          transaction: txScore,
        },
        riskLevel,
        components: {
          fdsAlerts: {
            count: fdsAlerts.length,
            critical: fdsAlerts.filter(a => a.severity === 'critical').length,
            high: fdsAlerts.filter(a => a.severity === 'high').length,
            medium: fdsAlerts.filter(a => a.severity === 'medium').length,
            low: fdsAlerts.filter(a => a.severity === 'low').length,
          },
          amlCases: {
            count: amlCases.length,
            critical: amlCases.filter(c => c.risk_level === 'critical').length,
            high: amlCases.filter(c => c.risk_level === 'high').length,
            medium: amlCases.filter(c => c.risk_level === 'medium').length,
            low: amlCases.filter(c => c.risk_level === 'low').length,
          },
          transactions: {
            totalCount: txStats.total_count,
            totalVolume: txStats.total_volume,
            avgAmount: Math.round(txStats.avg_amount),
            maxAmount: txStats.max_amount,
          },
        },
        verified: type === 'user'
          ? (subject as UserRow).kyc_verified === 1
          : (subject as MerchantRow).is_verified === 1,
        thresholds: {
          ctr: CTR_THRESHOLD,
          str: STR_THRESHOLD,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get risk score error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get risk score' } });
  }
});

export default router;
