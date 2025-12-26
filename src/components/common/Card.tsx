import React from 'react';

interface CardProps {
  variant?: 'default' | 'glass' | 'gradient' | 'outline' | 'stat' | 'transaction' | 'balance';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  children,
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const variantStyles = {
    default: `
      bg-slate-800/60 backdrop-blur-sm
      border border-slate-700/50
    `,
    glass: `
      bg-white/5 backdrop-blur-lg
      border border-white/10
    `,
    gradient: `
      bg-gradient-to-br from-slate-800 to-slate-900
      border border-slate-700/50
    `,
    outline: `
      bg-transparent
      border border-slate-700 hover:border-slate-600
    `,
    stat: `
      bg-slate-800/60 backdrop-blur-sm
      border border-slate-700/50
    `,
    transaction: `
      bg-slate-800/60 backdrop-blur-sm
      border border-slate-700/50
    `,
    balance: `
      bg-slate-800/60 backdrop-blur-sm
      border border-slate-700/50
    `,
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const clickableStyles = onClick
    ? 'cursor-pointer hover:bg-white/5 active:scale-[0.99]'
    : '';

  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${clickableStyles}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
