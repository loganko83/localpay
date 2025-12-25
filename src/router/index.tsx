import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Layout, BottomNav } from '../components/layout';

// Lazy load screens for better performance
const AppSelector = React.lazy(() => import('../screens/AppSelector'));

// Consumer screens
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

// Merchant screens
const MerchantLogin = React.lazy(() => import('../screens/merchant/Login'));
const MerchantDashboard = React.lazy(() => import('../screens/merchant/Dashboard'));
const MerchantWallet = React.lazy(() => import('../screens/merchant/Wallet'));
const MerchantScan = React.lazy(() => import('../screens/merchant/Scan'));
const MerchantPayments = React.lazy(() => import('../screens/merchant/Payments'));
const MerchantEmployees = React.lazy(() => import('../screens/merchant/Employees'));
const MerchantSettings = React.lazy(() => import('../screens/merchant/Settings'));
const MerchantNotifications = React.lazy(() => import('../screens/merchant/Notifications'));

// Admin screens
const AdminLogin = React.lazy(() => import('../screens/admin/Login'));
const AdminDashboard = React.lazy(() => import('../screens/admin/Dashboard'));
const AdminUsers = React.lazy(() => import('../screens/admin/Users'));
const AdminVouchers = React.lazy(() => import('../screens/admin/Vouchers'));
const AdminSettlements = React.lazy(() => import('../screens/admin/Settlements'));
const AdminAuditLogs = React.lazy(() => import('../screens/admin/AuditLogs'));
const AdminSecurity = React.lazy(() => import('../screens/admin/Security'));
const AdminPolicies = React.lazy(() => import('../screens/admin/Policies'));

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

const AdminLayout = () => (
  <Layout>
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <React.Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </React.Suspense>
    </div>
    <BottomNav userType="admin" />
  </Layout>
);

export const router = createBrowserRouter([
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
      { path: 'employees', element: <MerchantEmployees /> },
      { path: 'settings', element: <MerchantSettings /> },
      { path: 'notifications', element: <MerchantNotifications /> },
    ],
  },

  // Admin Routes
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
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'vouchers', element: <AdminVouchers /> },
      { path: 'settlements', element: <AdminSettlements /> },
      { path: 'audit', element: <AdminAuditLogs /> },
      { path: 'security', element: <AdminSecurity /> },
      { path: 'policies', element: <AdminPolicies /> },
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
]);
