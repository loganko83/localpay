/**
 * Jest Test Setup
 */

import path from 'path';

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'data/test-localpay.db');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// Clean up test database before each test suite
beforeAll(async () => {
  const fs = await import('fs');

  // Remove old test database if exists
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch {
      // Ignore if file is busy
    }
  }

  // Ensure data directory exists
  const dataDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
});

// Cleanup after all tests
afterAll(async () => {
  const fs = await import('fs');
  // Wait a bit for db handles to close
  await new Promise(resolve => setTimeout(resolve, 100));
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch {
      // Ignore cleanup errors
    }
  }
});

// Global test utilities
export const testUtils = {
  /**
   * Generate test user data
   */
  generateTestUser(overrides = {}) {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User',
      userType: 'consumer',
      ...overrides,
    };
  },

  /**
   * Generate test merchant data
   */
  generateTestMerchant(overrides = {}) {
    return {
      storeName: 'Test Store',
      businessNumber: `123-45-${Date.now().toString().slice(-5)}`,
      category: 'restaurant',
      address: 'Test Address',
      ...overrides,
    };
  },
};

export default testUtils;
