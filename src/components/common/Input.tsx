import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconClick,
  className = '',
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary text-[20px]">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`
            w-full h-12 bg-surface border border-surface-highlight rounded-xl
            text-white placeholder-text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-all
            ${icon ? 'pl-12' : 'pl-4'}
            ${rightIcon || isPassword ? 'pr-12' : 'pr-4'}
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {(rightIcon || isPassword) && (
          <button
            type="button"
            onClick={() => {
              if (isPassword) {
                setShowPassword(!showPassword);
              } else if (onRightIconClick) {
                onRightIconClick();
              }
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPassword
                ? showPassword
                  ? 'visibility_off'
                  : 'visibility'
                : rightIcon}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;
