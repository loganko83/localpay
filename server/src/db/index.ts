/**
 * Database initialization and connection
 * Using better-sqlite3 for SQLite database
 */

import Database from 'better-sqlite3';
import path from 'path';

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

  // Coupons table
  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      merchant_id TEXT REFERENCES merchants(id),
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
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
  `);
}

function seedInitialData(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (userCount.count === 0) {
    console.log('Seeding initial data...');

    // Create demo admin user
    const bcrypt = require('bcryptjs');
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
