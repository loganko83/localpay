import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: {
      track: 'w-8 h-5',
      thumb: 'h-3.5 w-3.5',
      translate: 'translate-x-3.5',
    },
    md: {
      track: 'w-10 h-6',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
    },
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        ${sizeStyles[size].track}
        rounded-full relative cursor-pointer transition-colors
        ${checked ? 'bg-primary' : 'bg-surface-highlight'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          ${sizeStyles[size].thumb}
          absolute top-1 left-1 bg-white rounded-full transition-transform
          ${checked ? sizeStyles[size].translate : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Toggle;
