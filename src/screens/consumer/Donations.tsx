import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationPlatformService, DonationCampaign, RegisteredCharity, CharityCategory } from '../../services/donationPlatform';

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

const categoryOptions: { value: CharityCategory | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'All', icon: 'apps' },
  { value: 'WELFARE', label: 'Children', icon: 'child_care' },
  { value: 'MEDICAL', label: 'Elderly', icon: 'elderly' },
  { value: 'ENVIRONMENT', label: 'Environment', icon: 'eco' },
  { value: 'DISASTER', label: 'Disaster', icon: 'crisis_alert' },
  { value: 'EDUCATION', label: 'Education', icon: 'school' },
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
      name: 'Hope Foundation',
      registrationNumber: 'CHR-2024-001',
      category: 'WELFARE',
      donationType: 'DESIGNATED',
      description: 'Supporting underprivileged children with education and meals',
      website: 'https://hopefoundation.kr',
    });

    const charity2 = donationPlatformService.registerCharity({
      name: 'Green Earth Alliance',
      registrationNumber: 'CHR-2024-002',
      category: 'ENVIRONMENT',
      donationType: 'DESIGNATED',
      description: 'Environmental protection and reforestation projects',
      website: 'https://greenearth.kr',
    });

    const charity3 = donationPlatformService.registerCharity({
      name: 'Medical Aid Korea',
      registrationNumber: 'CHR-2024-003',
      category: 'MEDICAL',
      donationType: 'DESIGNATED',
      description: 'Providing medical care to elderly in rural areas',
      website: 'https://medicalaid.kr',
    });

    const charity4 = donationPlatformService.registerCharity({
      name: 'Disaster Relief Team',
      registrationNumber: 'CHR-2024-004',
      category: 'DISASTER',
      donationType: 'STATUTORY',
      description: 'Emergency response and disaster recovery support',
      website: 'https://disasterrelief.kr',
    });

    const campaign1 = donationPlatformService.createCampaign({
      charityId: charity1.id,
      title: 'Warm Meals for 1000 Children',
      description: 'Provide nutritious meals to children in need during winter',
      targetAmount: 10000000,
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 2500000, description: '250 children fed for a month' },
        { amount: 5000000, description: '500 children fed for a month' },
        { amount: 7500000, description: '750 children fed for a month' },
      ],
    });

    const campaign2 = donationPlatformService.createCampaign({
      charityId: charity2.id,
      title: 'Plant 10,000 Trees in Jeonju',
      description: 'Urban reforestation project to combat climate change',
      targetAmount: 5000000,
      endDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 1250000, description: '2,500 trees planted' },
        { amount: 2500000, description: '5,000 trees planted' },
      ],
    });

    const campaign3 = donationPlatformService.createCampaign({
      charityId: charity3.id,
      title: 'Mobile Clinic for Rural Seniors',
      description: 'Bring medical care to elderly in remote villages',
      targetAmount: 8000000,
      endDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 2000000, description: 'Medical equipment purchased' },
        { amount: 4000000, description: 'First 3 months operational' },
      ],
    });

    const campaign4 = donationPlatformService.createCampaign({
      charityId: charity4.id,
      title: 'Emergency Flood Relief Fund',
      description: 'Help families affected by recent floods rebuild their homes',
      targetAmount: 15000000,
      endDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
      milestones: [
        { amount: 5000000, description: 'Immediate aid to 100 families' },
        { amount: 10000000, description: 'Temporary housing for 50 families' },
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
        alert(`Donation of ${formatAmount(donationAmount)}P successful! Thank you for your generosity.`);
      }
    } catch (error) {
      console.error('Donation failed:', error);
      alert('Donation failed. Please try again.');
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
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>Donations</h1>
            <p className="text-xs" style={{ color: theme.textSecondary }}>Make a difference today</p>
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
          <h2 className="text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Your Impact</h2>
          <p className="text-2xl font-bold" style={{ color: theme.text }}>
            {formatAmount(donorHistory.totalDonated)} <span className="text-base">P</span>
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Total donated</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: 'restaurant', value: impact.mealsProvided, label: 'Meals Provided' },
            { icon: 'eco', value: impact.treesPlanted, label: 'Trees Planted' },
            { icon: 'volunteer_activism', value: impact.campaignsSupported, label: 'Campaigns' },
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
        <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Featured Campaigns</h2>
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
                      {daysLeft} days left
                    </span>
                  </div>
                  <h3 className="text-base font-bold mb-2 line-clamp-2" style={{ color: theme.text }}>{campaign.title}</h3>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: theme.textSecondary }}>{charity?.name}</p>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: theme.textSecondary }}>Progress</span>
                      <span className="font-medium" style={{ color: theme.text }}>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                      <div
                        className="h-full rounded-full"
                        style={{ background: theme.accent, width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: theme.textMuted }}>
                      <span>{formatAmount(campaign.raisedAmount)}P</span>
                      <span>of {formatAmount(campaign.targetAmount)}P</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDonateClick(campaign)}
                    className="w-full h-10 rounded-xl font-bold text-sm"
                    style={{ background: theme.accent, color: '#fff' }}
                  >
                    Donate Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold mb-3" style={{ color: theme.text }}>Categories</h2>
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
        <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Active Campaigns</h2>
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
                        {daysLeft}d
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: theme.cardHover }}>
                        <div className="h-full rounded-full" style={{ background: theme.accent, width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium" style={{ color: theme.text }}>{progress}% funded</span>
                        <span style={{ color: theme.textMuted }}>{formatAmount(campaign.targetAmount)}P goal</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDonateClick(campaign)}
                      className="w-full h-9 rounded-xl font-bold text-sm"
                      style={{ background: theme.cardHover, color: theme.accent, border: `1px solid ${theme.accent}30` }}
                    >
                      Donate
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
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>My Donations</h2>
            <button
              onClick={() => navigate('/consumer/donation-history')}
              className="text-sm font-medium"
              style={{ color: theme.accent }}
            >
              View All
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
                        {campaign?.title || charity?.name || 'General Donation'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{formatDate(donation.timestamp)}</p>
                        {donation.taxReceiptId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                            <span className="material-symbols-outlined text-[10px]">verified</span>
                            Receipt
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: theme.accent }}>
                        {formatAmount(donation.amount)}P
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px]" style={{ color: theme.accent }}>verified</span>
                        <p className="text-[10px]" style={{ color: theme.textMuted }}>Blockchain</p>
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
              <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>100% Transparency</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>All donations tracked on blockchain</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { icon: 'pie_chart', label: 'Program Expenses', value: '85%' },
              { icon: 'business_center', label: 'Admin Expenses', value: '10%' },
              { icon: 'campaign', label: 'Fundraising', value: '5%' },
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
              <span>All transactions are permanently recorded and publicly verifiable on the blockchain</span>
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
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Make a Donation</h3>
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
                    {formatAmount(selectedCampaign.raisedAmount)}P raised of {formatAmount(selectedCampaign.targetAmount)}P goal
                  </p>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block" style={{ color: theme.text }}>Select Amount</label>
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
                      {formatAmount(amount)}P
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="w-full h-12 px-4 pr-8 rounded-xl focus:outline-none"
                    style={{ background: theme.cardHover, border: `1px solid ${theme.border}`, color: theme.text }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textSecondary }}>P</span>
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: theme.cardHover }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>Anonymous Donation</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>Hide your name from public donor list</p>
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
                  <span className="text-sm" style={{ color: theme.textSecondary }}>Payment from LocalPay Wallet</span>
                </div>
                <p className="text-lg font-bold" style={{ color: theme.text }}>
                  {formatAmount(donationAmount)} <span className="text-sm">P</span>
                </p>
              </div>

              {/* Tax Deduction Info */}
              <div className="p-3 rounded-xl" style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accent }}>savings</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>Tax Deduction Available</p>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>
                      This donation is eligible for tax deduction. Receipt will be generated automatically.
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
                    Confirm Donation
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
