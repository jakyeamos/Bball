import React, { ReactNode } from 'react';
import {
  SimulatorActionLink,
  SimulatorNotice,
  SimulatorPhase,
  SimulatorShell,
} from '../../components/sim/SimulatorShell';

const OFFSEASON_PHASES: SimulatorPhase[] = [
  { label: 'Team Context', to: '/offseason/team-context' },
  { label: 'Coaching Market', to: '/offseason/coaching-market' },
  { label: 'Scouting', to: '/offseason/scouting' },
  { label: 'Trade Market', to: '/offseason/trade-market' },
  { label: 'Draft Night', to: '/offseason/draft-night' },
  { label: 'Free Agency', to: '/offseason/free-agency' },
  { label: 'Recap', to: '/offseason/recap' },
];

interface OffseasonShellProps {
  title: string;
  description: string;
  activePhase: string;
  children: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}

interface OffseasonNoticeProps {
  title: string;
  description?: string;
  actionTo: string;
  actionLabel: string;
  tone?: 'neutral' | 'warning' | 'success';
}

export function OffseasonShell({
  title,
  description,
  activePhase,
  children,
  actions,
  aside,
}: OffseasonShellProps): JSX.Element {
  return (
    <SimulatorShell
      eyebrow="Offseason Simulator"
      title={title}
      description={description}
      actions={actions}
      aside={aside}
      phases={OFFSEASON_PHASES}
      activePhase={activePhase}
    >
      {children}
    </SimulatorShell>
  );
}

export function OffseasonNotice({
  title,
  description,
  actionTo,
  actionLabel,
  tone = 'neutral',
}: OffseasonNoticeProps): JSX.Element {
  return (
    <SimulatorNotice
      title={title}
      description={description}
      tone={tone}
      action={<SimulatorActionLink to={actionTo}>{actionLabel}</SimulatorActionLink>}
    />
  );
}
