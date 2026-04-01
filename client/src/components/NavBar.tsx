import React from 'react';
import { Link } from 'react-router-dom';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-cv-court/20 bg-cv-steel/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-semibold text-cv-chalk">
          Court Vision
        </Link>

        <div className="hidden items-center gap-5 text-sm text-cv-chalk/75 lg:flex">
          <Link to="/player-iq" className="hover:text-cv-chalk">Player IQ</Link>
          <Link to="/coach-iq" className="hover:text-cv-chalk">Coach IQ</Link>
          <Link to="/gm-iq" className="hover:text-cv-chalk">GM IQ</Link>
          <Link to="/library" className="hover:text-cv-chalk">Library</Link>
          <Link to="/profile" className="hover:text-cv-chalk">Profile</Link>
          <Link
            to="/draft"
            className="rounded-cv bg-cv-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            Draft Sim
          </Link>
        </div>
      </div>
    </nav>
  );
}
