import React from 'react';
import { Link } from 'react-router-dom';

export function NavBar() {
  const linkClass = 'rounded-cv px-3 py-1.5 text-sm font-semibold text-cv-chalk/75 transition-colors hover:bg-cv-navy/35 hover:text-cv-chalk';

  return (
    <nav className="sticky top-0 z-50 border-b border-cv-court/20 bg-cv-steel/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="text-lg font-semibold text-cv-chalk">
          Court Vision
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Link to="/player-iq" className={linkClass}>Player IQ</Link>
          <Link to="/coach-iq" className={linkClass}>Coach IQ</Link>
          <Link to="/gm-iq" className={linkClass}>GM IQ</Link>
          <Link to="/library" className={linkClass}>Library</Link>
          <Link to="/profile" className={linkClass}>Profile</Link>
          <Link
            to="/draft-sim"
            className="whitespace-nowrap rounded-cv bg-cv-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
          >
            Draft Sim
          </Link>
        </div>
      </div>
    </nav>
  );
}
