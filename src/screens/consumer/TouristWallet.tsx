import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  touristWalletService,
  type TouristWallet as TouristWalletType,
  type ExchangeRate,
  type SupportedCurrency,
  type ChargeRecord,
} from '../../services/touristWallet';
import {
  taxRefundService,
  type TaxRefundRecord,
  type EligibilityResult,
} from '../../services/taxRefund';

import { theme } from '../../styles/theme';

const TouristWallet: React.FC = () => {
  const navigate = useNavigate();

  // Mock visitor ID (in production, from auth context)
  const visitorId = 'visitor-demo-001';

  // State
  const [wallet, setWallet] = useState<TouristWalletType | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState<SupportedCurrency>('USD');
  const [loading, setLoading] = useState(true);

  // Exchange form state
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('USD');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangePreview, setExchangePreview] = useState<any>(null);

  // Tax refund state
  const [refundEligibility, setRefundEligibility] = useState<EligibilityResult | null>(null);
  const [refundHistory, setRefundHistory] = useState<TaxRefundRecord[]>([]);
  const [refundSummary, setRefundSummary] = useState<any>(null);

  // Modal state
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [, setShowExchangeModal] = useState(false);
  const [showTaxRefundModal, setShowTaxRefundModal] = useState(false);
  const [showVisitorInfoModal, setShowVisitorInfoModal] = useState(false);

  // Currencies
  const currencies: SupportedCurrency[] = ['USD', 'JPY', 'CNY', 'EUR', 'KRW'];

  // Initialize wallet and load data
  useEffect(() => {
    loadWalletData();
  }, []);

  // Update exchange preview when amount changes
  useEffect(() => {
    if (exchangeAmount && parseFloat(exchangeAmount) > 0) {
      calculateExchangePreview();
    } else {
      setExchangePreview(null);
    }
  }, [exchangeAmount, fromCurrency]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      let walletData = touristWalletService.getWallet(visitorId);
      if (!walletData) {
        walletData = await touristWalletService.createWallet({
          visitorId,
          passportCountry: 'USA',
          passportNumber: 'P123456789',
          entryDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
          plannedDepartureDate: Date.now() + 25 * 24 * 60 * 60 * 1000,
        });
      }
      setWallet(walletData);

      const rates = await touristWalletService.getExchangeRates();
      setExchangeRates(rates);

      const eligibility = await taxRefundService.checkEligibility(visitorId);
      setRefundEligibility(eligibility);

      const history = taxRefundService.getRefundHistory(visitorId);
      setRefundHistory(history);

      const summary = taxRefundService.getRefundSummary(visitorId);
      setRefundSummary(summary);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExchangePreview = async () => {
    const amount = parseFloat(exchangeAmount);
    if (isNaN(amount) || amount <= 0) return;

    const preview = await touristWalletService.calculateChargePreview({
      sourceCurrency: fromCurrency,
      sourceAmount: amount,
      method: 'CARD',
    });
    setExchangePreview(preview);
  };

  const handleExchange = async () => {
    const amount = parseFloat(exchangeAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = await touristWalletService.chargeFromCurrency({
      visitorId,
      sourceCurrency: fromCurrency,
      sourceAmount: amount,
      method: 'CARD',
    });

    if (result) {
      setExchangeAmount('');
      setShowExchangeModal(false);
      loadWalletData();
    }
  };

  const formatAmount = (amount: number, currency: SupportedCurrency = 'KRW') => {
    if (currency === 'KRW') {
      return new Intl.NumberFormat('ko-KR').format(Math.floor(amount));
    } else if (currency === 'JPY') {
      return new Intl.NumberFormat('ja-JP').format(Math.floor(amount));
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };

  const getCurrencySymbol = (currency: SupportedCurrency) => {
    const symbols: Record<SupportedCurrency, string> = {
      USD: '$',
      JPY: '¥',
      CNY: '¥',
      EUR: '€',
      KRW: '₩',
    };
    return symbols[currency];
  };

  const getExchangeRate = (currency: SupportedCurrency): number => {
    const rate = exchangeRates.find(r => r.currency === currency);
    return rate?.baseRate || 0;
  };

  const convertToDisplayCurrency = (krwAmount: number, targetCurrency: SupportedCurrency): number => {
    if (targetCurrency === 'KRW') return krwAmount;
    const rate = getExchangeRate(targetCurrency);
    return rate > 0 ? krwAmount / rate : 0;
  };

  const getRefundStatusColor = (status: string): string => {
    switch (status) {
      case 'ISSUED':
      case 'USED':
        return '#22c55e';
      case 'APPROVED':
        return '#3b82f6';
      case 'PENDING':
        return '#eab308';
      default:
        return theme.textMuted;
    }
  };

  const getRefundStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PENDING: '대기 중',
      APPROVED: '승인됨',
      ISSUED: '발급됨',
      USED: '사용됨',
      EXPIRED: '만료됨',
      REJECTED: '거절됨',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: theme.bg }}>
        <span className="material-symbols-outlined animate-spin text-4xl" style={{ color: theme.accent }}>
          progress_activity
        </span>
        <p className="mt-4" style={{ color: theme.textSecondary }}>지갑 로딩 중...</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6" style={{ background: theme.bg }}>
        <span className="material-symbols-outlined text-6xl mb-4" style={{ color: theme.textSecondary }}>
          account_balance_wallet
        </span>
        <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>지갑을 찾을 수 없습니다</h2>
        <p className="text-center mb-6" style={{ color: theme.textSecondary }}>
          관광객 지갑을 만들려면 여권을 인증해주세요.
        </p>
        <button
          onClick={() => navigate('/consumer')}
          className="px-6 py-3 rounded-xl font-bold"
          style={{ background: theme.accent, color: '#fff' }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const totalBalanceInPrimaryCurrency = convertToDisplayCurrency(wallet.balanceKRW, primaryCurrency);

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>관광객 지갑</h1>
        <button onClick={() => setShowVisitorInfoModal(true)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.textSecondary }}>info</span>
        </button>
      </header>

      {/* Multi-Currency Balance Header */}
      <div className="px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm" style={{ color: theme.textSecondary }}>총 잔액</p>
          <button
            onClick={() => setShowCurrencySelector(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
            style={{ background: theme.cardHover }}
          >
            <span className="text-xs font-medium" style={{ color: theme.text }}>{primaryCurrency}</span>
            <span className="material-symbols-outlined text-xs" style={{ color: theme.textSecondary }}>
              expand_more
            </span>
          </button>
        </div>
        <h1 className="text-4xl font-bold mb-1" style={{ color: theme.text }}>
          {getCurrencySymbol(primaryCurrency)}{formatAmount(totalBalanceInPrimaryCurrency, primaryCurrency)}
        </h1>
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          ₩{formatAmount(wallet.balanceKRW, 'KRW')} KRW
        </p>
      </div>

      {/* Exchange Rate Indicator */}
      <div className="px-5 mb-6">
        <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textSecondary }}>
              환율
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#3b82f620', color: '#3b82f6' }}>
              실시간
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {exchangeRates.filter(r => r.currency !== 'KRW').slice(0, 4).map((rate) => (
              <div key={rate.currency} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: theme.textSecondary }}>
                  1 {rate.currency}
                </span>
                <span className="text-xs font-bold" style={{ color: theme.text }}>
                  ₩{formatAmount(rate.baseRate, 'KRW')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Exchange Section */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>빠른 환전</h3>
        <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: theme.textSecondary }}>
                환전할 통화
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as SupportedCurrency)}
                className="w-full h-12 rounded-xl px-4 focus:outline-none"
                style={{ background: theme.cardHover, border: `1px solid ${theme.border}`, color: theme.text }}
              >
                {currencies.filter(c => c !== 'KRW').map((curr) => (
                  <option key={curr} value={curr}>
                    {curr} - {getCurrencySymbol(curr)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: theme.textSecondary }}>
                금액
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px]" style={{ color: theme.textMuted }}>
                  payments
                </span>
                <input
                  type="number"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 rounded-xl pl-12 pr-4 focus:outline-none"
                  style={{ background: theme.cardHover, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
            </div>

            {exchangePreview && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: theme.cardHover }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: theme.textSecondary }}>환율</span>
                  <span className="font-medium" style={{ color: theme.text }}>
                    ₩{formatAmount(exchangePreview.exchangeRate, 'KRW')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: theme.textSecondary }}>수수료</span>
                  <span className="font-medium" style={{ color: theme.text }}>
                    ₩{formatAmount(exchangePreview.fee, 'KRW')}
                  </span>
                </div>
                <div className="pt-2 flex justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>받으실 금액</span>
                  <span className="text-sm font-bold" style={{ color: theme.accent }}>
                    ₩{formatAmount(exchangePreview.netKRW, 'KRW')}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleExchange}
              disabled={!exchangePreview || parseFloat(exchangeAmount) <= 0}
              className="w-full h-12 rounded-xl font-bold disabled:opacity-50"
              style={{ background: theme.accent, color: '#fff' }}
            >
              지금 환전
            </button>
          </div>
        </div>
      </div>

      {/* Tax Refund Status */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>세금 환급</h3>
          <button
            onClick={() => setShowTaxRefundModal(true)}
            className="text-xs font-medium"
            style={{ color: theme.accent }}
          >
            상세
          </button>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, rgba(255,71,87,0.05))`, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: theme.accent }}>local_atm</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>환급 가능 금액</span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: refundEligibility?.eligible ? '#22c55e20' : '#eab30820',
                color: refundEligibility?.eligible ? '#22c55e' : '#eab308',
              }}
            >
              {refundEligibility?.eligible ? '환급 가능' : '환급 불가'}
            </span>
          </div>

          {refundSummary && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>총 환급액</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>
                  ₩{formatAmount(refundSummary.totalRefunded, 'KRW')}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>남은 한도</p>
                <p className="text-lg font-bold" style={{ color: theme.accent }}>
                  ₩{formatAmount(refundSummary.remainingQuota, 'KRW')}
                </p>
              </div>
            </div>
          )}

          {refundEligibility && !refundEligibility.eligible && (
            <p className="text-xs mt-3" style={{ color: '#eab308' }}>
              {refundEligibility.reason}
            </p>
          )}
        </div>
      </div>

      {/* Refund History */}
      {refundHistory.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>환급 내역</h3>
          <div className="space-y-3">
            {refundHistory.slice(0, 3).map((refund) => (
              <div
                key={refund.id}
                className="rounded-xl p-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: theme.accentSoft }}
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>receipt</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: theme.text }}>
                        {refund.purchase.merchantName}
                      </p>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        {new Date(refund.purchase.purchaseDate).toLocaleDateString('en-US')}
                      </p>
                      <span
                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                        style={{ background: `${getRefundStatusColor(refund.status)}20`, color: getRefundStatusColor(refund.status) }}
                      >
                        {getRefundStatusLabel(refund.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold" style={{ color: theme.accent }}>
                      +₩{formatAmount(refund.refundAmount, 'KRW')}
                    </p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>
                      구매: ₩{formatAmount(refund.purchase.purchaseAmount, 'KRW')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchange History */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>환전 내역</h3>
        {wallet.chargeHistory.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: theme.textSecondary }}>
              currency_exchange
            </span>
            <p className="text-sm" style={{ color: theme.textSecondary }}>아직 환전 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallet.chargeHistory.slice(-5).reverse().map((charge: ChargeRecord) => (
              <div
                key={charge.id}
                className="rounded-xl p-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ background: theme.cardHover }}
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ color: theme.text }}>swap_horiz</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: theme.text }}>
                        {charge.sourceCurrency} → KRW
                      </p>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        {new Date(charge.timestamp).toLocaleDateString('en-US')}
                      </p>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        환율: ₩{formatAmount(charge.exchangeRate, 'KRW')} · 수수료: ₩{formatAmount(charge.fee, 'KRW')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>
                      {getCurrencySymbol(charge.sourceCurrency as SupportedCurrency)}{formatAmount(charge.sourceAmount, charge.sourceCurrency as SupportedCurrency)}
                    </p>
                    <p className="text-sm font-bold" style={{ color: theme.accent }}>
                      +₩{formatAmount(charge.resultKRW, 'KRW')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Currency Selector Modal */}
      {showCurrencySelector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCurrencySelector(false)} />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6"
            style={{ background: theme.card }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>표시 통화 선택</h3>
              <button onClick={() => setShowCurrencySelector(false)}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>
            <div className="space-y-2">
              {currencies.map((currency) => (
                <button
                  key={currency}
                  onClick={() => {
                    setPrimaryCurrency(currency);
                    setShowCurrencySelector(false);
                  }}
                  className="w-full p-4 rounded-xl flex items-center justify-between"
                  style={{
                    background: primaryCurrency === currency ? theme.accentSoft : theme.cardHover,
                    border: primaryCurrency === currency ? `2px solid ${theme.accent}` : `2px solid transparent`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ background: primaryCurrency === currency ? theme.accentSoft : theme.card }}
                    >
                      <span className="text-lg font-bold" style={{ color: theme.text }}>
                        {getCurrencySymbol(currency)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{currency}</p>
                      {currency !== 'KRW' && (
                        <p className="text-xs" style={{ color: theme.textSecondary }}>
                          1 {currency} = ₩{formatAmount(getExchangeRate(currency), 'KRW')}
                        </p>
                      )}
                    </div>
                  </div>
                  {primaryCurrency === currency && (
                    <span className="material-symbols-outlined" style={{ color: theme.accent }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tax Refund Details Modal */}
      {showTaxRefundModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTaxRefundModal(false)} />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: theme.card }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>세금 환급 상세</h3>
              <button onClick={() => setShowTaxRefundModal(false)}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                <h4 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                  환급 자격 상태
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>상태</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: refundEligibility?.eligible ? '#22c55e20' : '#eab30820',
                        color: refundEligibility?.eligible ? '#22c55e' : '#eab308',
                      }}
                    >
                      {refundEligibility?.eligible ? '환급 가능' : '환급 불가'}
                    </span>
                  </div>
                  {refundEligibility?.daysUntilDeparture !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>출국까지 남은 일수</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>
                        {refundEligibility.daysUntilDeparture}일
                      </span>
                    </div>
                  )}
                  {refundEligibility?.remainingQuota !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>남은 한도</span>
                      <span className="text-sm font-bold" style={{ color: theme.accent }}>
                        ₩{formatAmount(refundEligibility.remainingQuota, 'KRW')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {refundSummary && (
                <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                  <h4 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                    요약
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>총 구매액</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>
                        ₩{formatAmount(refundSummary.totalPurchases, 'KRW')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>총 환급액</span>
                      <span className="text-sm font-bold" style={{ color: theme.accent }}>
                        ₩{formatAmount(refundSummary.totalRefunded, 'KRW')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>대기 중인 환급</span>
                      <span className="text-sm font-bold" style={{ color: '#eab308' }}>
                        ₩{formatAmount(refundSummary.pendingRefunds, 'KRW')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>환급 건수</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>
                        {refundSummary.refundCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!refundEligibility?.eligible && refundEligibility?.reason && (
                <div className="rounded-xl p-4" style={{ background: '#eab30815', border: '1px solid #eab30830' }}>
                  <p className="text-sm" style={{ color: '#eab308' }}>{refundEligibility.reason}</p>
                </div>
              )}

              <button
                onClick={() => setShowTaxRefundModal(false)}
                className="w-full h-12 rounded-xl font-bold"
                style={{ background: theme.accent, color: '#fff' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Info Modal */}
      {showVisitorInfoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowVisitorInfoModal(false)} />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: theme.card }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>방문자 정보</h3>
              <button onClick={() => setShowVisitorInfoModal(false)}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                <h4 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                  여권 정보
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>국가</span>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      {wallet.passportCountry}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>여권 번호</span>
                    <span className="text-sm font-mono" style={{ color: theme.text }}>
                      {wallet.passportNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                <h4 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                  방문 일정
                </h4>
                <div className="space-y-2">
                  {wallet.entryDate && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>입국일</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>
                        {new Date(wallet.entryDate).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {wallet.plannedDepartureDate && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>출국 예정일</span>
                      <span className="text-sm font-bold" style={{ color: theme.text }}>
                        {new Date(wallet.plannedDepartureDate).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {wallet.entryDate && (
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: theme.textSecondary }}>한국 체류일</span>
                      <span className="text-sm font-bold" style={{ color: theme.accent }}>
                        {Math.floor((Date.now() - wallet.entryDate) / (24 * 60 * 60 * 1000))}일
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                <h4 className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                  지갑 통계
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>총 충전액</span>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      ₩{formatAmount(wallet.totalChargedKRW, 'KRW')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>총 사용액</span>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      ₩{formatAmount(wallet.totalSpentKRW, 'KRW')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>생성일</span>
                    <span className="text-sm" style={{ color: theme.text }}>
                      {new Date(wallet.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowVisitorInfoModal(false)}
                className="w-full h-12 rounded-xl font-bold"
                style={{ background: theme.accent, color: '#fff' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TouristWallet;
