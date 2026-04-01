/**
 * Input Component
 * Dumb UI component for text inputs
 */

import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  fullWidth = false,
  className = '',
  ...props
}: InputProps) {
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={`${widthStyles}`}>
      {label && (
        <label className="block text-sm font-medium text-cv-chalk mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          px-3 py-2 border border-cv-court/20 rounded-lg bg-cv-navy/40 text-cv-chalk
          focus:outline-none focus:ring-2 focus:ring-cv-accent focus:border-transparent
          disabled:bg-cv-steel/60 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${widthStyles}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
