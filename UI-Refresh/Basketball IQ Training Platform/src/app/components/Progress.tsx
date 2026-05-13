import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({ progress, color = 'var(--basketball-orange)', showLabel = true }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="text-sm text-muted-foreground text-right">
          {Math.round(progress)}% complete
        </div>
      )}
    </div>
  );
}

interface SkillMapNodeProps {
  title: string;
  status: 'completed' | 'available' | 'locked';
  onClick?: () => void;
}

export function SkillMapNode({ title, status, onClick }: SkillMapNodeProps) {
  const icons = {
    completed: <CheckCircle2 className="w-6 h-6 text-green-500" />,
    available: <Circle className="w-6 h-6 text-[var(--basketball-orange)]" />,
    locked: <Lock className="w-6 h-6 text-muted-foreground" />
  };

  const styles = {
    completed: 'bg-green-500/10 border-green-500/30 text-foreground',
    available: 'bg-[var(--basketball-orange)]/10 border-[var(--basketball-orange)]/30 text-foreground cursor-pointer hover:scale-105',
    locked: 'bg-muted/50 border-muted text-muted-foreground'
  };

  return (
    <div
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${styles[status]}`}
      onClick={status === 'available' ? onClick : undefined}
    >
      {icons[status]}
      <span className="text-sm text-center max-w-[120px]">{title}</span>
    </div>
  );
}

interface SkillMapProps {
  nodes: Array<{
    id: string;
    title: string;
    status: 'completed' | 'available' | 'locked';
  }>;
  onNodeClick?: (id: string) => void;
}

export function SkillMap({ nodes, onNodeClick }: SkillMapProps) {
  return (
    <div className="relative py-8">
      <div className="flex items-start justify-between gap-8">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col items-center relative">
            <SkillMapNode
              title={node.title}
              status={node.status}
              onClick={() => onNodeClick?.(node.id)}
            />
            {index < nodes.length - 1 && (
              <div className="absolute left-full top-12 w-8 h-0.5 bg-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatsDisplayProps {
  stats: Array<{
    label: string;
    value: number | string;
    color?: string;
  }>;
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
          <div
            className="text-3xl mb-1"
            style={{ color: stat.color || 'var(--basketball-orange)' }}
          >
            {stat.value}
          </div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
