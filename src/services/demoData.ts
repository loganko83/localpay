/**
 * Demo Data Service
 *
 * Initializes all services with realistic test data for demonstration.
 * Call initializeDemoData() on app startup to populate mock stores.
 *
 * DATA CLASSIFICATION:
 * - All data is [MOCK] for demonstration purposes
 * - Uses realistic Korean business scenarios
 */

import { programmableMoneyService } from './programmableMoney';
import { tokenLifecycleService } from './tokenLifecycle';
import { touristWalletService } from './touristWallet';
import { taxRefundService } from './taxRefund';
import { publicDeliveryService } from './publicDelivery';
import { productTraceabilityService } from './productTraceability';
import { sharedLoyaltyService } from './sharedLoyalty';
import { carbonPointsService } from './carbonPoints';
import { corporateWelfareService } from './corporateWelfare';
import { donationPlatformService } from './donationPlatform';
import { myDataService } from './myDataService';
import { merchantCreditService } from './merchantCredit';
import { amlComplianceService } from './amlCompliance';

// Demo user IDs
const DEMO_USERS = {
  consumer1: 'user-demo-001',
  consumer2: 'user-demo-002',
  consumer3: 'user-demo-003',
  tourist1: 'tourist-usa-001',
  tourist2: 'tourist-jpn-001',
  merchant1: 'merchant-cafe-001',
  merchant2: 'merchant-restaurant-001',
  merchant3: 'merchant-market-001',
  producer1: 'producer-farm-001',
  rider1: 'rider-demo-001',
  company1: 'company-demo-001',
};

/**
 * Initialize all demo data
 */
export async function initializeDemoData(): Promise<void> {
  console.log('[DemoData] Initializing demo data...');

  await initializeProgrammableMoney();
  await initializeTokenLifecycle();
  await initializeTouristWallets();
  await initializeTaxRefund();
  await initializePublicDelivery();
  await initializeProductTraceability();
  await initializeSharedLoyalty();
  await initializeCarbonPoints();
  await initializeCorporateWelfare();
  await initializeDonationPlatform();
  await initializeMyData();
  await initializeMerchantCredit();
  await initializeAMLCompliance();

  console.log('[DemoData] Demo data initialization complete!');
}

/**
 * Phase 6: Programmable Money Demo Data
 */
async function initializeProgrammableMoney(): Promise<void> {
  // Issue disaster relief tokens
  await programmableMoneyService.issueTokens({
    userId: DEMO_USERS.consumer1,
    amount: 100000,
    fundType: 'DISASTER_RELIEF',
    issuedBy: 'admin-busan-001',
    expiryDays: 90,
  });

  // Issue youth allowance tokens
  await programmableMoneyService.issueTokens({
    userId: DEMO_USERS.consumer2,
    amount: 200000,
    fundType: 'YOUTH_ALLOWANCE',
    issuedBy: 'admin-busan-001',
    expiryDays: 180,
  });

  // Issue child meal support
  await programmableMoneyService.issueTokens({
    userId: DEMO_USERS.consumer3,
    amount: 150000,
    fundType: 'CHILD_MEAL',
    issuedBy: 'admin-busan-001',
    expiryDays: 30,
  });

  // Issue traditional market bonus
  await programmableMoneyService.issueTokens({
    userId: DEMO_USERS.consumer1,
    amount: 50000,
    fundType: 'TRADITIONAL_MARKET',
    issuedBy: 'admin-busan-001',
    expiryDays: 60,
  });

  console.log('[DemoData] Programmable money tokens issued');
}

/**
 * Phase 6: Token Lifecycle Demo Data
 */
async function initializeTokenLifecycle(): Promise<void> {
  // Mint general circulation tokens
  const token1 = await tokenLifecycleService.mint({
    amount: 10000000,
    budgetCode: 'BUD-2024-LOCAL-001',
    budgetYear: 2024,
    issuerId: 'admin-treasury-001',
    recipientId: DEMO_USERS.consumer1,
    metadata: { purpose: 'Q1 2024 Local Currency Circulation' },
  });

  // Mint policy fund tokens
  const token2 = await tokenLifecycleService.mint({
    amount: 5000000,
    budgetCode: 'BUD-2024-WELFARE-001',
    budgetYear: 2024,
    issuerId: 'admin-welfare-001',
    recipientId: DEMO_USERS.consumer2,
    metadata: { purpose: 'Welfare benefit distribution' },
  });

  // Simulate some transfers
  await tokenLifecycleService.recordTransfer({
    tokenId: token1.id,
    fromEntity: DEMO_USERS.consumer1,
    toEntity: DEMO_USERS.merchant1,
    amount: 50000,
    transactionId: `tx-demo-${Date.now()}-001`,
    merchantId: DEMO_USERS.merchant1,
  });

  await tokenLifecycleService.recordTransfer({
    tokenId: token2.id,
    fromEntity: DEMO_USERS.consumer2,
    toEntity: DEMO_USERS.merchant2,
    amount: 30000,
    transactionId: `tx-demo-${Date.now()}-002`,
    merchantId: DEMO_USERS.merchant2,
  });

  console.log('[DemoData] Token lifecycle data initialized');
}

