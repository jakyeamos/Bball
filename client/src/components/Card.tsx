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
      className={`rounded-xl border border-border bg-card text-card-foreground transition-all hover:border-muted-foreground/30 ${paddingStyles[padding]} ${className}`}
    >
      {title && <h3 className="mb-4 text-xl font-bold text-card-foreground">{title}</h3>}
      {children}
    </div>
  );
}
