import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Badge } from '../../components/common';
import { sharedLoyaltyService, PointTransaction } from '../../services/sharedLoyalty';

import { theme } from '../../styles/theme';

const LoyaltyRedeem: React.FC = () => {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentRedemptions, setRecentRedemptions] = useState<PointTransaction[]>([]);
  const [scannerActive, setScannerActive] = useState(false);

  const CONVERSION_RATE = 10; // 10 points = 10 KRW
  const MERCHANT_ID = 'merchant-jeonju-42';

  useEffect(() => {
    loadRecentRedemptions();
  }, []);

  const loadRecentRedemptions = () => {
    // In production, this would fetch from API
    // For now, we'll simulate with empty array
    setRecentRedemptions([]);
  };

  const handlePointsChange = (value: string) => {
    setPointsToRedeem(value);
    const points = parseInt(value) || 0;
    const krw = points * (CONVERSION_RATE / 10);
    setRedemptionAmount(krw.toString());
  };

  const handleAmountChange = (value: string) => {
    setRedemptionAmount(value);
    const krw = parseInt(value) || 0;
    const points = Math.floor(krw / (CONVERSION_RATE / 10));
    setPointsToRedeem(points.toString());
  };

  const handleScanQR = () => {
    setScannerActive(true);
    // Simulate QR scan
    setTimeout(() => {
      setCustomerId('user-demo-001');
      setScannerActive(false);
      setSuccess('고객 QR 코드 스캔 완료');
      setTimeout(() => setSuccess(''), 3000);
    }, 1500);
  };

  const handleRedeem = async () => {
    setError('');
    setSuccess('');

    if (!customerId) {
      setError('고객 ID를 입력하거나 QR 코드를 스캔해주세요');
      return;
    }

    if (!pointsToRedeem || parseInt(pointsToRedeem) <= 0) {
      setError('유효한 교환 포인트를 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const result = await sharedLoyaltyService.redeemPoints({
        userId: customerId,
        merchantId: MERCHANT_ID,
        pointsToRedeem: parseInt(pointsToRedeem),
      });

      if (result.success && result.transaction) {
        setSuccess(`${pointsToRedeem} 포인트 교환 완료 (${result.krwValue} 원)`);
        setCustomerId('');
        setPointsToRedeem('');
        setRedemptionAmount('');

        // Add to recent redemptions
        setRecentRedemptions(prev => [result.transaction!, ...prev.slice(0, 9)]);

        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.error || '교환에 실패했습니다');
      }
    } catch (err) {
      setError('교환 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '1rem', backgroundColor: theme.bg }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: `${theme.bg}cc`, backdropFilter: 'blur(12px)', padding: '1rem', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.5rem',
              marginLeft: '-0.5rem',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.card}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ color: theme.text }}>arrow_back</span>
          </button>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.text }}>포인트 교환</h1>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>고객 로열티 포인트 교환</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 1rem', paddingTop: '1.5rem' }}>
        {/* QR Scanner Section */}
        <div style={{ backgroundColor: theme.card, borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.25rem' }}>고객 QR 코드</h3>
              <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>고객의 로열티 QR 코드 스캔</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.875rem' }}>
              qr_code_scanner
            </span>
          </div>

          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            {scannerActive ? (
              <div style={{
                aspectRatio: '1',
                width: '100%',
                backgroundColor: theme.bg,
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${theme.accent}`,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{
                    color: theme.accent,
                    fontSize: '3.75rem',
                    marginBottom: '0.5rem',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite'
                  }}>
                    qr_code_scanner
                  </span>
                  <p style={{ fontSize: '0.875rem', color: theme.text, fontWeight: '500' }}>QR 코드 스캔 중...</p>
                </div>
              </div>
            ) : (
              <div style={{
                aspectRatio: '1',
                width: '100%',
                backgroundColor: theme.bg,
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px dashed ${theme.border}`
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{
                    color: theme.textMuted,
                    fontSize: '3.75rem',
                    marginBottom: '0.5rem',
                    display: 'inline-block'
                  }}>
                    qr_code_2
                  </span>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>터치하여 고객 QR 코드 스캔</p>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={handleScanQR}
            disabled={scannerActive}
            style={{ backgroundColor: theme.accent, borderColor: theme.accent }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
              qr_code_scanner
            </span>
            {scannerActive ? '스캔 중...' : 'QR 코드 스캔'}
          </Button>
        </div>

        {/* Redemption Form */}
        <div style={{ backgroundColor: theme.card, borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', border: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '1rem' }}>교환 상세</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="고객 ID"
              placeholder="고객 ID 입력"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              icon="person"
            />

            <Input
              label="교환할 포인트"
              type="number"
              placeholder="포인트 입력"
              value={pointsToRedeem}
              onChange={(e) => handlePointsChange(e.target.value)}
              icon="stars"
            />

            <Input
              label="교환 금액 (원)"
              type="number"
              placeholder="금액 (원)"
              value={redemptionAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              icon="payments"
            />

            {/* Conversion Rate Display */}
            <div style={{ backgroundColor: theme.bg, borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.25rem' }}>
                    swap_horiz
                  </span>
                  <span style={{ fontSize: '0.875rem', color: theme.text, fontWeight: '500' }}>전환율</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.accent }}>
                    {CONVERSION_RATE} 포인트 = {CONVERSION_RATE} 원
                  </p>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>1 포인트 = 1 원</p>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '1.25rem' }}>
                    error
                  </span>
                  <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}40`, borderRadius: '0.75rem', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.25rem' }}>
                    check_circle
                  </span>
                  <p style={{ fontSize: '0.875rem', color: theme.accent }}>{success}</p>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleRedeem}
              loading={loading}
              style={{ backgroundColor: theme.accent, borderColor: theme.accent, marginTop: '0.5rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                redeem
              </span>
              포인트 교환
            </Button>
          </div>
        </div>

        {/* Recent Redemptions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>최근 교환 내역</h3>
            <Badge variant="default" size="sm">
              {recentRedemptions.length}
            </Badge>
          </div>

          {recentRedemptions.length === 0 ? (
            <div style={{ backgroundColor: theme.card, borderRadius: '1rem', padding: '1.5rem', border: `1px solid ${theme.border}` }}>
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <span className="material-symbols-outlined" style={{ color: theme.textMuted, fontSize: '3rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                  receipt_long
                </span>
                <p style={{ fontSize: '0.875rem', color: theme.textSecondary }}>아직 교환 내역이 없습니다</p>
                <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.25rem' }}>
                  최근 교환 내역이 여기에 표시됩니다
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentRedemptions.map((redemption) => (
                <div key={redemption.id} style={{ backgroundColor: theme.card, borderRadius: '1rem', padding: '1rem', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                      <div style={{
                        height: '2.5rem',
                        width: '2.5rem',
                        borderRadius: '9999px',
                        backgroundColor: theme.accentSoft,
                        border: `1px solid ${theme.accent}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '1.25rem' }}>
                          redeem
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {redemption.merchantName || '포인트 교환'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                          {formatDateTime(redemption.timestamp)}
                        </p>
                        {redemption.description && (
                          <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.25rem' }}>
                            {redemption.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '0.75rem', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {redemption.points} pts
                      </p>
                      <Badge variant="success" size="sm" className="mt-1">
                        교환됨
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyRedeem;