/**
 * Phase 7: Tourist Wallet Demo Data
 */
async function initializeTouristWallets(): Promise<void> {
  // Create US tourist wallet
  await touristWalletService.createWallet({
    visitorId: DEMO_USERS.tourist1,
    passportCountry: 'USA',
    passportNumber: 'US123456789',
    entryDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    plannedDepartureDate: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
  });

  // Charge from USD
  await touristWalletService.chargeFromCurrency({
    visitorId: DEMO_USERS.tourist1,
    sourceCurrency: 'USD',
    sourceAmount: 500,
    method: 'CARD',
  });

  // Create Japanese tourist wallet
  await touristWalletService.createWallet({
    visitorId: DEMO_USERS.tourist2,
    passportCountry: 'JPN',
    passportNumber: 'JP987654321',
    entryDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    plannedDepartureDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
  });

  // Charge from JPY
  await touristWalletService.chargeFromCurrency({
    visitorId: DEMO_USERS.tourist2,
    sourceCurrency: 'JPY',
    sourceAmount: 50000,
    method: 'CARD',
  });

  // Charge from stablecoin
  await touristWalletService.chargeFromStablecoin({
    visitorId: DEMO_USERS.tourist1,
    stablecoin: 'USDT',
    amount: 200,
  });

  console.log('[DemoData] Tourist wallets created');
}

/**
 * Phase 7: Tax Refund Demo Data
 */
async function initializeTaxRefund(): Promise<void> {
  // Register tax-free merchants
  taxRefundService.registerMerchant({
    merchantId: 'merchant-duty-free-001',
    name: 'Busan Duty Free',
    taxId: '123-45-67890',
  });

  taxRefundService.registerMerchant({
    merchantId: 'merchant-cosmetics-001',
    name: 'K-Beauty Store',
    taxId: '234-56-78901',
  });

  // Process refund for US tourist
  await taxRefundService.processRefund({
    visitorId: DEMO_USERS.tourist1,
    merchantId: 'merchant-duty-free-001',
    purchaseAmount: 250000,
    items: [
      { name: 'Korean Cosmetics Set', quantity: 2, unitPrice: 80000, category: 'COSMETICS' },
      { name: 'Traditional Hanbok', quantity: 1, unitPrice: 90000, category: 'CLOTHING' },
    ],
  });

  // Process refund for Japanese tourist
  await taxRefundService.processRefund({
    visitorId: DEMO_USERS.tourist2,
    merchantId: 'merchant-cosmetics-001',
    purchaseAmount: 180000,
    items: [
      { name: 'Skincare Bundle', quantity: 1, unitPrice: 120000, category: 'COSMETICS' },
      { name: 'Face Masks Pack', quantity: 3, unitPrice: 20000, category: 'COSMETICS' },
    ],
  });

  console.log('[DemoData] Tax refund data initialized');
}

/**
 * Phase 8: Public Delivery Demo Data
 */
async function initializePublicDelivery(): Promise<void> {
  // Register rider
  publicDeliveryService.registerRider({
    id: DEMO_USERS.rider1,
    name: 'Kim Delivery',
    phone: '010-1234-5678',
    vehicleType: 'MOTORCYCLE',
  });

  // Place delivery orders
  const order1 = await publicDeliveryService.placeOrder({
    customerId: DEMO_USERS.consumer1,
    merchantId: DEMO_USERS.merchant2,
    items: [
      { name: 'Bibimbap', quantity: 2, unitPrice: 12000 },
      { name: 'Kimchi Jjigae', quantity: 1, unitPrice: 9000 },
    ],
    deliveryAddress: 'Busan Haeundae-gu, Marine City 1-dong 123',
    deliveryDistance: 3.5,
    specialInstructions: 'Please ring doorbell twice',
  });

  // Accept and process order
  if (order1) {
    await publicDeliveryService.acceptOrder(order1.id, 20);
    // Simulate order progression would happen here
  }

  // Place another order
  await publicDeliveryService.placeOrder({
    customerId: DEMO_USERS.consumer2,
    merchantId: DEMO_USERS.merchant1,
    items: [
      { name: 'Americano', quantity: 3, unitPrice: 4500 },
      { name: 'Croissant', quantity: 2, unitPrice: 3500 },
    ],
    deliveryAddress: 'Busan Suyeong-gu, Gwangan 2-dong 456',
    deliveryDistance: 2.0,
  });

  console.log('[DemoData] Public delivery orders created');
}

