import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationPlatformService, DonationCampaign, RegisteredCharity, CharityCategory } from '../../services/donationPlatform';

import { theme } from '../../styles/theme';

const categoryOptions: { value: CharityCategory | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: '전체', icon: 'apps' },
  { value: 'WELFARE', label: '아동', icon: 'child_care' },
  { value: 'MEDICAL', label: '어르신', icon: 'elderly' },
  { value: 'ENVIRONMENT', label: '환경', icon: 'eco' },
  { value: 'DISASTER', label: '재난구호', icon: 'crisis_alert' },
  { value: 'EDUCATION', label: '교육', icon: 'school' },
];

const presetAmounts = [5000, 10000, 30000, 50000, 100000];

const Donations: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<CharityCategory | 'ALL'>('ALL');
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<DonationCampaign[]>([]);
  const [charities, setCharities] = useState<Map<string, RegisteredCharity>>(new Map());

  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [donorHistory, setDonorHistory] = useState<{
    donations: any[];
    totalDonated: number;
    receipts: any[];
    annualSummary: Record<number, number>;
  }>({
    donations: [],
    totalDonated: 0,
    receipts: [],
    annualSummary: {},
  });

  const mockDonorId = 'DONOR-CONSUMER-001';

  useEffect(() => {
    initializeDonationData();
    loadDonorHistory();
  }, []);

  const initializeDonationData = () => {
    const charity1 = donationPlatformService.registerCharity({
      name: '희망재단',
      registrationNumber: 'CHR-2024-001',
      category: 'WELFARE',
      donationType: 'DESIGNATED',
      description: '소외 계층 아동에게 교육과 급식을 지원합니다',
      website: 'https://hopefoundation.kr',
    });

    const charity2 = donationPlatformService.registerCharity({
      name: '푸른지구연합',
      registrationNumber: 'CHR-2024-002',
      category: 'ENVIRONMENT',
      donationType: 'DESIGNATED',
      description: '환경 보호 및 숲 복원 프로젝트',
      website: 'https://greenearth.kr',
    });

    const charity3 = donationPlatformService.registerCharity({
      name: '의료봉사단',
      registrationNumber: 'CHR-2024-003',
      category: 'MEDICAL',
      donationType: 'DESIGNATED',
      description: '농촌 지역 어르신들에게 의료 서비스를 제공합니다',
      website: 'https://medicalaid.kr',
    });

    const charity4 = donationPlatformService.registerCharity({
      name: '재난구호팀',
      registrationNumber: 'CHR-2024-004',
      category: 'DISASTER',
      donationType: 'STATUTORY',
      description: '긴급 구호 및 재난 복구 지원',
      website: 'https://disasterrelief.kr',
    });

    const campaign1 = donationPlatformService.createCampaign({
      charityId: charity1.id,
      title: '1000명의 아이들에게 따뜻한 밥상을',
      description: '겨울철 소외 계층 아이들에게 영양가 있는 급식을 제공합니다',
      targetAmount: 10000000,
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 2500000, description: '250명의 아이들에게 한 달 급식' },
        { amount: 5000000, description: '500명의 아이들에게 한 달 급식' },
        { amount: 7500000, description: '750명의 아이들에게 한 달 급식' },
      ],
    });

    const campaign2 = donationPlatformService.createCampaign({
      charityId: charity2.id,
      title: '전주에 10,000그루 나무 심기',
      description: '기후변화 대응을 위한 도시 숲 조성 프로젝트',
      targetAmount: 5000000,
      endDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 1250000, description: '2,500그루 식수 완료' },
        { amount: 2500000, description: '5,000그루 식수 완료' },
      ],
    });

    const campaign3 = donationPlatformService.createCampaign({
      charityId: charity3.id,
      title: '농촌 어르신을 위한 이동진료소',
      description: '오지 마을 어르신들에게 의료 서비스를 제공합니다',
      targetAmount: 8000000,
      endDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 2000000, description: '의료 장비 구입' },
        { amount: 4000000, description: '3개월간 운영' },
      ],
    });

    const campaign4 = donationPlatformService.createCampaign({
      charityId: charity4.id,
      title: '수해 피해 긴급 구호 기금',
      description: '최근 홍수로 피해를 입은 가정의 주택 재건을 돕습니다',
      targetAmount: 15000000,
      endDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 5000000, description: '100가구 긴급 지원' },
        { amount: 10000000, description: '50가구 임시 주거 제공' },
      ],
    });

    if (campaign1) campaign1.raisedAmount = 6500000;
    if (campaign2) campaign2.raisedAmount = 3200000;
    if (campaign3) campaign3.raisedAmount = 4800000;
    if (campaign4) campaign4.raisedAmount = 12000000;

    const allCampaigns = donationPlatformService.getActiveCampaigns();
    setCampaigns(allCampaigns);
    setFeaturedCampaigns(allCampaigns.slice(0, 3));

    const charityMap = new Map<string, RegisteredCharity>();
    [charity1, charity2, charity3, charity4].forEach(c => charityMap.set(c.id, c));
    setCharities(charityMap);
  };

  const loadDonorHistory = () => {
    const history = donationPlatformService.getDonorHistory(mockDonorId);
    setDonorHistory(history);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (endDate: number) => {
    const diff = endDate - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getProgressPercentage = (raised: number, target: number) => {
    return Math.min(100, Math.round((raised / target) * 100));
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedCategory === 'ALL') return true;
    const charity = charities.get(campaign.charityId);
    return charity?.category === selectedCategory;
  });

  const handleDonateClick = (campaign: DonationCampaign) => {
    setSelectedCampaign(campaign);
    setDonationAmount(10000);
    setCustomAmount('');
    setIsAnonymous(false);
    setIsDonationModalOpen(true);
  };

  const handleConfirmDonation = async () => {
    if (!selectedCampaign) return;

    setIsProcessing(true);

    try {
      const result = await donationPlatformService.makeDonation({
        donorId: mockDonorId,
        donorType: 'INDIVIDUAL',
        donorName: 'Consumer User',
        charityId: selectedCampaign.charityId,
        campaignId: selectedCampaign.id,
        amount: donationAmount,
        isAnonymous: isAnonymous,
        message: '',
      });

      if (result) {
        const allCampaigns = donationPlatformService.getActiveCampaigns();
        setCampaigns(allCampaigns);
        setFeaturedCampaigns(allCampaigns.slice(0, 3));

        loadDonorHistory();

        setIsDonationModalOpen(false);
        alert(`${formatAmount(donationAmount)}원 기부가 완료되었습니다! 감사합니다.`);
      }
    } catch (error) {
      console.error('Donation failed:', error);
      alert('기부 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(numValue) && numValue > 0) {
      setDonationAmount(numValue);
    }
  };

  const getTotalImpact = () => {
    const mealsProvided = Math.floor(donorHistory.totalDonated / 3000);
    const treesPlanted = Math.floor(donorHistory.totalDonated / 500);
    const campaignsSupported = new Set(donorHistory.donations.map((d: any) => d.campaignId)).size;

    return {
      mealsProvided,
      treesPlanted,
      campaignsSupported,
    };
  };

  const impact = getTotalImpact();

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
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>기부</h1>
            <p className="text-xs" style={{ color: theme.textSecondary }}>오늘 변화를 만드세요</p>
          </div>
        </div>
        <button
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: theme.cardHover }}
          onClick={() => navigate('/consumer/donation-history')}
        >
          <span className="material-symbols-outlined" style={{ color: theme.accent }}>favorite</span>
        </button>
      </header>

      {/* Impact Summary */}
      <div className="px-5 py-6" style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)` }}>
        <div className="mb-4">
          <h2 className="text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>나의 기부 영향력</h2>
          <p className="text-2xl font-bold" style={{ color: theme.text }}>
            {formatAmount(donorHistory.totalDonated)} <span className="text-base">원</span>
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>총 기부금액</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: 'restaurant', value: impact.mealsProvided, label: '제공된 급식' },
            { icon: 'eco', value: impact.treesPlanted, label: '심은 나무' },
            { icon: 'volunteer_activism', value: impact.campaignsSupported, label: '참여 캠페인' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl p-3 text-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <span className="material-symbols-outlined text-[28px]" style={{ color: theme.accent }}>{item.icon}</span>
              <p className="text-lg font-bold" style={{ color: theme.text }}>{item.value}</p>
              <p className="text-[10px]" style={{ color: theme.textSecondary }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Campaigns Carousel */}
      <div className="px-5 py-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>주목 캠페인</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
          {featuredCampaigns.map((campaign) => {
            const charity = charities.get(campaign.charityId);
            const progress = getProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
            const daysLeft = getDaysRemaining(campaign.endDate);

            return (
              <div
                key={campaign.id}
                className="min-w-[280px] rounded-2xl overflow-hidden"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div
                  className="h-40 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, rgba(255,71,87,0.05))` }}
                >
                  <span className="material-symbols-outlined text-[64px]" style={{ color: theme.accent }}>favorite</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: theme.accentSoft, color: theme.accent }}>
                      {charity?.category}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#eab30820', color: '#eab308' }}>
                      {daysLeft}일 남음
                    </span>
                  </div>
                  <h3 className="text-base font-bold mb-2 line-clamp-2" style={{ color: theme.text }}>{campaign.title}</h3>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: theme.textSecondary }}>{charity?.name}</p>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: theme.textSecondary }}>진행률</span>
                      <span className="font-medium" style={{ color: theme.text }}>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                      <div
                        className="h-full rounded-full"
                        style={{ background: theme.accent, width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: theme.textMuted }}>
                      <span>{formatAmount(campaign.raisedAmount)}원</span>
                      <span>목표 {formatAmount(campaign.targetAmount)}원</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDonateClick(campaign)}
                    className="w-full h-10 rounded-xl font-bold text-sm"
                    style={{ background: theme.accent, color: '#fff' }}
                  >
                    지금 기부하기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold mb-3" style={{ color: theme.text }}>카테고리</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categoryOptions.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap"
              style={{
                background: selectedCategory === category.value ? theme.accent : theme.card,
                color: selectedCategory === category.value ? '#fff' : theme.textSecondary,
                border: selectedCategory === category.value ? 'none' : `1px solid ${theme.border}`,
              }}
            >
              <span className="material-symbols-outlined text-[18px]">{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Campaigns Grid */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>진행 중인 캠페인</h2>
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const charity = charities.get(campaign.charityId);
            const progress = getProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
            const daysLeft = getDaysRemaining(campaign.endDate);

            return (
              <div
                key={campaign.id}
                className="rounded-2xl p-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex gap-4">
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, rgba(255,71,87,0.05))` }}
                  >
                    <span className="material-symbols-outlined text-[32px]" style={{ color: theme.accent }}>
                      {charity?.category === 'WELFARE' ? 'child_care' :
                        charity?.category === 'ENVIRONMENT' ? 'eco' :
                          charity?.category === 'MEDICAL' ? 'medical_services' :
                            charity?.category === 'DISASTER' ? 'crisis_alert' :
                              'volunteer_activism'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold line-clamp-1" style={{ color: theme.text }}>{campaign.title}</h3>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{charity?.name}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#eab30820', color: '#eab308' }}>
                        {daysLeft}일
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: theme.cardHover }}>
                        <div className="h-full rounded-full" style={{ background: theme.accent, width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium" style={{ color: theme.text }}>{progress}% 달성</span>
                        <span style={{ color: theme.textMuted }}>목표 {formatAmount(campaign.targetAmount)}원</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDonateClick(campaign)}
                      className="w-full h-9 rounded-xl font-bold text-sm"
                      style={{ background: theme.cardHover, color: theme.accent, border: `1px solid ${theme.accent}30` }}
                    >
                      기부하기
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Donations History */}
      {donorHistory.donations.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>나의 기부 내역</h2>
            <button
              onClick={() => navigate('/consumer/donation-history')}
              className="text-sm font-medium"
              style={{ color: theme.accent }}
            >
              전체 보기
            </button>
          </div>

          <div className="space-y-3">
            {donorHistory.donations.slice(0, 5).map((donation: any) => {
              const campaign = campaigns.find(c => c.id === donation.campaignId);
              const charity = charities.get(donation.charityId);

              return (
                <div
                  key={donation.id}
                  className="rounded-xl p-4"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: theme.accentSoft }}
                    >
                      <span className="material-symbols-outlined" style={{ color: theme.accent }}>favorite</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold line-clamp-1" style={{ color: theme.text }}>
                        {campaign?.title || charity?.name || '일반 기부'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{formatDate(donation.timestamp)}</p>
                        {donation.taxReceiptId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                            <span className="material-symbols-outlined text-[10px]">verified</span>
                            영수증
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: theme.accent }}>
                        {formatAmount(donation.amount)}원
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px]" style={{ color: theme.accent }}>verified</span>
                        <p className="text-[10px]" style={{ color: theme.textMuted }}>블록체인</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Impact Transparency Section */}
      <div className="px-5 mb-6">
        <div
          className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${theme.card}, ${theme.cardHover})`, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-[24px]" style={{ color: theme.accent }}>verified</span>
            </div>
            <div>
              <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>100% 투명성</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>모든 기부금은 블록체인에 기록됩니다</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { icon: 'pie_chart', label: '사업비', value: '85%' },
              { icon: 'business_center', label: '운영비', value: '10%' },
              { icon: 'campaign', label: '모금비', value: '5%' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accent }}>{item.icon}</span>
                  <span className="text-sm" style={{ color: theme.textSecondary }}>{item.label}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: theme.text }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>모든 거래는 블록체인에 영구적으로 기록되어 누구나 검증할 수 있습니다</span>
            </div>
          </div>
        </div>
      </div>

      {/* Donation Flow Modal */}
      {isDonationModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsDonationModalOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: theme.card }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>기부하기</h3>
              <button onClick={() => setIsDonationModalOpen(false)}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Campaign Info */}
              <div>
                <h3 className="text-base font-bold mb-2" style={{ color: theme.text }}>{selectedCampaign.title}</h3>
                <p className="text-sm" style={{ color: theme.textSecondary }}>{charities.get(selectedCampaign.charityId)?.name}</p>
                <div className="mt-3">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                    <div
                      className="h-full"
                      style={{ background: theme.accent, width: `${getProgressPercentage(selectedCampaign.raisedAmount, selectedCampaign.targetAmount)}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                    {formatAmount(selectedCampaign.raisedAmount)}원 모금 / 목표 {formatAmount(selectedCampaign.targetAmount)}원
                  </p>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block" style={{ color: theme.text }}>금액 선택</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className="py-3 px-4 rounded-xl text-sm font-medium"
                      style={{
                        background: donationAmount === amount && !customAmount ? theme.accent : theme.cardHover,
                        color: donationAmount === amount && !customAmount ? '#fff' : theme.textSecondary,
                        border: donationAmount === amount && !customAmount ? 'none' : `1px solid ${theme.border}`,
                      }}
                    >
                      {formatAmount(amount)}원
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="직접 입력"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="w-full h-12 px-4 pr-8 rounded-xl focus:outline-none"
                    style={{ background: theme.cardHover, border: `1px solid ${theme.border}`, color: theme.text }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textSecondary }}>원</span>
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: theme.cardHover }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>익명 기부</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>공개 기부자 목록에서 이름 숨기기</p>
                </div>
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className="relative w-10 h-6 rounded-full transition-colors"
                  style={{ background: isAnonymous ? theme.accent : theme.card }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: isAnonymous ? '18px' : '2px' }}
                  />
                </button>
              </div>

              {/* Payment Info */}
              <div className="p-4 rounded-xl" style={{ background: theme.cardHover }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accent }}>account_balance_wallet</span>
                  <span className="text-sm" style={{ color: theme.textSecondary }}>LocalPay 지갑에서 결제</span>
                </div>
                <p className="text-lg font-bold" style={{ color: theme.text }}>
                  {formatAmount(donationAmount)} <span className="text-sm">원</span>
                </p>
              </div>

              {/* Tax Deduction Info */}
              <div className="p-3 rounded-xl" style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accent }}>savings</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>세액공제 가능</p>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>
                      이 기부금은 세액공제 대상입니다. 영수증이 자동으로 발급됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmDonation}
                disabled={isProcessing}
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: theme.accent, color: '#fff' }}
              >
                {isProcessing ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined">favorite</span>
                    기부 확인
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;
