import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const primaryNavItems = [
  { label: 'Home', path: '/', icon: 'home' },
  { label: 'Learning', path: '/library', icon: 'book' },
  { label: 'Player IQ', path: '/player-iq', icon: 'player' },
  { label: 'Coach IQ', path: '/coach-iq', icon: 'coach' },
  { label: 'GM IQ', path: '/gm-iq', icon: 'gm' },
  { label: 'Draft Simulator', path: '/draft-sim', icon: 'target' },
  { label: 'Offseason Sim', path: '/offseason/team-context', icon: 'users' },
];

const utilityNavItems = [
  { label: 'Profile', path: '/profile', icon: 'user' },
  { label: 'Admin', path: '/admin/lessons', icon: 'settings' },
];

type NavIconName = (typeof primaryNavItems[number] | typeof utilityNavItems[number])['icon'];

function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  if (itemPath.startsWith('/offseason')) return currentPath.startsWith('/offseason');
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2 text-foreground">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--basketball-orange)] to-[rgba(255,107,53,0.7)]">
        <Icon name="target" className="h-5 w-5 text-white" />
      </span>
      <span className="text-lg font-semibold">Court Vision</span>
    </Link>
  );
}

export function NavBar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <BrandMark />

        <Link
          to="/profile"
          aria-label="Profile"
          className={`rounded-lg p-2 transition-colors ${
            isActivePath(location.pathname, '/profile')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon name="user" className="h-5 w-5" />
        </Link>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-t border-cv-court px-3 py-2 md:hidden">
        {[...primaryNavItems, ...utilityNavItems].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActivePath(location.pathname, item.path)
                ? 'bg-cv-court text-cv-chalk'
                : 'text-cv-chalk/60 hover:bg-cv-court/70 hover:text-cv-chalk'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SideNav() {
  const location = useLocation();

  return (
    <aside className="sticky top-16 hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-sidebar md:block">
      <nav className="flex h-[calc(100vh-4rem)] flex-col p-4">
        <div className="space-y-1">
          {primaryNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                isActivePath(location.pathname, item.path)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-1 border-t border-border pt-4">
          {utilityNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                isActivePath(location.pathname, item.path)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function Icon({ name, className }: { name: NavIconName; className?: string }) {
  const paths: Record<NavIconName, React.ReactNode> = {
    home: <path d="M3 10.75 12 3l9 7.75V21a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1V10.75Z" />,
    book: <path d="M5 4.5h10A4 4 0 0 1 19 8.5v11H9A4 4 0 0 0 5 15.5v-11Zm0 0A4 4 0 0 1 9 8.5h10" />,
    player: <path d="M7 20c.9-3.2 2.6-4.8 5-4.8s4.1 1.6 5 4.8M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
    coach: <path d="M4 7h16M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M9 11h6M9 15h3" />,
    gm: <path d="M4 18V7l8-4 8 4v11l-8 4-8-4Zm4-9 4 2 4-2M12 11v7" />,
    target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
    users: <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5-1a3.5 3.5 0 1 0 0-7M2.5 21c.9-4 2.7-6 5.5-6s4.6 2 5.5 6M14 15.5c2.5.4 4.2 2.2 5 5.5" />,
    user: <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c1.2-4.5 3.9-6.8 8-6.8s6.8 2.3 8 6.8" />,
    settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2M4.2 7.2l1.4 1.4m12.8 6.8 1.4 1.4M2 12h2m16 0h2M4.2 16.8l1.4-1.4m12.8-6.8 1.4-1.4" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}