/**
 * Phase 8: Product Traceability Demo Data
 */
async function initializeProductTraceability(): Promise<void> {
  // Register producer
  productTraceabilityService.registerProducer({
    id: DEMO_USERS.producer1,
    name: 'Gimhae Organic Farm',
    region: 'Gimhae, South Gyeongsang',
    certifications: ['GAP', 'ORGANIC'],
  });

  // Register product
  const product = await productTraceabilityService.registerProduct({
    productName: 'Organic Cherry Tomatoes',
    category: 'VEGETABLES',
    producerId: DEMO_USERS.producer1,
    harvestDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    expiryDate: Date.now() + 12 * 24 * 60 * 60 * 1000, // 12 days from now
    quantity: 500,
    unit: 'kg',
    certifications: [
      { type: 'GAP', certNumber: 'GAP-2024-001234', expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 },
      { type: 'ORGANIC', certNumber: 'ORG-2024-005678', expiresAt: Date.now() + 180 * 24 * 60 * 60 * 1000 },
    ],
    location: {
      region: 'Gimhae',
      address: 'Gimhae-si Jillye-myeon Farm Road 123',
      coordinates: { lat: 35.2342, lng: 128.8811 },
    },
  });

  // Add tracking events
  if (product) {
    await productTraceabilityService.addTrackingEvent({
      productId: product.id,
      eventType: 'INSPECTED',
      actorId: 'inspector-001',
      actorName: 'NAQS Inspector',
      location: { name: 'Gimhae Inspection Center', address: 'Gimhae-si Center Road 45' },
      temperature: 4,
      humidity: 85,
      verificationMethod: 'QR_SCAN',
    });

    await productTraceabilityService.addTrackingEvent({
      productId: product.id,
      eventType: 'TRANSPORTED',
      actorId: 'transport-001',
      actorName: 'Fresh Logistics Co.',
      location: { name: 'Cold Chain Truck', address: 'In transit to Busan' },
      temperature: 3,
      verificationMethod: 'IOT_SENSOR',
    });

    await productTraceabilityService.addTrackingEvent({
      productId: product.id,
      eventType: 'RETAILED',
      actorId: DEMO_USERS.merchant3,
      actorName: 'Jagalchi Traditional Market',
      location: { name: 'Market Stall B-23', address: 'Busan Jung-gu Jagalchi-ro 52' },
      temperature: 5,
      verificationMethod: 'QR_SCAN',
    });
  }

  console.log('[DemoData] Product traceability data initialized');
}

/**
 * Phase 8: Shared Loyalty Demo Data
 */
async function initializeSharedLoyalty(): Promise<void> {
  // Register merchants to alliance
  sharedLoyaltyService.registerMerchant({
    merchantId: DEMO_USERS.merchant1,
    merchantName: 'Haeundae Coffee House',
    category: 'CAFE',
  });

  sharedLoyaltyService.registerMerchant({
    merchantId: DEMO_USERS.merchant2,
    merchantName: 'Seomyeon Korean BBQ',
    category: 'RESTAURANT',
  });

  sharedLoyaltyService.registerMerchant({
    merchantId: DEMO_USERS.merchant3,
    merchantName: 'Jagalchi Fresh Market',
    category: 'GROCERY',
    customEarnRate: 0.02, // 2% for traditional market
  });

  // Enroll members and simulate purchases
  await sharedLoyaltyService.enrollMember(DEMO_USERS.consumer1);
  await sharedLoyaltyService.enrollMember(DEMO_USERS.consumer2);

  // Earn points from purchases
  await sharedLoyaltyService.earnPoints({
    userId: DEMO_USERS.consumer1,
    merchantId: DEMO_USERS.merchant1,
    purchaseAmount: 45000,
    transactionId: 'tx-loyalty-001',
  });

  await sharedLoyaltyService.earnPoints({
    userId: DEMO_USERS.consumer1,
    merchantId: DEMO_USERS.merchant2,
    purchaseAmount: 85000,
    transactionId: 'tx-loyalty-002',
  });

  await sharedLoyaltyService.earnPoints({
    userId: DEMO_USERS.consumer2,
    merchantId: DEMO_USERS.merchant3,
    purchaseAmount: 120000,
    transactionId: 'tx-loyalty-003',
  });

  console.log('[DemoData] Shared loyalty data initialized');
}

