import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export interface SimulatorPhase {
  label: string;
  to?: string;
}

interface SimulatorShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  phases?: SimulatorPhase[];
  activePhase?: string;
}

interface SimulatorPanelProps {
  children: ReactNode;
  title?: string;
  kicker?: string;
  className?: string;
}

interface SimulatorNoticeProps {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'warning' | 'success';
}

export function SimulatorShell({
  eyebrow,
  title,
  description,
  children,
  actions,
  aside,
  phases,
  activePhase,
}: SimulatorShellProps): JSX.Element {
  return (
    <main className="cv-page min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-cv border border-cv-border bg-cv-panel/95 shadow-[var(--cv-shadow)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="p-6 sm:p-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cv-accent">
                {eyebrow}
              </p>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-cv-chalk sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-cv-chalk/72">
                {description}
              </p>
              {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
            <div className="border-t border-cv-border bg-cv-steel/60 p-6 lg:border-l lg:border-t-0">
              {aside ?? (
                <div className="flex h-full flex-col justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cv-chalk/50">
                      Live shell
                    </p>
                    <p className="mt-2 text-sm leading-6 text-cv-chalk/70">
                      Resume-safe simulator flow with Court Vision tokens and teaching context.
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-cv-accent/80" />
                </div>
              )}
            </div>
          </div>
        </section>

        {phases ? <PhaseRail phases={phases} activePhase={activePhase} /> : null}

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function SimulatorPanel({
  children,
  title,
  kicker,
  className = '',
}: SimulatorPanelProps): JSX.Element {
  return (
    <section className={`cv-surface rounded-cv p-5 ${className}`}>
      {kicker ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cv-accent">
          {kicker}
        </p>
      ) : null}
      {title ? <h2 className="mb-4 text-xl font-semibold text-cv-chalk">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SimulatorNotice({
  title,
  description,
  action,
  tone = 'neutral',
}: SimulatorNoticeProps): JSX.Element {
  const iconClass =
    tone === 'warning'
      ? 'text-amber-200'
      : tone === 'success'
        ? 'text-emerald-200'
        : 'text-cv-accent';
  const Icon =
    tone === 'warning'
      ? ExclamationTriangleIcon
      : tone === 'success'
        ? CheckCircleIcon
        : ClockIcon;

  return (
    <main className="cv-page min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex max-w-4xl px-4 py-12">
        <SimulatorPanel className="w-full">
          <Icon className={`mb-4 h-8 w-8 ${iconClass}`} />
          <h1 className="text-3xl font-semibold text-cv-chalk">{title}</h1>
          {description ? <p className="mt-3 text-sm leading-6 text-cv-chalk/70">{description}</p> : null}
          {action ? <div className="mt-6">{action}</div> : null}
        </SimulatorPanel>
      </div>
    </main>
  );
}

export function SimulatorActionLink({
  to,
  children,
  variant = 'primary',
}: {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}): JSX.Element {
  return (
    <Link
      to={to}
      className={
        variant === 'secondary'
          ? 'inline-flex items-center justify-center gap-2 rounded-cv border border-cv-border px-4 py-2 text-sm font-semibold text-cv-chalk transition-colors hover:border-cv-accent/60 hover:bg-cv-steel'
          : 'inline-flex items-center justify-center gap-2 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,107,53,0.24)] transition-colors hover:bg-orange-500'
      }
    >
      {children}
      <ArrowRightIcon className="h-4 w-4" />
    </Link>
  );
}

export function SimulatorButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,107,53,0.22)] transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function inputControlClassName(extra = ''): string {
  return `mt-1 w-full rounded-cv border border-cv-border bg-cv-navy/55 px-3 py-2 text-cv-chalk outline-none transition-colors focus:border-cv-accent ${extra}`;
}

function PhaseRail({
  phases,
  activePhase,
}: {
  phases: SimulatorPhase[];
  activePhase?: string;
}): JSX.Element {
  return (
    <nav className="overflow-x-auto rounded-cv border border-cv-border bg-cv-steel/55 p-2">
      <ol className="flex min-w-max gap-2">
        {phases.map((phase, index) => {
          const active = phase.label === activePhase;
          const content = (
            <span
              className={`inline-flex items-center gap-2 rounded-cv px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                active
                  ? 'bg-cv-accent text-white'
                  : 'text-cv-chalk/58 hover:bg-cv-court/50 hover:text-cv-chalk'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-[0.65rem]">
                {index + 1}
              </span>
              {phase.label}
            </span>
          );

          return (
            <li key={phase.label}>
              {phase.to ? <Link to={phase.to}>{content}</Link> : content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
