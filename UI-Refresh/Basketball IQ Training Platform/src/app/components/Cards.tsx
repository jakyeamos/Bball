import { ReactNode } from 'react';
import { ArrowRight, Clock, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-6 transition-all hover:border-muted-foreground/30 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface IQCardProps {
  type: 'player' | 'coach' | 'gm';
  progress: number;
  nextLesson?: string;
  link: string;
}

export function IQCard({ type, progress, nextLesson, link }: IQCardProps) {
  const config = {
    player: {
      title: 'Player IQ',
      subtitle: 'On-court reads & execution',
      color: 'var(--player-blue)',
      gradient: 'from-[var(--player-blue)]/20 to-transparent'
    },
    coach: {
      title: 'Coach IQ',
      subtitle: 'Schemes & adjustments',
      color: 'var(--coach-purple)',
      gradient: 'from-[var(--coach-purple)]/20 to-transparent'
    },
    gm: {
      title: 'GM IQ',
      subtitle: 'Roster building & strategy',
      color: 'var(--gm-green)',
      gradient: 'from-[var(--gm-green)]/20 to-transparent'
    }
  };

  const { title, subtitle, color, gradient } = config[type];

  return (
    <Link to={link}>
      <Card className={`bg-gradient-to-br ${gradient} cursor-pointer hover:scale-[1.02]`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl mb-1" style={{ color }}>{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-2xl opacity-80" style={{ color }}>{Math.round(progress)}%</div>
        </div>

        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {nextLesson && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next: {nextLesson}</span>
            <ArrowRight className="w-4 h-4" style={{ color }} />
          </div>
        )}
      </Card>
    </Link>
  );
}

interface LessonCardProps {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  completed?: boolean;
  locked?: boolean;
  tags?: string[];
  onClick?: () => void;
}

export function LessonCard({ title, difficulty, duration, completed, locked, tags, onClick }: LessonCardProps) {
  const difficultyColors = {
    'Beginner': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Intermediate': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Advanced': 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  return (
    <Card className={`cursor-pointer ${locked ? 'opacity-50' : ''}`} onClick={locked ? undefined : onClick}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="flex-1">{title}</h4>
        {completed && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs border ${difficultyColors[difficulty]}`}>
          {difficulty}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {duration}
        </span>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-muted text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

interface ChallengeCardProps {
  title: string;
  description: string;
  status: 'available' | 'completed' | 'locked';
  streak?: number;
}

export function ChallengeCard({ title, description, status, streak }: ChallengeCardProps) {
  return (
    <Card className={status === 'locked' ? 'opacity-50' : 'cursor-pointer hover:scale-[1.01]'}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3>{title}</h3>
            {status === 'completed' && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {streak !== undefined && streak > 0 && (
          <div className="flex items-center gap-1 text-[var(--basketball-orange)]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">{streak} day streak</span>
          </div>
        )}
      </div>

      {status === 'available' && (
        <button className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Start Challenge
        </button>
      )}

      {status === 'completed' && (
        <div className="mt-4 text-sm text-muted-foreground">
          Completed today
        </div>
      )}
    </Card>
  );
}

interface ProspectCardProps {
  name: string;
  position: string;
  college: string;
  attributes: {
    overall: number;
    offense: number;
    defense: number;
    potential: number;
  };
  uncertainty?: boolean;
}

export function ProspectCard({ name, position, college, attributes, uncertainty }: ProspectCardProps) {
  return (
    <Card className="cursor-pointer hover:scale-[1.01]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4>{name}</h4>
          <p className="text-sm text-muted-foreground">{position} • {college}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl" style={{ color: 'var(--basketball-orange)' }}>
            {attributes.overall}
          </div>
          <div className="text-xs text-muted-foreground">OVR</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Offense</span>
          <span>{attributes.offense}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Defense</span>
          <span>{attributes.defense}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Potential</span>
          <span className="text-[var(--gm-green)]">{attributes.potential}</span>
        </div>
      </div>

      {uncertainty && (
        <div className="mt-3 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 text-xs rounded border border-yellow-500/20">
          High uncertainty - scout more
        </div>
      )}
    </Card>
  );
}