/**
 * Phase 9: Carbon Points Demo Data
 */
async function initializeCarbonPoints(): Promise<void> {
  // Record eco-friendly actions for consumer 1
  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer1,
    actionType: 'TUMBLER_USE',
    quantity: 5,
    verificationMethod: 'QR_SCAN',
    verificationData: { merchantId: DEMO_USERS.merchant1 },
  });

  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer1,
    actionType: 'PUBLIC_TRANSPORT_BUS',
    quantity: 10, // 10 km
    verificationMethod: 'TRANSPORT_CARD',
  });

  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer1,
    actionType: 'ELECTRONIC_RECEIPT',
    quantity: 8,
    verificationMethod: 'RECEIPT_SCAN',
  });

  // Record actions for consumer 2
  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer2,
    actionType: 'WALKING',
    quantity: 5, // 5 km
    verificationMethod: 'GPS_TRACKING',
  });

  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer2,
    actionType: 'NO_PLASTIC_BAG',
    quantity: 12,
    verificationMethod: 'QR_SCAN',
  });

  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer2,
    actionType: 'BIKE_SHARING',
    quantity: 8, // 8 km
    verificationMethod: 'IOT_SENSOR',
  });

  // Record actions for consumer 3
  await carbonPointsService.recordAction({
    userId: DEMO_USERS.consumer3,
    actionType: 'RECYCLING_GENERAL',
    quantity: 15, // 15 kg
    verificationMethod: 'QR_SCAN',
  });

  console.log('[DemoData] Carbon points data initialized');
}

/**
 * Phase 10: Corporate Welfare Demo Data
 */
async function initializeCorporateWelfare(): Promise<void> {
  // Register company
  const company = await corporateWelfareService.registerCompany({
    companyName: 'Busan Tech Solutions',
    businessNumber: '123-45-67890',
    adminUserId: 'admin-company-001',
    initialBudget: 50000000, // 50M KRW
    fiscalYearStart: 1,
  });

  if (company) {
    // Add departments
    const devDept = corporateWelfareService.addDepartment(company.id, {
      name: 'Development Team',
      budget: 20000000,
    });

    const salesDept = corporateWelfareService.addDepartment(company.id, {
      name: 'Sales Team',
      budget: 15000000,
    });

    // Add employees
    if (devDept) {
      corporateWelfareService.addEmployee(company.id, {
        departmentId: devDept.id,
        employeeId: 'emp-dev-001',
        employeeName: 'Park Developer',
      });

      corporateWelfareService.addEmployee(company.id, {
        departmentId: devDept.id,
        employeeId: 'emp-dev-002',
        employeeName: 'Lee Engineer',
      });
    }

    if (salesDept) {
      corporateWelfareService.addEmployee(company.id, {
        departmentId: salesDept.id,
        employeeId: 'emp-sales-001',
        employeeName: 'Kim Sales',
      });
    }

    // Distribute welfare points
    if (devDept) {
      await corporateWelfareService.bulkDistribute({
        companyId: company.id,
        departmentId: devDept.id,
        category: 'MEAL_ALLOWANCE',
        amountPerEmployee: 200000,
        executedBy: 'admin-company-001',
        note: 'December meal allowance',
      });
    }

    await corporateWelfareService.bulkDistribute({
      companyId: company.id,
      category: 'CULTURE_EXPENSE',
      amountPerEmployee: 100000,
      executedBy: 'admin-company-001',
      note: 'Year-end culture benefit',
    });
  }

  console.log('[DemoData] Corporate welfare data initialized');
}

/**
 * Phase 10: Donation Platform Demo Data
 */
