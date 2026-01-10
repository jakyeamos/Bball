// client/src/components/Card.tsx
import React, { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  title,
  padding = 'md',
  ...rest
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      {...rest}
      className={`bg-white rounded-lg shadow-md ${paddingStyles[padding]} ${className}`}
    >
      {title && <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>}
      {children}
    </div>
  );
}
