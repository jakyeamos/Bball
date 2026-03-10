/**
 * client/src/components/NavBar.tsx
 * Top-level navigation bar for Court Vision.
 * Phase 1: FOUND-06
 */

import React from 'react';
import { Link } from 'react-router-dom';

export function NavBar() {
    return (
        <nav className="bg-cv-steel border-b border-cv-court/30 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
                {/* Brand */}
                <Link
                    to="/"
                    className="font-display font-bold text-lg text-cv-chalk hover:text-cv-hardwood transition-colors"
                >
                    Court Vision
                </Link>

                {/* Nav links */}
                <div className="flex items-center gap-6">
                    <Link
                        to="/#player-iq"
                        className="text-sm text-cv-chalk/80 hover:text-cv-chalk transition-colors"
                    >
                        Player IQ
                    </Link>
                    <Link
                        to="/#coach-iq"
                        className="text-sm text-cv-chalk/80 hover:text-cv-chalk transition-colors"
                    >
                        Coach IQ
                    </Link>
                    <Link
                        to="/#gm-iq"
                        className="text-sm text-cv-chalk/80 hover:text-cv-chalk transition-colors"
                    >
                        GM IQ
                    </Link>
                    <Link
                        to="/lobby"
                        className="text-sm bg-cv-accent hover:bg-orange-500 text-white font-semibold rounded-cv px-3 py-1.5 transition-colors"
                    >
                        Draft Sim
                    </Link>
                </div>
            </div>
        </nav>
    );
}