async function initializeDonationPlatform(): Promise<void> {
  // Register charities
  const charity1 = donationPlatformService.registerCharity({
    name: 'Busan Children Foundation',
    registrationNumber: 'CHR-2024-001234',
    category: 'WELFARE',
    donationType: 'DESIGNATED',
    description: 'Supporting underprivileged children in Busan',
    website: 'https://busanchildren.org',
  });

  const charity2 = donationPlatformService.registerCharity({
    name: 'Green Busan Environment',
    registrationNumber: 'CHR-2024-005678',
    category: 'ENVIRONMENT',
    donationType: 'DESIGNATED',
    description: 'Environmental protection and education in Busan',
  });

  // Create donation campaigns
  const campaign1 = donationPlatformService.createCampaign({
    charityId: charity1.id,
    title: 'Winter Heating Support',
    description: 'Help children stay warm this winter',
    targetAmount: 10000000,
    endDate: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
    milestones: [
      { amount: 2500000, description: '25% - Purchase heating equipment' },
      { amount: 5000000, description: '50% - Distribute to first 50 families' },
      { amount: 7500000, description: '75% - Expand to more districts' },
    ],
  });

  const campaign2 = donationPlatformService.createCampaign({
    charityId: charity2.id,
    title: 'Ocean Cleanup Initiative',
    description: 'Clean Busan beaches and protect marine life',
    targetAmount: 5000000,
    endDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
  });

  // Make donations
  if (campaign1) {
    await donationPlatformService.makeDonation({
      donorId: DEMO_USERS.consumer1,
      donorType: 'INDIVIDUAL',
      donorName: 'Park Generous',
      charityId: charity1.id,
      campaignId: campaign1.id,
      amount: 100000,
      message: 'Hope this helps the children!',
    });

    await donationPlatformService.makeDonation({
      donorId: DEMO_USERS.company1,
      donorType: 'CORPORATE',
      donorName: 'Busan Tech Solutions',
      charityId: charity1.id,
      campaignId: campaign1.id,
      amount: 1000000,
      message: 'Corporate social responsibility contribution',
    });
  }

  if (campaign2) {
    await donationPlatformService.makeDonation({
      donorId: DEMO_USERS.consumer2,
      donorType: 'INDIVIDUAL',
      donorName: 'Lee EcoFriend',
      charityId: charity2.id,
      campaignId: campaign2.id,
      amount: 50000,
      isAnonymous: true,
    });
  }

  console.log('[DemoData] Donation platform data initialized');
}

/**
 * Phase 11: MyData Demo Data
 */
async function initializeMyData(): Promise<void> {
  // Create MyData profiles
  await myDataService.createProfile(DEMO_USERS.consumer1);
  await myDataService.createProfile(DEMO_USERS.consumer2);

  // Connect data sources for consumer 1
  await myDataService.connectDataSource({
    userId: DEMO_USERS.consumer1,
    category: 'BANK_ACCOUNT',
    provider: 'IBK Bank',
    providerId: 'ibk-001',
  });

  await myDataService.connectDataSource({
    userId: DEMO_USERS.consumer1,
    category: 'LOCAL_CURRENCY',
    provider: 'Busan Pay',
    providerId: 'busan-pay-001',
  });

  await myDataService.connectDataSource({
    userId: DEMO_USERS.consumer1,
    category: 'CARD_USAGE',
    provider: 'Samsung Card',
    providerId: 'samsung-card-001',
  });

  // Create data access request
  await myDataService.requestDataAccess({
    requesterId: 'fintech-app-001',
    requesterName: 'BudgetHelper App',
    userId: DEMO_USERS.consumer1,
    purpose: 'SPENDING_ANALYSIS',
    categories: ['LOCAL_CURRENCY', 'CARD_USAGE'],
    scope: 'SUMMARY',
    validityDays: 365,
  });

  // Consumer 2 connects fewer sources
  await myDataService.connectDataSource({
    userId: DEMO_USERS.consumer2,
    category: 'LOCAL_CURRENCY',
    provider: 'Busan Pay',
    providerId: 'busan-pay-002',
  });

  console.log('[DemoData] MyData profiles initialized');
}

/**
 * Phase 11: Merchant Credit Demo Data
 */
