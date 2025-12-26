import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-primary/20 text-primary',
    warning: 'bg-yellow-500/20 text-yellow-500',
    error: 'bg-red-500/20 text-red-500',
    danger: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500',
    default: 'bg-surface-highlight text-text-secondary',
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-surface-highlight text-text-secondary',
  };

  const dotColors = {
    success: 'bg-primary',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    default: 'bg-text-secondary',
    primary: 'bg-primary',
    secondary: 'bg-text-secondary',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  if (dot) {
    return (
      <span className={`h-2 w-2 rounded-full ${dotColors[variant]}`} />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
