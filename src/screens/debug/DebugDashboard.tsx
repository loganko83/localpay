import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '../../components/common';
import {
  programmableMoneyService,
  tokenLifecycleService,
  touristWalletService,
  taxRefundService,
  publicDeliveryService,
  productTraceabilityService,
  sharedLoyaltyService,
  carbonPointsService,
  corporateWelfareService,
  donationPlatformService,
  myDataService,
  merchantCreditService,
  amlComplianceService,
  DEMO_USERS,
} from '../../services';

interface ServiceData {
  name: string;
  phase: string;
  data: unknown;
  count: number;
}

interface ServiceMethod {
  service: string;
  method: string;
  description: string;
  params: { name: string; type: string; default?: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => Promise<unknown> | unknown;
}

const DebugDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'data' | 'modify' | 'test'>('data');
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; data: unknown } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ServiceMethod | null>(null);
  const [methodParams, setMethodParams] = useState<Record<string, string>>({});

  useEffect(() => {
    loadServiceData();
  }, []);

  const loadServiceData = () => {
    setIsLoading(true);

    const data: ServiceData[] = [
      // Phase 6: Programmable Money
      {
        name: 'Programmable Money',
        phase: 'Phase 6',
        data: {
          consumer1Tokens: programmableMoneyService.getUserTokens(DEMO_USERS.consumer1),
          consumer2Tokens: programmableMoneyService.getUserTokens(DEMO_USERS.consumer2),
          consumer3Tokens: programmableMoneyService.getUserTokens(DEMO_USERS.consumer3),
        },
        count: programmableMoneyService.getUserTokens(DEMO_USERS.consumer1).length +
               programmableMoneyService.getUserTokens(DEMO_USERS.consumer2).length +
               programmableMoneyService.getUserTokens(DEMO_USERS.consumer3).length,
      },
      {
        name: 'Token Lifecycle',
        phase: 'Phase 6',
        data: {
          budgetSummary2024: tokenLifecycleService.getBudgetSummary('BUD-2024-LOCAL-001', 2024),
          welfareBudget: tokenLifecycleService.getBudgetSummary('BUD-2024-WELFARE-001', 2024),
        },
        count: 2,
      },

      // Phase 7: Tourism
      {
        name: 'Tourist Wallets',
        phase: 'Phase 7',
        data: {
          tourist1: touristWalletService.getWallet(DEMO_USERS.tourist1),
          tourist2: touristWalletService.getWallet(DEMO_USERS.tourist2),
        },
        count: [DEMO_USERS.tourist1, DEMO_USERS.tourist2]
          .filter(id => touristWalletService.getWallet(id)).length,
      },
      {
        name: 'Tax Refunds',
        phase: 'Phase 7',
        data: {
          tourist1Refunds: taxRefundService.getRefundHistory(DEMO_USERS.tourist1),
          tourist2Refunds: taxRefundService.getRefundHistory(DEMO_USERS.tourist2),
          config: taxRefundService.getConfig(),
        },
        count: taxRefundService.getRefundHistory(DEMO_USERS.tourist1).length +
               taxRefundService.getRefundHistory(DEMO_USERS.tourist2).length,
      },

      // Phase 8: Delivery & Market
      {
        name: 'Public Delivery',
        phase: 'Phase 8',
        data: {
          riderWorkHistory: publicDeliveryService.getRiderWorkHistory(DEMO_USERS.rider1),
          merchantOrders: publicDeliveryService.getMerchantOrders(DEMO_USERS.merchant2),
          feeConfig: publicDeliveryService.getFeeConfig(),
        },
        count: publicDeliveryService.getMerchantOrders(DEMO_USERS.merchant2).length,
      },
      {
        name: 'Product Traceability',
        phase: 'Phase 8',
        data: {
          producerProducts: productTraceabilityService.getProducerProducts(DEMO_USERS.producer1),
          certificationTypes: productTraceabilityService.getCertificationTypes(),
        },
        count: productTraceabilityService.getProducerProducts(DEMO_USERS.producer1).length,
      },
      {
        name: 'Shared Loyalty',
        phase: 'Phase 8',
        data: {
          consumer1Member: sharedLoyaltyService.getMember(DEMO_USERS.consumer1),
          consumer2Member: sharedLoyaltyService.getMember(DEMO_USERS.consumer2),
          allianceStats: sharedLoyaltyService.getAllianceStats(),
        },
        count: sharedLoyaltyService.getAllianceStats().totalMembers,
      },

      // Phase 9: ESG & Carbon
      {
        name: 'Carbon Points',
        phase: 'Phase 9',
        data: {
          consumer1Account: carbonPointsService.getAccount(DEMO_USERS.consumer1),
          consumer2Account: carbonPointsService.getAccount(DEMO_USERS.consumer2),
          consumer3Account: carbonPointsService.getAccount(DEMO_USERS.consumer3),
          leaderboard: carbonPointsService.getLeaderboard(5),
          availableActions: carbonPointsService.getAvailableActions(),
        },
        count: carbonPointsService.getLeaderboard(10).length,
      },

      // Phase 10: B2B
      {
        name: 'Corporate Welfare',
        phase: 'Phase 10',
        data: {
          companySummary: corporateWelfareService.getCompanySummary(DEMO_USERS.company1),
          taxConfig: corporateWelfareService.getTaxConfig(),
        },
        count: corporateWelfareService.getCompanySummary(DEMO_USERS.company1) ? 1 : 0,
      },
      {
        name: 'Donation Platform',
        phase: 'Phase 10',
        data: {
          activeCampaigns: donationPlatformService.getActiveCampaigns(),
          taxConfig: donationPlatformService.getTaxConfig(),
        },
        count: donationPlatformService.getActiveCampaigns().length,
      },

      // Phase 11: MyData & AML
      {
        name: 'MyData Profiles',
        phase: 'Phase 11',
        data: {
          consumer1Profile: myDataService.getProfile(DEMO_USERS.consumer1),
          consumer2Profile: myDataService.getProfile(DEMO_USERS.consumer2),
        },
        count: [DEMO_USERS.consumer1, DEMO_USERS.consumer2]
          .filter(id => myDataService.getProfile(id)).length,
      },
      {
        name: 'Merchant Credit',
        phase: 'Phase 11',
        data: {
          merchant1Profile: merchantCreditService.getProfile(DEMO_USERS.merchant1),
          merchant2Profile: merchantCreditService.getProfile(DEMO_USERS.merchant2),
        },
        count: [DEMO_USERS.merchant1, DEMO_USERS.merchant2]
          .filter(id => merchantCreditService.getProfile(id)).length,
      },
      {
        name: 'AML Compliance',
        phase: 'Phase 11',
        data: {
          openAlerts: amlComplianceService.getOpenAlerts(),
          complianceStats: amlComplianceService.getComplianceStats(),
          thresholds: amlComplianceService.getThresholds(),
        },
        count: amlComplianceService.getOpenAlerts().length,
      },
    ];

    setServiceData(data);
    setIsLoading(false);
  };

  // Service methods for testing
  const serviceMethods: ServiceMethod[] = [
    // Programmable Money
    {
      service: 'Programmable Money',
      method: 'issueTokens',
      description: 'Issue new programmable tokens to a user',
      params: [
        { name: 'userId', type: 'string', default: DEMO_USERS.consumer1 },
        { name: 'amount', type: 'number', default: '50000' },
        { name: 'fundType', type: 'string', default: 'DISASTER_RELIEF' },
        { name: 'issuedBy', type: 'string', default: 'admin-test' },
        { name: 'expiryDays', type: 'number', default: '30' },
      ],
      execute: async (userId: string, amount: number, fundType: string, issuedBy: string, expiryDays: number) =>
        programmableMoneyService.issueTokens({
          userId,
          amount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fundType: fundType as any,
          issuedBy,
          expiryDays,
        }),
    },
    // Carbon Points
    {
      service: 'Carbon Points',
      method: 'recordAction',
      description: 'Record a carbon reduction action',
      params: [
        { name: 'userId', type: 'string', default: DEMO_USERS.consumer1 },
        { name: 'actionType', type: 'string', default: 'PUBLIC_TRANSPORT_BUS' },
        { name: 'quantity', type: 'number', default: '1' },
      ],
      execute: async (userId: string, actionType: string, quantity: number) =>
        carbonPointsService.recordAction({
          userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actionType: actionType as any,
          quantity,
          verificationMethod: 'QR_SCAN',
        }),
    },
    // Shared Loyalty
    {
      service: 'Shared Loyalty',
      method: 'earnPoints',
      description: 'Earn loyalty points from a transaction',
      params: [
        { name: 'userId', type: 'string', default: DEMO_USERS.consumer1 },
        { name: 'purchaseAmount', type: 'number', default: '50000' },
        { name: 'merchantId', type: 'string', default: DEMO_USERS.merchant1 },
      ],
      execute: async (userId: string, amount: number, merchantId: string) =>
        sharedLoyaltyService.earnPoints({
          userId,
          purchaseAmount: amount,
          merchantId,
          transactionId: `tx-test-${Date.now()}`,
        }),
    },
    // Tourist Wallet
    {
      service: 'Tourist Wallet',
      method: 'chargeFromCurrency',
      description: 'Charge wallet from foreign currency',
      params: [
        { name: 'visitorId', type: 'string', default: DEMO_USERS.tourist1 },
        { name: 'sourceCurrency', type: 'string', default: 'USD' },
        { name: 'sourceAmount', type: 'number', default: '100' },
      ],
      execute: async (visitorId: string, sourceCurrency: string, sourceAmount: number) =>
        touristWalletService.chargeFromCurrency({
          visitorId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sourceCurrency: sourceCurrency as any,
          sourceAmount,
          method: 'CARD',
        }),
    },
    // Donation Platform
    {
      service: 'Donation Platform',
      method: 'makeDonation',
      description: 'Make a donation to a campaign',
      params: [
        { name: 'donorId', type: 'string', default: DEMO_USERS.consumer1 },
        { name: 'donorName', type: 'string', default: 'Test Donor' },
        { name: 'charityId', type: 'string', default: 'charity-001' },
        { name: 'amount', type: 'number', default: '10000' },
      ],
      execute: async (donorId: string, donorName: string, charityId: string, amount: number) =>
        donationPlatformService.makeDonation({
          donorId,
          donorType: 'INDIVIDUAL',
          donorName,
          charityId,
          amount,
          isAnonymous: false,
        }),
    },
    // AML Compliance
    {
      service: 'AML Compliance',
      method: 'monitorTransaction',
      description: 'Monitor a transaction for AML compliance',
      params: [
        { name: 'senderId', type: 'string', default: DEMO_USERS.consumer1 },
        { name: 'senderName', type: 'string', default: 'Test Sender' },
        { name: 'recipientId', type: 'string', default: DEMO_USERS.merchant1 },
        { name: 'recipientName', type: 'string', default: 'Test Merchant' },
        { name: 'amount', type: 'number', default: '5000000' },
      ],
      execute: async (senderId: string, senderName: string, recipientId: string, recipientName: string, amount: number) =>
        amlComplianceService.monitorTransaction({
          id: `tx-aml-${Date.now()}`,
          timestamp: Date.now(),
          senderId,
          senderName,
          senderType: 'INDIVIDUAL',
          recipientId,
          recipientName,
          recipientType: 'MERCHANT',
          amount,
          transactionType: 'PAYMENT',
          channel: 'MOBILE',
        }),
    },
  ];

  const getPhaseColor = (phase: string): 'info' | 'success' | 'warning' | 'error' => {
    switch (phase) {
      case 'Phase 6': return 'info';
      case 'Phase 7': return 'success';
      case 'Phase 8': return 'warning';
      case 'Phase 9': return 'success';
      case 'Phase 10': return 'info';
      case 'Phase 11': return 'error';
      default: return 'info';
    }
  };

  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const executeMethod = async () => {
    if (!selectedMethod) return;

    setTestResult(null);

    try {
      const args = selectedMethod.params.map(p => {
        const value = methodParams[p.name] || p.default || '';
        return p.type === 'number' ? Number(value) : value;
      });

      const result = await selectedMethod.execute(...args);
      setTestResult({ success: true, data: result });
      // Refresh data after modification
      loadServiceData();
    } catch (error) {
      setTestResult({ success: false, data: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const tabs = [
    { id: 'data', label: 'View Data', icon: 'visibility' },
    { id: 'modify', label: 'Quick Actions', icon: 'edit' },
    { id: 'test', label: 'Method Tester', icon: 'science' },
  ] as const;

  return (
    <div className="flex flex-col pb-4 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Debug Dashboard</h1>
            <p className="text-xs text-gray-400">Demo Data Inspector & Tester</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg"
          >
            Back
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Users Reference */}
      <div className="px-4 py-3">
        <Card className="bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-semibold text-white mb-2">Demo User IDs</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(DEMO_USERS).map(([key, value]) => (
              <div key={key} className="flex justify-between text-gray-400">
                <span className="text-gray-500">{key}:</span>
                <span className="font-mono text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'data' && (
        <>
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading service data...</div>
            </div>
          )}

          {/* Service Data Cards */}
          <div className="px-4 space-y-3">
            {serviceData.map((service) => (
              <Card
                key={service.name}
                className="bg-gray-900 border border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedService(
                    expandedService === service.name ? null : service.name
                  )}
                  className="w-full flex items-center justify-between p-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={getPhaseColor(service.phase)} size="sm">
                      {service.phase}
                    </Badge>
                    <span className="text-white font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {service.count} items
                    </span>
                    <span className="text-gray-500">
                      {expandedService === service.name ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {expandedService === service.name && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <pre className="text-xs text-gray-300 overflow-x-auto bg-black/50 p-3 rounded-lg max-h-96 overflow-y-auto">
                      {formatJson(service.data)}
                    </pre>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTab === 'modify' && (
        <div className="px-4 space-y-4">
          <Card className="bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Data Modifications</h3>

            <div className="space-y-3">
              {/* Issue Token */}
              <button
                onClick={async () => {
                  await programmableMoneyService.issueTokens({
                    userId: DEMO_USERS.consumer1,
                    amount: 100000,
                    fundType: 'CHILD_MEAL',
                    issuedBy: 'debug-admin',
                    expiryDays: 30,
                  });
                  loadServiceData();
                  alert('Tokens issued successfully!');
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">token</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Issue Child Meal Tokens</p>
                    <p className="text-xs text-gray-400">Add 100,000 tokens to consumer1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500">play_arrow</span>
              </button>

              {/* Earn Carbon Points */}
              <button
                onClick={async () => {
                  await carbonPointsService.recordAction({
                    userId: DEMO_USERS.consumer1,
                    actionType: 'PUBLIC_TRANSPORT_BUS',
                    quantity: 5,
                    verificationMethod: 'TRANSPORT_CARD',
                  });
                  loadServiceData();
                  alert('Carbon points earned!');
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">eco</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Earn Carbon Points</p>
                    <p className="text-xs text-gray-400">5 public transit trips for consumer1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500">play_arrow</span>
              </button>

              {/* Earn Loyalty Points */}
              <button
                onClick={async () => {
                  await sharedLoyaltyService.earnPoints({
                    userId: DEMO_USERS.consumer1,
                    purchaseAmount: 100000,
                    merchantId: DEMO_USERS.merchant1,
                    transactionId: `tx-debug-${Date.now()}`,
                  });
                  loadServiceData();
                  alert('Loyalty points earned!');
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">loyalty</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Earn Loyalty Points</p>
                    <p className="text-xs text-gray-400">100,000 KRW transaction for consumer1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500">play_arrow</span>
              </button>

              {/* Exchange Currency */}
              <button
                onClick={async () => {
                  await touristWalletService.chargeFromCurrency({
                    visitorId: DEMO_USERS.tourist1,
                    sourceCurrency: 'USD',
                    sourceAmount: 50,
                    method: 'CARD',
                  });
                  loadServiceData();
                  alert('Currency exchanged!');
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-yellow-400">currency_exchange</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Exchange Currency</p>
                    <p className="text-xs text-gray-400">Exchange $50 USD for tourist1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500">play_arrow</span>
              </button>

              {/* Make Donation */}
              <button
                onClick={async () => {
                  await donationPlatformService.makeDonation({
                    donorId: DEMO_USERS.consumer1,
                    donorType: 'INDIVIDUAL',
                    donorName: 'Debug User',
                    charityId: 'charity-001',
                    amount: 50000,
                    isAnonymous: false,
                  });
                  loadServiceData();
                  alert('Donation made!');
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400">volunteer_activism</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Make Donation</p>
                    <p className="text-xs text-gray-400">Donate 50,000 KRW from consumer1</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500">play_arrow</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="px-4 space-y-4">
          {/* Method Selector */}
          <Card className="bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-white mb-3">Select Service Method</h3>
            <div className="space-y-2">
              {serviceMethods.map((method, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedMethod(method);
                    setMethodParams({});
                    setTestResult(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedMethod === method
                      ? 'bg-blue-600/20 border border-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      {method.service}.{method.method}()
                    </p>
                    <p className="text-xs text-gray-400">{method.description}</p>
                  </div>
                  {selectedMethod === method && (
                    <span className="material-symbols-outlined text-blue-400">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Method Parameters */}
          {selectedMethod && (
            <Card className="bg-gray-900 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-3">Parameters</h3>
              <div className="space-y-3">
                {selectedMethod.params.map((param) => (
                  <div key={param.name}>
                    <label className="text-xs text-gray-400 mb-1 block">
                      {param.name} ({param.type})
                    </label>
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={methodParams[param.name] ?? param.default ?? ''}
                      onChange={(e) => setMethodParams({
                        ...methodParams,
                        [param.name]: e.target.value,
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}

                <Button
                  variant="primary"
                  fullWidth
                  onClick={executeMethod}
                >
                  <span className="material-symbols-outlined mr-2">play_arrow</span>
                  Execute Method
                </Button>
              </div>
            </Card>
          )}

          {/* Test Result */}
          {testResult && (
            <Card className={`border ${
              testResult.success
                ? 'bg-green-900/20 border-green-500/30'
                : 'bg-red-900/20 border-red-500/30'
            }`}>
              <h3 className={`text-sm font-semibold mb-2 ${
                testResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {testResult.success ? 'Success' : 'Error'}
              </h3>
              <pre className="text-xs text-gray-300 overflow-x-auto bg-black/50 p-3 rounded-lg max-h-64 overflow-y-auto">
                {formatJson(testResult.data)}
              </pre>
            </Card>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {activeTab === 'data' && (
        <div className="px-4 py-4 mt-4">
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30">
            <h3 className="text-sm font-semibold text-white mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {serviceData.length}
                </div>
                <div className="text-xs text-gray-400">Services</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {serviceData.reduce((sum, s) => sum + s.count, 0)}
                </div>
                <div className="text-xs text-gray-400">Total Items</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Refresh Button */}
      <div className="px-4 py-4">
        <button
          onClick={loadServiceData}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default DebugDashboard;
