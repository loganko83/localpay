import React from 'react';

interface CardProps {
  variant?: 'default' | 'balance' | 'transaction' | 'stat';
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
  const baseStyles = 'rounded-2xl border border-surface-highlight';

  const variantStyles = {
    default: 'bg-surface',
    balance: 'bg-surface relative overflow-hidden',
    transaction: 'bg-surface hover:bg-surface-highlight cursor-pointer',
    stat: 'bg-surface',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {variant === 'balance' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      )}
      <div className={variant === 'balance' ? 'relative z-10' : ''}>
        {children}
      </div>
    </div>
  );
};

export default Card;
