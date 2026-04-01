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
      className={`rounded-lg border border-cv-court/20 bg-cv-steel text-cv-chalk shadow-md ${paddingStyles[padding]} ${className}`}
    >
      {title && <h3 className="text-xl font-bold mb-4 text-cv-chalk">{title}</h3>}
      {children}
    </div>
  );
}
