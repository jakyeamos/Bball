import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';

interface RouteStateAction {
  label: string;
  to: string;
  variant?: 'primary' | 'secondary';
}

interface RouteStateNoticeProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions: RouteStateAction[];
}

export function RouteStateNotice({
  eyebrow = 'Missing session state',
  title,
  description,
  actions,
}: RouteStateNoticeProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-12">
      <Card padding="lg" className="w-full border-cv-court/30 bg-cv-steel/90">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-cv-accent">{eyebrow}</p>
        <h1 className="mb-4 text-3xl font-semibold text-cv-chalk">{title}</h1>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-cv-chalk/70">{description}</p>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={
                action.variant === 'secondary'
                  ? 'rounded-cv border border-cv-court/30 px-4 py-2 text-sm font-semibold text-cv-chalk transition-colors hover:border-cv-accent/60'
                  : 'rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500'
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
