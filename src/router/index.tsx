import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Layout, BottomNav } from '../components/layout';
import { AdminLayout as WebAdminLayout } from '../components/admin';

// Lazy load screens for better performance
const AppSelector = React.lazy(() => import('../screens/AppSelector'));

// Consumer screens
const ConsumerLogin = React.lazy(() => import('../screens/consumer/Login'));
const ConsumerHome = React.lazy(() => import('../screens/consumer/Home'));
const ConsumerWallet = React.lazy(() => import('../screens/consumer/Wallet'));
const ConsumerScan = React.lazy(() => import('../screens/consumer/Scan'));
const ConsumerHistory = React.lazy(() => import('../screens/consumer/History'));
const ConsumerProfile = React.lazy(() => import('../screens/consumer/Profile'));
const ConsumerTopUp = React.lazy(() => import('../screens/consumer/TopUp'));
const ConsumerMerchantDetail = React.lazy(() => import('../screens/consumer/MerchantDetail'));
const ConsumerOffers = React.lazy(() => import('../screens/consumer/Offers'));
const ConsumerCoupons = React.lazy(() => import('../screens/consumer/Coupons'));
const ConsumerServices = React.lazy(() => import('../screens/consumer/Services'));
const ConsumerPaymentConfirmation = React.lazy(() => import('../screens/consumer/PaymentConfirmation'));
const ConsumerTransactionDetail = React.lazy(() => import('../screens/consumer/TransactionDetail'));
const ConsumerProductTrace = React.lazy(() => import('../screens/consumer/ProductTrace'));
const ConsumerCarbonPoints = React.lazy(() => import('../screens/consumer/CarbonPoints'));
const ConsumerLoyaltyPoints = React.lazy(() => import('../screens/consumer/LoyaltyPoints'));
const ConsumerTouristWallet = React.lazy(() => import('../screens/consumer/TouristWallet'));
const ConsumerDelivery = React.lazy(() => import('../screens/consumer/Delivery'));
const ConsumerDonations = React.lazy(() => import('../screens/consumer/Donations'));
const ConsumerMerchantMap = React.lazy(() => import('../screens/consumer/MerchantMap'));

// Merchant screens
const MerchantLogin = React.lazy(() => import('../screens/merchant/Login'));
const MerchantDashboard = React.lazy(() => import('../screens/merchant/Dashboard'));
const MerchantWallet = React.lazy(() => import('../screens/merchant/Wallet'));
const MerchantScan = React.lazy(() => import('../screens/merchant/Scan'));
const MerchantPayments = React.lazy(() => import('../screens/merchant/Payments'));
const MerchantHistory = React.lazy(() => import('../screens/merchant/History'));
const MerchantEmployees = React.lazy(() => import('../screens/merchant/Employees'));
const MerchantSettings = React.lazy(() => import('../screens/merchant/Settings'));
const MerchantNotifications = React.lazy(() => import('../screens/merchant/Notifications'));
const MerchantCreditScore = React.lazy(() => import('../screens/merchant/CreditScore'));
const MerchantWelfareManagement = React.lazy(() => import('../screens/merchant/WelfareManagement'));
const MerchantDeliveryOrders = React.lazy(() => import('../screens/merchant/DeliveryOrders'));
const MerchantSettlementCalendar = React.lazy(() => import('../screens/merchant/SettlementCalendar'));
const MerchantLoyaltyRedeem = React.lazy(() => import('../screens/merchant/LoyaltyRedeem'));

// Admin screens
const AdminLogin = React.lazy(() => import('../screens/admin/Login'));
const AdminDashboard = React.lazy(() => import('../screens/admin/Dashboard'));
const AdminUsers = React.lazy(() => import('../screens/admin/Users'));
const AdminVouchers = React.lazy(() => import('../screens/admin/Vouchers'));
const AdminSettlements = React.lazy(() => import('../screens/admin/Settlements'));
const AdminAuditLogs = React.lazy(() => import('../screens/admin/AuditLogs'));
const AdminSecurity = React.lazy(() => import('../screens/admin/Security'));
const AdminPolicies = React.lazy(() => import('../screens/admin/Policies'));
const AdminTokenIssuance = React.lazy(() => import('../screens/admin/TokenIssuance'));
const AdminAMLDashboard = React.lazy(() => import('../screens/admin/AMLDashboard'));
const AdminCarbonAdmin = React.lazy(() => import('../screens/admin/CarbonAdmin'));
const AdminDonationCampaigns = React.lazy(() => import('../screens/admin/DonationCampaigns'));
const AdminMerchantCreditReview = React.lazy(() => import('../screens/admin/MerchantCreditReview'));
const AdminAnalytics = React.lazy(() => import('../screens/admin/Analytics'));
const AdminBlockchainExplorer = React.lazy(() => import('../screens/admin/BlockchainExplorer'));
const AdminSettings = React.lazy(() => import('../screens/admin/Settings'));
const AdminFDSDashboard = React.lazy(() => import('../screens/admin/FDSDashboard'));
const AdminAMLCenter = React.lazy(() => import('../screens/admin/AMLCenter'));
const AdminWelfareTracker = React.lazy(() => import('../screens/admin/WelfareTracker'));

// Debug screens (dev only)
const DebugDashboard = React.lazy(() => import('../screens/debug/DebugDashboard'));

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <span className="material-symbols-outlined text-primary text-4xl animate-spin">
      progress_activity
    </span>
  </div>
);

