/**
 * Tourist Wallet Service
 *
 * Foreign visitor wallet with multi-currency support.
 * Based on Busan Pay foreign tourist model.
 *
 * Features:
 * - Multi-currency support (USD, JPY, CNY, EUR)
 * - International card charging
 * - Stablecoin integration hooks
 * - Exchange rate management
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Wallet storage, transactions (in-memory)
 * - [REAL API] Exchange rates from open API (한국수출입은행 or 외환은행)
 * - [INTEGRATION READY] Stablecoin (USDT/USDC) via exchange API
 */

import { auditLogService } from './auditLog';

// Supported currencies
export type SupportedCurrency = 'USD' | 'JPY' | 'CNY' | 'EUR' | 'KRW';

// Stablecoin types
export type StablecoinType = 'USDT' | 'USDC';

// Tourist wallet
interface TouristWallet {
  id: string;
  visitorId: string;
  passportCountry: string;
  passportNumber: string;  // Hashed for privacy
  balanceKRW: number;
  createdAt: number;
  lastActivityAt: number;
  totalChargedKRW: number;
  totalSpentKRW: number;
  chargeHistory: ChargeRecord[];
  isActive: boolean;
  entryDate?: number;      // Korea entry date for tax refund eligibility
  plannedDepartureDate?: number;
}

