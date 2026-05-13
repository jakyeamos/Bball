import { X } from 'lucide-react';

interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'player' | 'coach' | 'gm' | 'difficulty';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  onRemove?: () => void;
}

export function Tag({ children, variant = 'default', difficulty, onRemove }: TagProps) {
  const variants = {
    default: 'bg-muted text-foreground border-border',
    player: 'bg-[var(--player-blue)]/10 text-[var(--player-blue)] border-[var(--player-blue)]/20',
    coach: 'bg-[var(--coach-purple)]/10 text-[var(--coach-purple)] border-[var(--coach-purple)]/20',
    gm: 'bg-[var(--gm-green)]/10 text-[var(--gm-green)] border-[var(--gm-green)]/20',
    difficulty: difficulty === 'Beginner'
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : difficulty === 'Advanced'
      ? 'bg-red-500/10 text-red-500 border-red-500/20'
      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${variants[variant]}`}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface FilterTagsProps {
  tags: string[];
  activeFilters: string[];
  onToggle: (tag: string) => void;
}

export function FilterTags({ tags, activeFilters, onToggle }: FilterTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
            activeFilters.includes(tag)
              ? 'bg-[var(--basketball-orange)] text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
