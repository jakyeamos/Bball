import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button'
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
    outline: 'border border-border bg-transparent hover:bg-accent',
    ghost: 'bg-transparent hover:bg-accent',
    danger: 'bg-destructive text-destructive-foreground hover:opacity-90'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

interface DecisionButtonProps {
  label: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function DecisionButton({ label, description, selected, onClick }: DecisionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-[var(--basketball-orange)] bg-[var(--basketball-orange)]/10'
          : 'border-border hover:border-muted-foreground/30 bg-card'
      }`}
    >
      <div className="font-medium mb-1">{label}</div>
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
    </button>
  );
}
