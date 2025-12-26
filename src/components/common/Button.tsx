import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
    font-semibold rounded-xl flex items-center justify-center gap-2
    transition-all duration-200 active:scale-[0.98]
  `;

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-primary to-primary-dark text-white
      shadow-lg hover:shadow-xl hover:-translate-y-0.5
    `,
    secondary: `
      bg-slate-800/80 hover:bg-slate-700/80 text-white
      border border-slate-700 hover:border-slate-600
    `,
    ghost: `
      bg-transparent hover:bg-white/5 text-slate-300 hover:text-white
    `,
    danger: `
      bg-red-500/10 hover:bg-red-500/20 text-red-400
      border border-red-500/30 hover:border-red-500/50
    `,
    glass: `
      bg-white/10 backdrop-blur-md hover:bg-white/15 text-white
      border border-white/20 hover:border-white/30
    `,
  };

  const sizeStyles = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed active:scale-100 hover:transform-none';

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? disabledStyles : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">
          progress_activity
        </span>
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

export default Button;
