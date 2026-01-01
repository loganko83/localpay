/**
 * Export Service
 * CSV, Excel, and PDF export functionality
 */

import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  merchantId?: string;
}

export interface TransactionExportRow {
  id: string;
  date: string;
  type: string;
  amount: number;
  merchant: string;
  status: string;
  description: string;
}

export interface UserDataExport {
  profile: Record<string, unknown>;
  transactions: TransactionExportRow[];
  wallet: Record<string, unknown>;
}

/**
 * Export transactions to CSV
 */
export function exportTransactionsToCSV(
  transactions: TransactionExportRow[]
): string {
  const fields = [
    { label: 'Transaction ID', value: 'id' },
    { label: 'Date', value: 'date' },
    { label: 'Type', value: 'type' },
    { label: 'Amount (KRW)', value: 'amount' },
    { label: 'Merchant', value: 'merchant' },
    { label: 'Status', value: 'status' },
    { label: 'Description', value: 'description' },
  ];

  const parser = new Parser({ fields });
  return parser.parse(transactions);
}

/**
 * Export transactions to PDF
 */
export async function exportTransactionsToPDF(
  transactions: TransactionExportRow[],
  title: string = 'Transaction Report'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    doc.fontSize(12).text('Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Total Transactions: ${transactions.length}`);
    doc.text(`Total Amount: ${totalAmount.toLocaleString()} KRW`);
    doc.moveDown(2);

    // Table header
    doc.fontSize(12).text('Transaction Details', { underline: true });
    doc.moveDown();

    // Table
    const tableTop = doc.y;
    const colWidths = [100, 70, 60, 80, 100, 60];
    const headers = ['Date', 'Type', 'Amount', 'Merchant', 'Status', 'ID'];

    // Draw header
    doc.fontSize(9).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.font('Helvetica');
    let yPos = tableTop + 20;

    // Draw rows
    transactions.slice(0, 50).forEach((tx) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      xPos = 50;
      const row = [
        tx.date.split('T')[0],
        tx.type,
        tx.amount.toLocaleString(),
        tx.merchant.substring(0, 15),
        tx.status,
        tx.id.substring(0, 8),
      ];

      row.forEach((cell, i) => {
        doc.text(cell, xPos, yPos, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      yPos += 15;
    });

    if (transactions.length > 50) {
      doc.moveDown(2);
      doc.text(`... and ${transactions.length - 50} more transactions`);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('LocalPay - Confidential', { align: 'center' });

    doc.end();
  });
}

/**
 * Get user transactions for export
 */
export function getUserTransactions(
  userId: string,
  options: { dateFrom?: string; dateTo?: string } = {}
): TransactionExportRow[] {
  const db = getDb();

  let query = `
    SELECT
      t.id,
      t.created_at as date,
      t.transaction_type as type,
      t.amount,
      COALESCE(m.store_name, 'N/A') as merchant,
      t.status,
      t.description
    FROM transactions t
    LEFT JOIN merchants m ON t.merchant_id = m.id
    WHERE t.user_id = ?
  `;

  const params: (string | number)[] = [userId];

  if (options.dateFrom) {
    query += ' AND t.created_at >= ?';
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    query += ' AND t.created_at <= ?';
    params.push(options.dateTo);
  }

  query += ' ORDER BY t.created_at DESC';

  const transactions = db.prepare(query).all(...params) as TransactionExportRow[];
  return transactions;
}

/**
 * Get merchant transactions for export
 */
export function getMerchantTransactions(
  merchantId: string,
  options: { dateFrom?: string; dateTo?: string } = {}
): TransactionExportRow[] {
  const db = getDb();

  let query = `
    SELECT
      t.id,
      t.created_at as date,
      t.transaction_type as type,
      t.amount,
      u.name as merchant,
      t.status,
      t.description
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.merchant_id = ?
  `;

  const params: (string | number)[] = [merchantId];

  if (options.dateFrom) {
    query += ' AND t.created_at >= ?';
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    query += ' AND t.created_at <= ?';
    params.push(options.dateTo);
  }

  query += ' ORDER BY t.created_at DESC';

  const transactions = db.prepare(query).all(...params) as TransactionExportRow[];
  return transactions;
}

/**
 * Export all user data (GDPR compliance)
 */
export function exportUserData(userId: string): UserDataExport {
  const db = getDb();

  // Get user profile
  const profile = db.prepare(`
    SELECT id, email, phone, name, user_type, avatar_url, kyc_verified, level, created_at
    FROM users WHERE id = ?
  `).get(userId) as Record<string, unknown>;

  // Get wallet
  const wallet = db.prepare(`
    SELECT id, balance, created_at, updated_at
    FROM wallets WHERE user_id = ?
  `).get(userId) as Record<string, unknown>;

  // Get all transactions
  const transactions = getUserTransactions(userId);

  logger.info('User data exported for GDPR', { userId });

  return {
    profile,
    transactions,
    wallet,
  };
}

/**
 * Generate settlement report PDF
 */
export async function generateSettlementReport(
  merchantId: string,
  dateFrom: string,
  dateTo: string
): Promise<Buffer> {
  const db = getDb();

  // Get merchant info
  const merchant = db.prepare(`
    SELECT m.store_name, m.business_number, u.name as owner_name
    FROM merchants m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(merchantId) as { store_name: string; business_number: string; owner_name: string };

  // Get transaction summary
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
      SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) as refund_amount
    FROM transactions
    WHERE merchant_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(merchantId, dateFrom, dateTo) as {
    total_count: number;
    total_amount: number;
    refund_amount: number;
  };

  // Get daily breakdown
  const dailyBreakdown = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(amount) as amount
    FROM transactions
    WHERE merchant_id = ?
      AND created_at >= ?
      AND created_at <= ?
      AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(merchantId, dateFrom, dateTo) as Array<{ date: string; count: number; amount: number }>;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Settlement Report', { align: 'center' });
    doc.moveDown();

    // Merchant info
    doc.fontSize(12);
    doc.text(`Store: ${merchant.store_name}`);
    doc.text(`Business Number: ${merchant.business_number}`);
    doc.text(`Owner: ${merchant.owner_name}`);
    doc.text(`Period: ${dateFrom} ~ ${dateTo}`);
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Transactions: ${summary.total_count}`);
    doc.text(`Total Sales: ${(summary.total_amount || 0).toLocaleString()} KRW`);
    doc.text(`Refunds: ${(summary.refund_amount || 0).toLocaleString()} KRW`);
    doc.text(`Net Amount: ${((summary.total_amount || 0) - (summary.refund_amount || 0)).toLocaleString()} KRW`);
    doc.moveDown(2);

    // Daily breakdown
    doc.fontSize(14).text('Daily Breakdown', { underline: true });
    doc.moveDown();

    dailyBreakdown.forEach((day) => {
      doc.fontSize(10).text(
        `${day.date}: ${day.count} transactions, ${day.amount.toLocaleString()} KRW`
      );
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.text('LocalPay Settlement System', { align: 'center' });

    doc.end();
  });
}

export default {
  exportTransactionsToCSV,
  exportTransactionsToPDF,
  getUserTransactions,
  getMerchantTransactions,
  exportUserData,
  generateSettlementReport,
};
