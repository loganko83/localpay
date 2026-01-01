/**
 * Database initialization and connection
 * Using better-sqlite3 for SQLite database
 */

import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data/localpay.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  const fs = await import('fs');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database connection
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables();

  // Seed initial data if empty
  seedInitialData();
}

function createTables(): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK (user_type IN ('consumer', 'merchant', 'admin')),
      avatar_url TEXT,
      did TEXT,
      kyc_verified INTEGER DEFAULT 0,
      kyc_verified_at TEXT,
      level TEXT DEFAULT 'Bronze',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Merchants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      store_name TEXT NOT NULL,
      business_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      image_url TEXT,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_open INTEGER DEFAULT 1,
      merchant_did TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Wallets table (display values only - actual funds managed by bank)
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      balance REAL DEFAULT 0,
      pending_balance REAL DEFAULT 0,
      daily_limit REAL DEFAULT 500000,
      monthly_limit REAL DEFAULT 2000000,
      total_limit REAL DEFAULT 3000000,
      used_today REAL DEFAULT 0,
      used_this_month REAL DEFAULT 0,
      last_synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Transactions table (audit records - actual transactions via bank)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tx_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT REFERENCES merchants(id),
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('payment', 'topup', 'refund', 'transfer', 'withdrawal')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'failed')),
      approval_code TEXT,
      receipt_number TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
      permissions TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'revoked')),
      last_active_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Vouchers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('welcome', 'promo', 'subsidy', 'partner')),
      usage_limit INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Audit logs table (blockchain-anchored)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_did TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      description TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      blockchain_hash TEXT,
      block_number INTEGER,
      transaction_hash TEXT,
      signature TEXT,
      signed_by TEXT,
      verified INTEGER DEFAULT 0,
      verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      device_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      last_active_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    )
  `);

  // Login attempts table (for account lockout)
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      success INTEGER NOT NULL,
      user_agent TEXT,
      attempted_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Voucher usage tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS voucher_usage (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL REFERENCES vouchers(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      used_at TEXT DEFAULT (datetime('now')),
      UNIQUE(voucher_id, user_id)
    )
  `);

  // Coupons table
  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      merchant_id TEXT REFERENCES merchants(id),
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'cashback')),
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      max_discount REAL,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      usage_limit INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      category TEXT,
      region TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted')),
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 14: Settlements ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_sales INTEGER NOT NULL DEFAULT 0,
      total_refunds INTEGER NOT NULL DEFAULT 0,
      fee_rate REAL DEFAULT 0.02,
      fee_amount INTEGER NOT NULL DEFAULT 0,
      net_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      scheduled_date TEXT,
      completed_date TEXT,
      bank_reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settlement_items (
      id TEXT PRIMARY KEY,
      settlement_id TEXT NOT NULL REFERENCES settlements(id),
      transaction_id TEXT NOT NULL REFERENCES transactions(id),
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('sale', 'refund')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 14: Welfare ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS welfare_programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('youth', 'senior', 'disability', 'culture', 'education', 'housing', 'medical')),
      budget INTEGER NOT NULL DEFAULT 0,
      spent INTEGER NOT NULL DEFAULT 0,
      beneficiary_count INTEGER DEFAULT 0,
      eligibility_criteria TEXT,
      amount_per_person INTEGER,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS welfare_beneficiaries (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES welfare_programs(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      did TEXT,
      verification_type TEXT,
      verified_at TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(program_id, user_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS welfare_distributions (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES welfare_programs(id),
      beneficiary_id TEXT NOT NULL REFERENCES welfare_beneficiaries(id),
      amount INTEGER NOT NULL,
      transaction_id TEXT REFERENCES transactions(id),
      blockchain_hash TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
      distributed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 15: FDS/AML ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS fds_alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL CHECK (alert_type IN ('velocity', 'amount_anomaly', 'phantom_merchant', 'qr_duplicate', 'geographic', 'time_pattern', 'device_anomaly')),
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
      target_type TEXT NOT NULL CHECK (target_type IN ('user', 'merchant', 'transaction')),
      target_id TEXT NOT NULL,
      transaction_id TEXT REFERENCES transactions(id),
      description TEXT NOT NULL,
      details TEXT,
      risk_score INTEGER,
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive', 'escalated')),
      assigned_to TEXT REFERENCES users(id),
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fds_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      rule_type TEXT NOT NULL,
      conditions TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS aml_cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      case_type TEXT NOT NULL CHECK (case_type IN ('ctr', 'str', 'sar', 'suspicious_activity')),
      subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'merchant')),
      subject_id TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
      total_amount INTEGER,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'pending_report', 'reported', 'closed')),
      investigator_id TEXT REFERENCES users(id),
      summary TEXT,
      findings TEXT,
      reported_to_kofiu INTEGER DEFAULT 0,
      kofiu_reference TEXT,
      kofiu_reported_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS aml_reports (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES aml_cases(id),
      report_type TEXT NOT NULL CHECK (report_type IN ('ctr', 'str')),
      report_data TEXT NOT NULL,
      amount INTEGER,
      submitted_at TEXT,
      kofiu_status TEXT CHECK (kofiu_status IN ('draft', 'submitted', 'accepted', 'rejected')),
      kofiu_reference TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 17: Offers ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      merchant_id TEXT REFERENCES merchants(id),
      discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'cashback')),
      discount_value INTEGER,
      min_purchase INTEGER DEFAULT 0,
      image_url TEXT,
      terms TEXT,
      valid_from TEXT,
      valid_until TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'expired')),
      view_count INTEGER DEFAULT 0,
      claim_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_coupons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      coupon_id TEXT NOT NULL REFERENCES coupons(id),
      claimed_at TEXT DEFAULT (datetime('now')),
      used_at TEXT,
      transaction_id TEXT REFERENCES transactions(id),
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
      UNIQUE(user_id, coupon_id)
    )
  `);

  // ==================== Sprint 18: Loyalty ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      points_balance INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
      tier_points INTEGER DEFAULT 0,
      tier_expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES loyalty_accounts(id),
      points INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'bonus')),
      source TEXT,
      reference_id TEXT,
      description TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      points_required INTEGER NOT NULL,
      reward_type TEXT NOT NULL CHECK (reward_type IN ('voucher', 'product', 'experience', 'cashback')),
      value INTEGER,
      quantity INTEGER,
      redeemed_count INTEGER DEFAULT 0,
      image_url TEXT,
      merchant_id TEXT REFERENCES merchants(id),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'exhausted')),
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 18: Carbon ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS carbon_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      points_balance INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      co2_saved_kg REAL DEFAULT 0,
      trees_equivalent REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS carbon_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES carbon_accounts(id),
      points INTEGER NOT NULL,
      co2_kg REAL,
      type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire')),
      activity_type TEXT CHECK (activity_type IN ('local_purchase', 'public_transport', 'eco_merchant', 'bike_share', 'recycling')),
      reference_id TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 19: Credit Score ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchant_credit_scores (
      id TEXT PRIMARY KEY,
      merchant_id TEXT UNIQUE NOT NULL REFERENCES merchants(id),
      score INTEGER NOT NULL DEFAULT 500,
      grade TEXT NOT NULL DEFAULT 'C' CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C', 'D', 'F')),
      payment_history_score INTEGER DEFAULT 0,
      volume_score INTEGER DEFAULT 0,
      tenure_score INTEGER DEFAULT 0,
      compliance_score INTEGER DEFAULT 0,
      growth_score INTEGER DEFAULT 0,
      calculated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_applications (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      requested_amount INTEGER NOT NULL,
      purpose TEXT,
      term_months INTEGER,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),
      approved_amount INTEGER,
      interest_rate REAL,
      reviewer_id TEXT REFERENCES users(id),
      reviewed_at TEXT,
      rejection_reason TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS merchant_credit_history (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      score INTEGER NOT NULL,
      grade TEXT NOT NULL,
      factors TEXT,
      recorded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 20: Delivery ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER NOT NULL DEFAULT 0,
      discount INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_lat REAL,
      delivery_lng REAL,
      delivery_notes TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivering', 'completed', 'cancelled')),
      estimated_delivery TEXT,
      actual_delivery TEXT,
      transaction_id TEXT REFERENCES transactions(id),
      cancelled_at TEXT,
      cancel_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES delivery_orders(id),
      status TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 20: Tourist ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS tourist_wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      passport_number TEXT,
      passport_country TEXT,
      nationality TEXT,
      entry_date TEXT,
      departure_date TEXT,
      original_currency TEXT DEFAULT 'USD',
      exchange_rate REAL,
      total_exchanged INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      remaining_balance INTEGER DEFAULT 0,
      refundable_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'departed', 'refunded', 'expired')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tourist_exchanges (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES tourist_wallets(id),
      foreign_amount REAL NOT NULL,
      foreign_currency TEXT NOT NULL,
      local_amount INTEGER NOT NULL,
      exchange_rate REAL NOT NULL,
      fee_amount INTEGER DEFAULT 0,
      transaction_id TEXT REFERENCES transactions(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_refund_requests (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES tourist_wallets(id),
      amount INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL,
      refund_method TEXT CHECK (refund_method IN ('cash', 'card', 'bank_transfer')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
      processed_at TEXT,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 21: Donations ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS donation_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      organization TEXT NOT NULL,
      organization_id TEXT,
      target_amount INTEGER NOT NULL,
      raised_amount INTEGER DEFAULT 0,
      donor_count INTEGER DEFAULT 0,
      image_url TEXT,
      category TEXT CHECK (category IN ('disaster', 'education', 'health', 'environment', 'poverty', 'animal', 'culture', 'other')),
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
      blockchain_address TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES donation_campaigns(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      anonymous INTEGER DEFAULT 0,
      display_name TEXT,
      message TEXT,
      transaction_id TEXT REFERENCES transactions(id),
      blockchain_hash TEXT,
      receipt_number TEXT,
      tax_deductible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 21: Traceability ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS traced_products (
      id TEXT PRIMARY KEY,
      product_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      origin TEXT,
      manufacturer TEXT,
      manufacture_date TEXT,
      expiry_date TEXT,
      merchant_id TEXT REFERENCES merchants(id),
      batch_number TEXT,
      certifications TEXT,
      blockchain_hash TEXT,
      qr_code_url TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'recalled', 'expired')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trace_points (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES traced_products(id),
      sequence INTEGER NOT NULL,
      location TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      action TEXT NOT NULL CHECK (action IN ('produced', 'processed', 'packaged', 'shipped', 'received', 'stored', 'sold')),
      actor TEXT NOT NULL,
      actor_type TEXT CHECK (actor_type IN ('manufacturer', 'processor', 'distributor', 'retailer', 'consumer')),
      timestamp TEXT DEFAULT (datetime('now')),
      temperature REAL,
      humidity REAL,
      details TEXT,
      blockchain_hash TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 22: Tokens & Blockchain ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS programmable_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      token_type TEXT NOT NULL CHECK (token_type IN ('bcoin', 'welfare', 'youth', 'senior', 'culture', 'education')),
      description TEXT,
      total_supply INTEGER DEFAULT 0,
      circulating_supply INTEGER DEFAULT 0,
      max_supply INTEGER,
      decimals INTEGER DEFAULT 0,
      restrictions TEXT,
      expiry_days INTEGER,
      usage_categories TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deprecated')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS token_issuances (
      id TEXT PRIMARY KEY,
      token_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      purpose TEXT,
      issuer_id TEXT NOT NULL REFERENCES users(id),
      recipient_type TEXT NOT NULL CHECK (recipient_type IN ('circulation', 'welfare_program', 'merchant_settlement')),
      recipient_id TEXT,
      blockchain_hash TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS token_burns (
      id TEXT PRIMARY KEY,
      token_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      burner_id TEXT NOT NULL REFERENCES users(id),
      blockchain_hash TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blockchain_blocks (
      id TEXT PRIMARY KEY,
      block_number INTEGER UNIQUE NOT NULL,
      block_hash TEXT UNIQUE NOT NULL,
      parent_hash TEXT,
      timestamp TEXT NOT NULL,
      transactions_count INTEGER DEFAULT 0,
      gas_used INTEGER DEFAULT 0,
      gas_limit INTEGER DEFAULT 0,
      miner TEXT,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blockchain_transactions (
      id TEXT PRIMARY KEY,
      tx_hash TEXT UNIQUE NOT NULL,
      block_number INTEGER,
      from_address TEXT NOT NULL,
      to_address TEXT,
      value TEXT DEFAULT '0',
      gas INTEGER DEFAULT 0,
      gas_price TEXT DEFAULT '0',
      input_data TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      tx_type TEXT CHECK (tx_type IN ('audit_anchor', 'token_transfer', 'contract_call')),
      timestamp TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_anchors (
      id TEXT PRIMARY KEY,
      batch_id TEXT UNIQUE NOT NULL,
      merkle_root TEXT NOT NULL,
      tx_hash TEXT,
      block_number INTEGER,
      audit_count INTEGER NOT NULL DEFAULT 0,
      start_timestamp TEXT NOT NULL,
      end_timestamp TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'anchored', 'verified', 'failed')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 23: DID/VC ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_dids (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      did TEXT UNIQUE NOT NULL,
      did_document TEXT,
      public_key TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS verifiable_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      credential_type TEXT NOT NULL,
      issuer TEXT NOT NULL,
      subject_did TEXT NOT NULL,
      claims TEXT NOT NULL,
      proof TEXT,
      issuance_date TEXT NOT NULL,
      expiration_date TEXT,
      status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'revoked')),
      blockchain_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS credential_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      credential_type TEXT NOT NULL,
      required_claims TEXT NOT NULL,
      supporting_documents TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
      reviewer_id TEXT REFERENCES users(id),
      reviewed_at TEXT,
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 24: Notifications ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('payment', 'settlement', 'system', 'promo', 'security', 'welfare')),
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      data TEXT,
      read INTEGER DEFAULT 0,
      read_at TEXT,
      action_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      push_enabled INTEGER DEFAULT 1,
      email_enabled INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 0,
      payment_notifications INTEGER DEFAULT 1,
      settlement_notifications INTEGER DEFAULT 1,
      system_notifications INTEGER DEFAULT 1,
      promo_notifications INTEGER DEFAULT 1,
      security_notifications INTEGER DEFAULT 1,
      welfare_notifications INTEGER DEFAULT 1,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
      token TEXT UNIQUE NOT NULL,
      device_name TEXT,
      last_used_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ==================== Sprint 25: Security ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
      user_id TEXT REFERENCES users(id),
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at TEXT,
      resolved_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_blocks (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      reason TEXT NOT NULL,
      blocked_by TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT NOT NULL,
      rate_limit INTEGER DEFAULT 1000,
      last_used_at TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Two-Factor Authentication table
  db.exec(`
    CREATE TABLE IF NOT EXISTS two_factor_auth (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      secret TEXT NOT NULL,
      backup_codes TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      events TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Webhook deliveries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id),
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      status_code INTEGER,
      success INTEGER DEFAULT 0,
      error TEXT,
      duration INTEGER,
      attempt INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add two_factor_enabled column to users if not exists
  try {
    db.exec(`ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
    CREATE INDEX IF NOT EXISTS idx_merchants_user ON merchants(user_id);
    CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON voucher_usage(voucher_id);
    CREATE INDEX IF NOT EXISTS idx_voucher_usage_user ON voucher_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlements(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
    CREATE INDEX IF NOT EXISTS idx_welfare_programs_type ON welfare_programs(type);
    CREATE INDEX IF NOT EXISTS idx_welfare_beneficiaries_program ON welfare_beneficiaries(program_id);
    CREATE INDEX IF NOT EXISTS idx_welfare_beneficiaries_user ON welfare_beneficiaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_fds_alerts_status ON fds_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_fds_alerts_severity ON fds_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_aml_cases_status ON aml_cases(status);
    CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user ON loyalty_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_carbon_accounts_user ON carbon_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_orders_user ON delivery_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_orders_merchant ON delivery_orders(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
    CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
    CREATE INDEX IF NOT EXISTS idx_traced_products_code ON traced_products(product_code);
    CREATE INDEX IF NOT EXISTS idx_trace_points_product ON trace_points(product_id);
    CREATE INDEX IF NOT EXISTS idx_token_issuances_type ON token_issuances(token_type);
    CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_number ON blockchain_blocks(block_number);
    CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(tx_hash);
    CREATE INDEX IF NOT EXISTS idx_audit_anchors_batch ON audit_anchors(batch_id);
    CREATE INDEX IF NOT EXISTS idx_user_dids_user ON user_dids(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifiable_credentials_user ON verifiable_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_credential_requests_user ON credential_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
    CREATE INDEX IF NOT EXISTS idx_ip_blocks_ip ON ip_blocks(ip_address);
    CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
    CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user ON two_factor_auth(user_id);
    CREATE INDEX IF NOT EXISTS idx_webhooks_merchant ON webhooks(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
  `);
}

