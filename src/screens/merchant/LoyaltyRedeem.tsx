import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Badge } from '../../components/common';
import { sharedLoyaltyService, PointTransaction } from '../../services/sharedLoyalty';

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
      setSuccess('Customer QR code scanned successfully');
      setTimeout(() => setSuccess(''), 3000);
    }, 1500);
  };

  const handleRedeem = async () => {
    setError('');
    setSuccess('');

    if (!customerId) {
      setError('Please enter customer ID or scan QR code');
      return;
    }

    if (!pointsToRedeem || parseInt(pointsToRedeem) <= 0) {
      setError('Please enter valid points to redeem');
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
        setSuccess(`Successfully redeemed ${pointsToRedeem} points (${result.krwValue} KRW)`);
        setCustomerId('');
        setPointsToRedeem('');
        setRedemptionAmount('');

        // Add to recent redemptions
        setRecentRedemptions(prev => [result.transaction!, ...prev.slice(0, 9)]);

        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.error || 'Redemption failed');
      }
    } catch (err) {
      setError('An error occurred during redemption');
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
    <div className="flex flex-col min-h-screen pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
          >
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Loyalty Point Redemption</h1>
            <p className="text-xs text-text-secondary">Redeem customer loyalty points</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-6">
        {/* QR Scanner Section */}
        <Card className="mb-6" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Customer QR Code</h3>
              <p className="text-xs text-text-secondary">Scan customer's loyalty QR code</p>
            </div>
            <span className="material-symbols-outlined text-[#13ec5b] text-3xl">
              qr_code_scanner
            </span>
          </div>

          <div className="relative mb-4">
            {scannerActive ? (
              <div className="aspect-square w-full bg-surface-highlight rounded-xl flex items-center justify-center border-2 border-[#13ec5b] animate-pulse">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[#13ec5b] text-6xl mb-2 animate-spin">
                    qr_code_scanner
                  </span>
                  <p className="text-sm text-white font-medium">Scanning QR Code...</p>
                </div>
              </div>
            ) : (
              <div className="aspect-square w-full bg-surface-highlight rounded-xl flex items-center justify-center border-2 border-dashed border-surface">
                <div className="text-center">
                  <span className="material-symbols-outlined text-text-muted text-6xl mb-2">
                    qr_code_2
                  </span>
                  <p className="text-xs text-text-secondary">Tap to scan customer QR code</p>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={handleScanQR}
            disabled={scannerActive}
            className="bg-[#13ec5b] hover:bg-[#0fd350]"
          >
            <span className="material-symbols-outlined text-[20px]">
              qr_code_scanner
            </span>
            {scannerActive ? 'Scanning...' : 'Scan QR Code'}
          </Button>
        </Card>

        {/* Redemption Form */}
        <Card className="mb-6" padding="lg">
          <h3 className="text-sm font-bold text-white mb-4">Redemption Details</h3>

          <div className="space-y-4">
            <Input
              label="Customer ID"
              placeholder="Enter customer ID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              icon="person"
            />

            <Input
              label="Points to Redeem"
              type="number"
              placeholder="Enter points"
              value={pointsToRedeem}
              onChange={(e) => handlePointsChange(e.target.value)}
              icon="stars"
            />

            <Input
              label="Redemption Amount (KRW)"
              type="number"
              placeholder="Amount in KRW"
              value={redemptionAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              icon="payments"
            />

            {/* Conversion Rate Display */}
            <div className="bg-surface-highlight rounded-xl p-4 border border-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#13ec5b] text-[20px]">
                    swap_horiz
                  </span>
                  <span className="text-sm text-white font-medium">Conversion Rate</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#13ec5b]">
                    {CONVERSION_RATE} points = {CONVERSION_RATE} KRW
                  </p>
                  <p className="text-xs text-text-secondary">1 point = 1 KRW</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-[20px]">
                    error
                  </span>
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/30 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#13ec5b] text-[20px]">
                    check_circle
                  </span>
                  <p className="text-sm text-[#13ec5b]">{success}</p>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleRedeem}
              loading={loading}
              className="bg-[#13ec5b] hover:bg-[#0fd350] mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                redeem
              </span>
              Redeem Points
            </Button>
          </div>
        </Card>

        {/* Recent Redemptions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Recent Redemptions</h3>
            <Badge variant="default" size="sm">
              {recentRedemptions.length}
            </Badge>
          </div>

          {recentRedemptions.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-text-muted text-5xl mb-3">
                  receipt_long
                </span>
                <p className="text-sm text-text-secondary">No redemptions yet</p>
                <p className="text-xs text-text-muted mt-1">
                  Recent redemptions will appear here
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRedemptions.map((redemption) => (
                <Card key={redemption.id} variant="transaction" padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-[#13ec5b]/10 border border-[#13ec5b]/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#13ec5b] text-[20px]">
                          redeem
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {redemption.merchantName || 'Point Redemption'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDateTime(redemption.timestamp)}
                        </p>
                        {redemption.description && (
                          <p className="text-xs text-text-muted mt-1">
                            {redemption.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-bold text-red-500">
                        {redemption.points} pts
                      </p>
                      <Badge variant="success" size="sm" className="mt-1">
                        Redeemed
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyRedeem;
