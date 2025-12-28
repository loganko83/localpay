import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { theme } from '../../styles/theme';
import { ToastContainer } from '../common';

interface LayoutProps {
  children: React.ReactNode;
}

// Theme colors - unified dark theme
const themeColors = {
  consumer: theme.bg,
  merchant: theme.bg,
  admin: theme.bg,
  debug: theme.bg,
  default: theme.bg,
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const theme = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/merchant')) return 'merchant';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/debug')) return 'debug';
    if (path.startsWith('/consumer')) return 'consumer';
    return 'default';
  }, [location.pathname]);

  const backgroundColor = themeColors[theme];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = backgroundColor;
  }, [theme, backgroundColor]);

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{ background: '#000' }}
    >
      <div
        className="w-full max-w-md min-h-screen relative flex flex-col overflow-hidden"
        style={{ background: backgroundColor }}
      >
        {children}
        <ToastContainer />
      </div>
    </div>
  );
};

export default Layout;
