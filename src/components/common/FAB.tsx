import React from 'react';

interface FABProps {
  icon: string;
  onClick: () => void;
  size?: 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

const FAB: React.FC<FABProps> = ({
  icon,
  onClick,
  size = 'lg',
  variant = 'primary',
  className = '',
}) => {
  const sizeStyles = {
    md: 'h-12 w-12 text-[24px]',
    lg: 'h-16 w-16 text-[32px]',
  };

  const variantStyles = {
    primary: 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105',
    secondary: 'bg-surface-highlight text-white border border-surface hover:bg-surface',
  };

  return (
    <button
      onClick={onClick}
      className={`
        rounded-full flex items-center justify-center
        active:scale-95 transition-all duration-300
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
};

export default FAB;
