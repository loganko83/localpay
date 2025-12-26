import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  transparent?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onClick: () => void;
    badge?: boolean;
  };
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  transparent = false,
  onBack,
  rightAction,
  children,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`
        sticky top-0 z-20 px-4 py-4 flex items-center justify-between
        ${transparent
          ? 'bg-transparent'
          : 'bg-background/80 backdrop-blur-md border-b border-surface'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center text-white hover:bg-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {title && (
          <h1 className="text-lg font-bold text-white">{title}</h1>
        )}
        {children}
      </div>

      {rightAction && (
        <button
          onClick={rightAction.onClick}
          className="relative p-2 rounded-full hover:bg-surface transition-colors"
        >
          <span className="material-symbols-outlined text-white">
            {rightAction.icon}
          </span>
          {rightAction.badge && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-background" />
          )}
        </button>
      )}
    </header>
  );
};

export default Header;
