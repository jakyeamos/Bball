/**
 * Button Component
 * Dumb UI component for buttons
 */

import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cv-navy';

  const variantStyles = {
    primary: 'bg-cv-accent text-white shadow-[0_12px_28px_rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:bg-orange-500 focus:ring-cv-accent disabled:bg-cv-accent/50',
    secondary: 'cv-chip text-cv-chalk hover:border-cv-accent/35 hover:bg-cv-steel focus:ring-cv-court disabled:bg-cv-steel/60',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    ghost: 'bg-transparent text-cv-chalk/70 hover:bg-cv-steel/70 hover:text-cv-chalk focus:ring-cv-court',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  const disabledStyles = disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
