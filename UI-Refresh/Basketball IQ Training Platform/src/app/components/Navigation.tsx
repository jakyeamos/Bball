import { Home, BookOpen, Trophy, User, Target, Users, Calendar, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function TopNav() {
  return (
    <div className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--basketball-orange)] to-[var(--basketball-orange)]/70 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Court Vision</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: BookOpen, label: 'Learning', path: '/learning' },
    { icon: Trophy, label: 'Daily Challenge', path: '/daily-challenge' },
    { icon: Target, label: 'Draft Simulator', path: '/draft-sim' },
    { icon: Users, label: 'Offseason Sim', path: '/offseason-sim' },
    { icon: Calendar, label: 'Leaderboard', path: '/leaderboard' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 border-r border-border bg-sidebar min-h-screen sticky top-16">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="pt-6 mt-6 border-t border-border">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