async function initializeMerchantCredit(): Promise<void> {
  // Initialize credit profiles for merchants
  await merchantCreditService.initializeProfile({
    merchantId: DEMO_USERS.merchant1,
    merchantName: 'Haeundae Coffee House',
    businessType: 'CAFE',
    registeredAt: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago
  });

  await merchantCreditService.initializeProfile({
    merchantId: DEMO_USERS.merchant2,
    merchantName: 'Seomyeon Korean BBQ',
    businessType: 'RESTAURANT',
    registeredAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
  });

  await merchantCreditService.initializeProfile({
    merchantId: DEMO_USERS.merchant3,
    merchantName: 'Jagalchi Fresh Market',
    businessType: 'GROCERY',
    registeredAt: Date.now() - 600 * 24 * 60 * 60 * 1000,
  });

  // Perform credit assessments with realistic metrics
  await merchantCreditService.assessCredit(DEMO_USERS.merchant1, {
    monthlyAverageVolume: 15000000,
    totalLifetimeVolume: 180000000,
    monthlyTransactionCount: 450,
    uniqueCustomers: 320,
    repeatCustomerRate: 0.45,
    averageTicketSize: 33000,
    monthOverMonthGrowth: 0.08,
    yearOverYearGrowth: 0.15,
    volatilityScore: 0.2,
    averageSettlementDays: 1,
    paymentDefaultRate: 0,
    daysOnPlatform: 400,
    localCurrencyRatio: 0.65,
  });

  await merchantCreditService.assessCredit(DEMO_USERS.merchant2, {
    monthlyAverageVolume: 25000000,
    totalLifetimeVolume: 150000000,
    monthlyTransactionCount: 380,
    uniqueCustomers: 250,
    repeatCustomerRate: 0.55,
    averageTicketSize: 65000,
    monthOverMonthGrowth: 0.12,
    yearOverYearGrowth: 0.25,
    volatilityScore: 0.15,
    averageSettlementDays: 1,
    paymentDefaultRate: 0.01,
    daysOnPlatform: 200,
    localCurrencyRatio: 0.55,
  });

  // Apply for a loan
  await merchantCreditService.applyForLoan({
    merchantId: DEMO_USERS.merchant1,
    requestedAmount: 10000000,
    loanType: 'WORKING_CAPITAL',
    purpose: 'Expand seating area and purchase new equipment',
    termMonths: 12,
  });

  console.log('[DemoData] Merchant credit data initialized');
}

/**
 * Phase 11: AML Compliance Demo Data
 */
async function initializeAMLCompliance(): Promise<void> {
  // Create risk profiles
  await amlComplianceService.createRiskProfile({
    customerId: DEMO_USERS.consumer1,
    customerType: 'INDIVIDUAL',
    initialRiskFactors: [
      { factor: 'ACCOUNT_AGE', weight: 0.2, value: '> 1 year', score: 10 },
      { factor: 'TRANSACTION_VOLUME', weight: 0.3, value: 'Normal', score: 20 },
    ],
  });

  await amlComplianceService.createRiskProfile({
    customerId: DEMO_USERS.merchant1,
    customerType: 'MERCHANT',
    initialRiskFactors: [
      { factor: 'BUSINESS_TYPE', weight: 0.3, value: 'CAFE', score: 15 },
      { factor: 'TRANSACTION_PATTERN', weight: 0.3, value: 'Consistent', score: 10 },
    ],
  });

  // Monitor some transactions
  await amlComplianceService.monitorTransaction({
    id: 'tx-aml-001',
    timestamp: Date.now(),
    senderId: DEMO_USERS.consumer1,
    senderName: 'Park Consumer',
    senderType: 'INDIVIDUAL',
    recipientId: DEMO_USERS.merchant1,
    recipientName: 'Haeundae Coffee House',
    recipientType: 'MERCHANT',
    amount: 45000,
    transactionType: 'PAYMENT',
    channel: 'MOBILE',
  });

  await amlComplianceService.monitorTransaction({
    id: 'tx-aml-002',
    timestamp: Date.now(),
    senderId: DEMO_USERS.consumer2,
    senderName: 'Lee Consumer',
    senderType: 'INDIVIDUAL',
    recipientId: DEMO_USERS.merchant2,
    recipientName: 'Seomyeon Korean BBQ',
    recipientType: 'MERCHANT',
    amount: 125000,
    transactionType: 'PAYMENT',
    channel: 'OFFLINE',
  });

  // Monitor a larger transaction (for CTR threshold)
  await amlComplianceService.monitorTransaction({
    id: 'tx-aml-003',
    timestamp: Date.now(),
    senderId: DEMO_USERS.company1,
    senderName: 'Busan Tech Solutions',
    senderType: 'CORPORATE',
    recipientId: 'vendor-001',
    recipientName: 'Office Supplies Co.',
    recipientType: 'MERCHANT',
    amount: 8500000, // Close to but under CTR threshold
    transactionType: 'TRANSFER',
    channel: 'ONLINE',
  });

  console.log('[DemoData] AML compliance data initialized');
}

// Export demo user IDs for testing
export { DEMO_USERS };