// Charge record
interface ChargeRecord {
  id: string;
  timestamp: number;
  sourceCurrency: SupportedCurrency | StablecoinType;
  sourceAmount: number;
  exchangeRate: number;
  resultKRW: number;
  fee: number;
  method: 'CARD' | 'CRYPTO' | 'CASH';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

// Exchange rate info
interface ExchangeRate {
  currency: SupportedCurrency;
  buyRate: number;    // Bank buy rate (when tourist sells foreign currency)
  sellRate: number;   // Bank sell rate
  baseRate: number;   // Base/mid rate
  timestamp: number;
  source: string;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const walletStore = new Map<string, TouristWallet>();
const exchangeRateCache = new Map<string, ExchangeRate>();

// ============================================
// [REAL] Korea Eximbank API Configuration
// https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C
// ============================================
const EXCHANGE_API_CONFIG = {
  // Free API from Korea Eximbank (requires registration)
  baseUrl: 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON',
  apiKey: import.meta.env.VITE_EXCHANGE_API_KEY || '', // Get from koreaexim.go.kr
  dataType: 'AP01', // Exchange rate type
};

// ============================================
// [MOCK] Fallback exchange rates
// Used when API is unavailable
// ============================================
const MOCK_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1320.50,
  JPY: 8.85,
  CNY: 182.30,
  EUR: 1435.20,
  KRW: 1,
};

// Stablecoin rates (pegged to USD)
const STABLECOIN_RATES: Record<StablecoinType, number> = {
  USDT: 1.0,  // 1 USDT = 1 USD
  USDC: 1.0,  // 1 USDC = 1 USD
};

// Fee configuration
const FEE_CONFIG = {
  cardChargeRate: 0.015,    // 1.5% for card charges
  cryptoChargeRate: 0.005,  // 0.5% for crypto
  cashChargeRate: 0.02,     // 2% for cash exchange
  minFee: 1000,             // Minimum fee 1,000 KRW
};

// Generate IDs
const generateWalletId = (): string => `TW-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateChargeId = (): string => `CHG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

// Hash passport number
const hashPassport = (passport: string): string => {
  let hash = 0;
  for (let i = 0; i < passport.length; i++) {
    const char = passport.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `PP-${Math.abs(hash).toString(16)}`;
};

class TouristWalletService {
  /**
   * [REAL API] Fetch exchange rates from Korea Eximbank
   * Falls back to mock data if API unavailable
   */
  async fetchExchangeRates(): Promise<Map<string, ExchangeRate>> {
    // Check cache (valid for 1 hour)
    const now = Date.now();
    const cacheValid = Array.from(exchangeRateCache.values())
      .some(rate => now - rate.timestamp < 3600000);

    if (cacheValid && exchangeRateCache.size > 0) {
      return exchangeRateCache;
    }

    // Try real API if key is configured
    if (EXCHANGE_API_CONFIG.apiKey) {
      try {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const url = `${EXCHANGE_API_CONFIG.baseUrl}?authkey=${EXCHANGE_API_CONFIG.apiKey}&searchdate=${today}&data=${EXCHANGE_API_CONFIG.dataType}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          this.parseExchangeRateResponse(data);
          console.log('[TouristWallet] Exchange rates updated from API');
          return exchangeRateCache;
        }
      } catch (error) {
        console.warn('[TouristWallet] API fetch failed, using mock rates:', error);
      }
    }

    // Fallback to mock rates
    this.useMockRates();
    return exchangeRateCache;
  }

  /**
   * Parse API response (Korea Eximbank format)
   */
  private parseExchangeRateResponse(data: Array<{
    cur_unit: string;
    ttb: string;
    tts: string;
    deal_bas_r: string;
  }>): void {
    const currencyMap: Record<string, SupportedCurrency> = {
      'USD': 'USD',
      'JPY(100)': 'JPY',
      'CNH': 'CNY',
      'EUR': 'EUR',
    };

    for (const item of data) {
      const currency = currencyMap[item.cur_unit];
      if (currency) {
        const parseRate = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;
        let baseRate = parseRate(item.deal_bas_r);

        // JPY is quoted per 100 yen
        if (item.cur_unit === 'JPY(100)') {
          baseRate = baseRate / 100;
        }

        exchangeRateCache.set(currency, {
          currency,
          buyRate: parseRate(item.ttb) || baseRate * 0.98,
          sellRate: parseRate(item.tts) || baseRate * 1.02,
          baseRate,
          timestamp: Date.now(),
          source: 'KOREAEXIM_API',
        });
      }
    }
  }

  /**
   * [MOCK] Use fallback rates
   */
  private useMockRates(): void {
    for (const [currency, rate] of Object.entries(MOCK_EXCHANGE_RATES)) {
      exchangeRateCache.set(currency, {
        currency: currency as SupportedCurrency,
        buyRate: rate * 0.98,
        sellRate: rate * 1.02,
        baseRate: rate,
        timestamp: Date.now(),
        source: 'MOCK_FALLBACK',
      });
    }
  }

  /**
   * [MOCK] Create tourist wallet
   * Production: Integrate with identity verification
   */
  async createWallet(params: {
    visitorId: string;
    passportCountry: string;
    passportNumber: string;
    entryDate?: number;
    plannedDepartureDate?: number;
  }): Promise<TouristWallet> {
    const wallet: TouristWallet = {
      id: generateWalletId(),
      visitorId: params.visitorId,
      passportCountry: params.passportCountry,
      passportNumber: hashPassport(params.passportNumber),
      balanceKRW: 0,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      totalChargedKRW: 0,
      totalSpentKRW: 0,
      chargeHistory: [],
      isActive: true,
      entryDate: params.entryDate,
      plannedDepartureDate: params.plannedDepartureDate,
    };

    walletStore.set(params.visitorId, wallet);

    await auditLogService.log({
      action: 'USER_REGISTERED',
      actorId: params.visitorId,
      actorType: 'consumer',
      targetType: 'tourist_wallet',
      targetId: wallet.id,
      metadata: {
        passportCountry: params.passportCountry,
        walletType: 'TOURIST',
      },
    });

    return wallet;
  }

  /**
   * [MOCK + REAL RATES] Charge wallet from foreign currency
   */
  async chargeFromCurrency(params: {
    visitorId: string;
    sourceCurrency: SupportedCurrency;
    sourceAmount: number;
    method: 'CARD' | 'CASH';
  }): Promise<ChargeRecord | null> {
    const wallet = walletStore.get(params.visitorId);
    if (!wallet || !wallet.isActive) return null;

    // Get exchange rate
    await this.fetchExchangeRates();
    const rate = exchangeRateCache.get(params.sourceCurrency);
    if (!rate) return null;

    // Calculate KRW amount (using buy rate - bank buys foreign currency)
    const grossKRW = Math.floor(params.sourceAmount * rate.buyRate);

    // Calculate fee
    const feeRate = params.method === 'CARD' ? FEE_CONFIG.cardChargeRate : FEE_CONFIG.cashChargeRate;
    const fee = Math.max(Math.floor(grossKRW * feeRate), FEE_CONFIG.minFee);
    const netKRW = grossKRW - fee;

    const charge: ChargeRecord = {
      id: generateChargeId(),
      timestamp: Date.now(),
      sourceCurrency: params.sourceCurrency,
      sourceAmount: params.sourceAmount,
      exchangeRate: rate.buyRate,
      resultKRW: netKRW,
      fee,
      method: params.method,
      status: 'COMPLETED',
    };

    wallet.balanceKRW += netKRW;
    wallet.totalChargedKRW += netKRW;
    wallet.lastActivityAt = Date.now();
    wallet.chargeHistory.push(charge);

    walletStore.set(params.visitorId, wallet);

    await auditLogService.log({
      action: 'TOPUP_COMPLETED',
      actorId: params.visitorId,
      actorType: 'consumer',
      targetType: 'tourist_wallet',
      targetId: wallet.id,
      metadata: {
        sourceCurrency: params.sourceCurrency,
        sourceAmount: params.sourceAmount,
        exchangeRate: rate.buyRate,
        resultKRW: netKRW,
        fee,
        rateSource: rate.source,
      },
    });

    return charge;
  }

  /**
   * [MOCK] Charge from stablecoin (USDT/USDC)
   * Production: Integrate with crypto exchange API
   */
  async chargeFromStablecoin(params: {
    visitorId: string;
    stablecoin: StablecoinType;
    amount: number;
  }): Promise<ChargeRecord | null> {
    const wallet = walletStore.get(params.visitorId);
    if (!wallet || !wallet.isActive) return null;

    // Get USD rate
    await this.fetchExchangeRates();
    const usdRate = exchangeRateCache.get('USD');
    if (!usdRate) return null;

    // Stablecoin to USD (1:1), then to KRW
    const stablecoinToUsd = STABLECOIN_RATES[params.stablecoin];
    const usdAmount = params.amount * stablecoinToUsd;
    const grossKRW = Math.floor(usdAmount * usdRate.buyRate);

    // Lower fee for crypto
    const fee = Math.max(Math.floor(grossKRW * FEE_CONFIG.cryptoChargeRate), FEE_CONFIG.minFee);
    const netKRW = grossKRW - fee;

    const charge: ChargeRecord = {
      id: generateChargeId(),
      timestamp: Date.now(),
      sourceCurrency: params.stablecoin,
      sourceAmount: params.amount,
      exchangeRate: usdRate.buyRate * stablecoinToUsd,
      resultKRW: netKRW,
      fee,
      method: 'CRYPTO',
      status: 'COMPLETED', // In production: would be PENDING until blockchain confirms
    };

    wallet.balanceKRW += netKRW;
    wallet.totalChargedKRW += netKRW;
    wallet.lastActivityAt = Date.now();
    wallet.chargeHistory.push(charge);

    walletStore.set(params.visitorId, wallet);

    return charge;
  }

  /**
   * [MOCK] Process payment (deduct from wallet)
   */
  async processPayment(visitorId: string, amountKRW: number): Promise<boolean> {
    const wallet = walletStore.get(visitorId);
    if (!wallet || !wallet.isActive) return false;
    if (wallet.balanceKRW < amountKRW) return false;

    wallet.balanceKRW -= amountKRW;
    wallet.totalSpentKRW += amountKRW;
    wallet.lastActivityAt = Date.now();

    walletStore.set(visitorId, wallet);
    return true;
  }

  /**
   * Get wallet info
   */
  getWallet(visitorId: string): TouristWallet | null {
    return walletStore.get(visitorId) || null;
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    await this.fetchExchangeRates();
    return Array.from(exchangeRateCache.values());
  }

  /**
   * Calculate preview (before charging)
   */
  async calculateChargePreview(params: {
    sourceCurrency: SupportedCurrency | StablecoinType;
    sourceAmount: number;
    method: 'CARD' | 'CRYPTO' | 'CASH';
  }): Promise<{
    exchangeRate: number;
    grossKRW: number;
    fee: number;
    netKRW: number;
    rateSource: string;
  } | null> {
    await this.fetchExchangeRates();

    let rate: number;
    let rateSource: string;

    if (params.sourceCurrency === 'USDT' || params.sourceCurrency === 'USDC') {
      const usdRate = exchangeRateCache.get('USD');
      if (!usdRate) return null;
      rate = usdRate.buyRate * STABLECOIN_RATES[params.sourceCurrency];
      rateSource = `${usdRate.source} + STABLECOIN_PEG`;
    } else {
      const currencyRate = exchangeRateCache.get(params.sourceCurrency);
      if (!currencyRate) return null;
      rate = currencyRate.buyRate;
      rateSource = currencyRate.source;
    }

    const grossKRW = Math.floor(params.sourceAmount * rate);
    const feeRate = params.method === 'CRYPTO' ? FEE_CONFIG.cryptoChargeRate :
                    params.method === 'CARD' ? FEE_CONFIG.cardChargeRate :
                    FEE_CONFIG.cashChargeRate;
    const fee = Math.max(Math.floor(grossKRW * feeRate), FEE_CONFIG.minFee);
    const netKRW = grossKRW - fee;

    return {
      exchangeRate: rate,
      grossKRW,
      fee,
      netKRW,
      rateSource,
    };
  }

  /**
   * Check tax refund eligibility (stay < 3 months)
   */
  checkTaxRefundEligibility(visitorId: string): {
    eligible: boolean;
    reason?: string;
    daysInKorea?: number;
  } {
    const wallet = walletStore.get(visitorId);
    if (!wallet) {
      return { eligible: false, reason: 'Wallet not found' };
    }

    if (!wallet.entryDate) {
      return { eligible: false, reason: 'Entry date not recorded' };
    }

    const daysInKorea = Math.floor((Date.now() - wallet.entryDate) / (24 * 60 * 60 * 1000));
    const maxDays = 90; // 3 months

    if (daysInKorea > maxDays) {
      return {
        eligible: false,
        reason: `Stay exceeds ${maxDays} days`,
        daysInKorea,
      };
    }

    return { eligible: true, daysInKorea };
  }
}

// Export singleton
export const touristWalletService = new TouristWalletService();

// Export types
export type {
  TouristWallet,
  ChargeRecord,
  ExchangeRate,
};