// Layout wrapper with bottom nav
const ConsumerLayout = () => (
  <Layout>
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <React.Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </React.Suspense>
    </div>
    <BottomNav userType="consumer" />
  </Layout>
);

const MerchantLayout = () => (
  <Layout>
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <React.Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </React.Suspense>
    </div>
    <BottomNav userType="merchant" />
  </Layout>
);

// Web-based Admin Layout with sidebar
const AdminLayoutWrapper = () => (
  <React.Suspense fallback={<LoadingFallback />}>
    <WebAdminLayout />
  </React.Suspense>
);

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <React.Suspense fallback={<LoadingFallback />}>
          <AppSelector />
        </React.Suspense>
      ),
    },

    // Consumer Routes
    {
      path: '/consumer/login',
      element: (
        <Layout>
          <React.Suspense fallback={<LoadingFallback />}>
            <ConsumerLogin />
          </React.Suspense>
        </Layout>
      ),
    },
    {
      path: '/consumer',
      element: <ConsumerLayout />,
      children: [
        { index: true, element: <ConsumerHome /> },
        { path: 'wallet', element: <ConsumerWallet /> },
        { path: 'scan', element: <ConsumerScan /> },
        { path: 'history', element: <ConsumerHistory /> },
        { path: 'profile', element: <ConsumerProfile /> },
        { path: 'topup', element: <ConsumerTopUp /> },
        { path: 'merchant/:id', element: <ConsumerMerchantDetail /> },
        { path: 'offers', element: <ConsumerOffers /> },
        { path: 'coupons', element: <ConsumerCoupons /> },
        { path: 'services', element: <ConsumerServices /> },
        { path: 'payment-confirmation', element: <ConsumerPaymentConfirmation /> },
        { path: 'transaction/:id', element: <ConsumerTransactionDetail /> },
        { path: 'product-trace', element: <ConsumerProductTrace /> },
        { path: 'carbon-points', element: <ConsumerCarbonPoints /> },
        { path: 'loyalty', element: <ConsumerLoyaltyPoints /> },
        { path: 'tourist-wallet', element: <ConsumerTouristWallet /> },
        { path: 'delivery', element: <ConsumerDelivery /> },
        { path: 'donations', element: <ConsumerDonations /> },
        { path: 'merchant-map', element: <ConsumerMerchantMap /> },
      ],
    },

    // Merchant Routes
    {
      path: '/merchant/login',
      element: (
        <Layout>
          <React.Suspense fallback={<LoadingFallback />}>
            <MerchantLogin />
          </React.Suspense>
        </Layout>
      ),
    },
    {
      path: '/merchant',
      element: <MerchantLayout />,
      children: [
        { index: true, element: <MerchantDashboard /> },
        { path: 'wallet', element: <MerchantWallet /> },
        { path: 'scan', element: <MerchantScan /> },
        { path: 'payments', element: <MerchantPayments /> },
        { path: 'history', element: <MerchantHistory /> },
        { path: 'employees', element: <MerchantEmployees /> },
        { path: 'settings', element: <MerchantSettings /> },
        { path: 'notifications', element: <MerchantNotifications /> },
        { path: 'credit-score', element: <MerchantCreditScore /> },
        { path: 'welfare', element: <MerchantWelfareManagement /> },
        { path: 'delivery-orders', element: <MerchantDeliveryOrders /> },
        { path: 'settlement-calendar', element: <MerchantSettlementCalendar /> },
        { path: 'loyalty-redeem', element: <MerchantLoyaltyRedeem /> },
      ],
    },

    // Admin Routes (Web-based Dashboard)
    {
      path: '/admin/login',
      element: (
        <Layout>
          <React.Suspense fallback={<LoadingFallback />}>
            <AdminLogin />
          </React.Suspense>
        </Layout>
      ),
    },
    {
      path: '/admin',
      element: <AdminLayoutWrapper />,
      children: [
        { index: true, element: <AdminDashboard /> },
        { path: 'analytics', element: <AdminAnalytics /> },
        { path: 'users', element: <AdminUsers /> },
        { path: 'vouchers', element: <AdminVouchers /> },
        { path: 'settlements', element: <AdminSettlements /> },
        { path: 'audit', element: <AdminAuditLogs /> },
        { path: 'blockchain', element: <AdminBlockchainExplorer /> },
        { path: 'security', element: <AdminSecurity /> },
        { path: 'policies', element: <AdminPolicies /> },
        { path: 'tokens', element: <AdminTokenIssuance /> },
        { path: 'aml', element: <AdminAMLDashboard /> },
        { path: 'carbon', element: <AdminCarbonAdmin /> },
        { path: 'donations', element: <AdminDonationCampaigns /> },
        { path: 'merchant-credit', element: <AdminMerchantCreditReview /> },
        { path: 'settings', element: <AdminSettings /> },
        { path: 'fds', element: <AdminFDSDashboard /> },
        { path: 'aml-center', element: <AdminAMLCenter /> },
        { path: 'welfare', element: <AdminWelfareTracker /> },
      ],
    },

    // Debug Route (dev only)
    {
      path: '/debug',
      element: (
        <React.Suspense fallback={<LoadingFallback />}>
          <DebugDashboard />
        </React.Suspense>
      ),
    },

    // Fallback
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  {}
);
