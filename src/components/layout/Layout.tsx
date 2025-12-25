import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex justify-center bg-black">
      <div className="w-full max-w-md bg-background min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout;
