-- Migration: Add audit fields to key tables
-- Version: 1
-- Created: 2026-01-01

-- UP
-- Add updated_at trigger function equivalent for SQLite
-- Note: SQLite doesn't have stored procedures, so we use triggers

-- Add updated_at column to users if not exists
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at on users
CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Add updated_at column to wallets if not exists
ALTER TABLE wallets ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for wallets
CREATE TRIGGER IF NOT EXISTS wallets_updated_at
AFTER UPDATE ON wallets
FOR EACH ROW
BEGIN
  UPDATE wallets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- DOWN
-- Remove triggers and columns
DROP TRIGGER IF EXISTS users_updated_at;
DROP TRIGGER IF EXISTS wallets_updated_at;

-- Note: SQLite doesn't support DROP COLUMN in older versions
-- For full rollback, would need to recreate tables without the column
