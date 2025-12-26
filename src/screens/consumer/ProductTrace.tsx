import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productTraceabilityService, ProductHistoryView } from '../../services/productTraceability';
import { getDemoProductId } from '../../services/demoData';

// Unified Dark Theme
const theme = {
  bg: '#111111',
  card: '#1a1a1a',
  cardHover: '#222222',
  border: '#2a2a2a',
  accent: '#ff4757',
  accentSoft: 'rgba(255,71,87,0.15)',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
};

interface ScannedProduct {
  id: string;
  name: string;
  scannedAt: string;
  image?: string;
}

const ProductTrace: React.FC = () => {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductHistoryView | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [recentScans, setRecentScans] = useState<ScannedProduct[]>([]);
  const [scanning, setScanning] = useState(false);

  const handleScanProduct = () => {
    setShowScanner(true);
    setScanning(true);

    setTimeout(() => {
      const demoProductId = getDemoProductId();
      if (!demoProductId) {
        console.warn('No demo product available');
        setShowScanner(false);
        setScanning(false);
        return;
      }

      const mockQRData = `LOCALPAY:PRD:${demoProductId}`;
      const productHistory = productTraceabilityService.scanProductQR(mockQRData);

      if (productHistory) {
        setSelectedProduct(productHistory);
        setShowScanner(false);
        setScanning(false);

        const newScan: ScannedProduct = {
          id: productHistory.productId,
          name: productHistory.productName,
          scannedAt: new Date().toISOString(),
        };
        setRecentScans(prev => [newScan, ...prev.slice(0, 4)]);
      }
    }, 2000);
  };

  const handleRescan = (productId: string) => {
    const productHistory = productTraceabilityService.getProductHistory(productId);
    if (productHistory) {
      setSelectedProduct(productHistory);
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
  };

  const getFreshnessColor = (days: number): string => {
    if (days <= 3) return theme.accent;
    if (days <= 7) return '#eab308';
    return '#ef4444';
  };

  const getFreshnessGauge = (days: number): number => {
    const maxDays = 14;
    const percentage = Math.max(0, ((maxDays - days) / maxDays) * 100);
    return percentage;
  };

  const getEventIcon = (eventName: string): string => {
    if (eventName.includes('Harvest') || eventName.includes('Produced')) return 'agriculture';
    if (eventName.includes('Process') || eventName.includes('Package')) return 'inventory_2';
    if (eventName.includes('Storage')) return 'ac_unit';
    if (eventName.includes('Transit')) return 'local_shipping';
    if (eventName.includes('Inspect')) return 'fact_check';
    if (eventName.includes('Distribution') || eventName.includes('Wholesale')) return 'warehouse';
    if (eventName.includes('Store') || eventName.includes('Retail')) return 'storefront';
    if (eventName.includes('Purchase')) return 'shopping_cart';
    return 'check_circle';
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: theme.cardHover }}
          >
            <span className="material-symbols-outlined" style={{ color: theme.text }}>arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>Product Traceability</h1>
            <p className="text-xs" style={{ color: theme.textSecondary }}>Farm-to-Table Tracking</p>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
          <span className="material-symbols-outlined" style={{ color: theme.accent }}>verified</span>
        </div>
      </header>

      {/* QR Scanner Section */}
      {!selectedProduct && (
        <div className="px-5 pt-6">
          <div className="rounded-2xl p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-center">
              <div className="h-24 w-24 mx-auto mb-4 rounded-3xl flex items-center justify-center" style={{ background: theme.accentSoft }}>
                <span className="material-symbols-outlined text-5xl" style={{ color: theme.accent }}>qr_code_scanner</span>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: theme.text }}>Scan Product QR Code</h2>
              <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>
                Trace the complete journey from farm to your table
              </p>
              <button
                onClick={handleScanProduct}
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                style={{ background: theme.accent, color: '#fff' }}
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Scan Product
              </button>
            </div>
          </div>

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Recent Scans</h3>
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => handleRescan(scan.id)}
                    className="w-full rounded-xl p-4 text-left"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: theme.accentSoft }}>
                          <span className="material-symbols-outlined" style={{ color: theme.accent }}>inventory_2</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: theme.text }}>{scan.name}</p>
                          <p className="text-xs" style={{ color: theme.textSecondary }}>
                            {new Date(scan.scannedAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>chevron_right</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Detail View */}
      {selectedProduct && (
        <div className="px-5 pt-6 space-y-4">
          {/* Back Button */}
          <button
            onClick={handleClose}
            className="flex items-center gap-2 text-sm font-medium mb-2"
            style={{ color: theme.accent }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Scanner
          </button>

          {/* Product Header */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: theme.cardHover }}>
                <span className="material-symbols-outlined text-4xl" style={{ color: theme.accent }}>nutrition</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>{selectedProduct.productName}</h2>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: theme.textSecondary }}>location_on</span>
                  <span className="text-sm" style={{ color: theme.textSecondary }}>{selectedProduct.producer.region}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.certifications.map((cert, idx) => (
                    <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                      {cert}
                    </span>
                  ))}
                  {selectedProduct.blockchainVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                      <span className="material-symbols-outlined text-[10px]">verified</span>
                      Blockchain
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Producer Profile Card */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Producer Information</h3>
              <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>verified_user</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: theme.accentSoft }}>
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>agriculture</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: theme.text }}>{selectedProduct.producer.name}</p>
                <div className="flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>
                  <span className="material-symbols-outlined text-[14px]">map</span>
                  {selectedProduct.producer.region}
                </div>
              </div>
              <button className="text-sm font-medium" style={{ color: theme.accent }}>
                View Profile
              </button>
            </div>
          </div>

          {/* Freshness Indicator */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Freshness Status</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>Fresh</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Days from Harvest</p>
                  <p className="text-2xl font-bold" style={{ color: getFreshnessColor(selectedProduct.daysFromHarvest) }}>
                    {selectedProduct.daysFromHarvest} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Harvest Date</p>
                  <p className="text-sm font-bold" style={{ color: theme.text }}>{selectedProduct.harvestDate}</p>
                </div>
              </div>

              {/* Freshness Gauge */}
              <div>
                <div className="flex justify-between text-xs mb-2" style={{ color: theme.textSecondary }}>
                  <span>Freshness Indicator</span>
                  <span>{Math.round(getFreshnessGauge(selectedProduct.daysFromHarvest))}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      background: `linear-gradient(to right, ${theme.accent}, #eab308)`,
                      width: `${getFreshnessGauge(selectedProduct.daysFromHarvest)}%`
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: theme.textSecondary }}>
                  Best consumed within 14 days of harvest
                </p>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-1" style={{ color: theme.text }}>Quality Score</h3>
                <p className="text-xs" style={{ color: theme.textSecondary }}>Based on tracking data</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
                    <span className="text-2xl font-bold" style={{ color: theme.accent }}>{selectedProduct.qualityScore}</span>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>out of</p>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>100</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supply Chain Timeline */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Supply Chain Journey</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                {selectedProduct.journeySteps.length} steps
              </span>
            </div>

            <div className="space-y-4">
              {selectedProduct.journeySteps.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: idx === 0 ? theme.accentSoft : theme.cardHover }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: idx === 0 ? theme.accent : theme.textSecondary }}
                      >
                        {getEventIcon(step.event)}
                      </span>
                    </div>
                    {idx < selectedProduct.journeySteps.length - 1 && (
                      <div className="w-0.5 h-8 my-1" style={{ background: theme.cardHover }} />
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{step.event}</p>
                      {step.verified && (
                        <span className="material-symbols-outlined text-[16px]" style={{ color: theme.accent }}>verified</span>
                      )}
                    </div>
                    <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>{step.location}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Blockchain Verification</h3>
              {selectedProduct.blockchainVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                  <span className="material-symbols-outlined text-[10px]">check_circle</span>
                  Verified
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: theme.cardHover }}>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f620' }}>
                  <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>link</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Anchored on Xphere</p>
                  <p className="text-xs font-mono truncate" style={{ color: theme.text }}>
                    0x7a8f...4e2b
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerification(true)}
                className="w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                View Full Verification
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              Share
            </button>
            <button
              onClick={handleClose}
              className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: theme.accent, color: '#fff' }}
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
              Scan Another
            </button>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Camera Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: '#0a0a0a' }}>
            <img
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop"
              alt="Camera Feed"
              className="w-full h-full object-cover opacity-40"
            />

            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-3xl relative" style={{ border: `2px solid ${theme.accent}` }}>
                {scanning && (
                  <div
                    className="absolute top-0 left-0 w-full h-1"
                    style={{
                      background: theme.accent,
                      boxShadow: `0 0 20px ${theme.accent}`,
                      animation: 'scan 2s infinite'
                    }}
                  />
                )}

                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-8 h-8 rounded-tl-xl" style={{ borderTop: `4px solid ${theme.accent}`, borderLeft: `4px solid ${theme.accent}` }} />
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-tr-xl" style={{ borderTop: `4px solid ${theme.accent}`, borderRight: `4px solid ${theme.accent}` }} />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-bl-xl" style={{ borderBottom: `4px solid ${theme.accent}`, borderLeft: `4px solid ${theme.accent}` }} />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-br-xl" style={{ borderBottom: `4px solid ${theme.accent}`, borderRight: `4px solid ${theme.accent}` }} />
              </div>
            </div>
          </div>

          {/* Scanner UI */}
          <div className="relative z-10 flex flex-col justify-between h-full pt-10 pb-28 px-6">
            <div className="flex justify-between items-center" style={{ color: theme.text }}>
              <button
                onClick={() => {
                  setShowScanner(false);
                  setScanning(false);
                }}
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-sm font-medium">Scan Product QR</span>
              </div>
              <div className="w-10" />
            </div>

            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Align product QR code within the frame
                </p>
                {scanning && (
                  <div className="flex items-center justify-center gap-2" style={{ color: theme.accent }}>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    <span className="text-sm font-medium">Scanning...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button className="flex flex-col items-center gap-2">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', color: theme.text }}
                  >
                    <span className="material-symbols-outlined">image</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: theme.text }}>Gallery</span>
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes scan {
              0% { top: 0%; opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Verification Modal */}
      {showVerification && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowVerification(false)} />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6"
            style={{ background: theme.card }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Blockchain Verification</h3>
              <button onClick={() => setShowVerification(false)}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#3b82f620' }}>
                  <span className="material-symbols-outlined text-3xl" style={{ color: '#3b82f6' }}>verified</span>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>Verified on Xphere</h3>
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  This product's journey has been permanently recorded on the blockchain
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: theme.cardHover }}>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Transaction Hash</p>
                  <p className="text-xs font-mono break-all" style={{ color: theme.text }}>
                    0x7a8f9c2b4d6e8f1a3c5e7b9d2f4a6c8e0b1d3f5a7c9e2b4d6f8a1c3e5b7d9f4e2b
                  </p>
                </div>

                <div className="p-3 rounded-xl" style={{ background: theme.cardHover }}>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Block Number</p>
                  <p className="text-sm font-bold" style={{ color: theme.text }}>12,345,678</p>
                </div>

                <div className="p-3 rounded-xl" style={{ background: theme.cardHover }}>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Timestamp</p>
                  <p className="text-sm font-bold" style={{ color: theme.text }}>
                    {new Date().toLocaleString('ko-KR')}
                  </p>
                </div>

                <div className="p-3 rounded-xl" style={{ background: theme.cardHover }}>
                  <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>Verification Status</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                      <span className="material-symbols-outlined text-[10px]">check_circle</span>
                      Confirmed
                    </span>
                    <span className="text-xs" style={{ color: theme.textSecondary }}>32 confirmations</span>
                  </div>
                </div>
              </div>

              <button
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                View on Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTrace;