function seedInitialData(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (userCount.count === 0) {
    console.log('Seeding initial data...');

    // Create demo admin user
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, user_type, kyc_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin-001', 'admin@localpay.kr', adminPasswordHash, 'System Admin', 'admin', 1);

    // Create demo consumer
    const consumerPasswordHash = bcrypt.hashSync('user123', 10);
    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, name, user_type, kyc_verified, level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('consumer-001', 'user@localpay.kr', '010-1234-5678', consumerPasswordHash, 'Demo User', 'consumer', 1, 'Gold');

    // Create wallet for consumer
    db.prepare(`
      INSERT INTO wallets (id, user_id, balance)
      VALUES (?, ?, ?)
    `).run('wallet-001', 'consumer-001', 125000);

    // Create demo merchant user
    const merchantPasswordHash = bcrypt.hashSync('merchant123', 10);
    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, name, user_type, kyc_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('merchant-user-001', 'merchant@localpay.kr', '010-9876-5432', merchantPasswordHash, 'Merchant Owner', 'merchant', 1);

    // Create merchant
    db.prepare(`
      INSERT INTO merchants (id, user_id, store_name, business_number, category, address, phone, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('merchant-001', 'merchant-user-001', 'Demo Coffee Shop', '123-45-67890', 'cafe', 'Busan, South Korea', '051-123-4567', 1);

    // Create demo voucher
    db.prepare(`
      INSERT INTO vouchers (id, name, code, amount, type, usage_limit, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('voucher-001', 'Welcome Bonus', 'WELCOME2024', 10000, 'welcome', 1000, '2024-01-01', '2025-12-31');

    console.log('Initial data seeded successfully');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

export default { getDb, initDatabase, closeDatabase };
