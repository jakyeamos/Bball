/**
 * client/src/pages/HomePage.tsx
 * Court Vision homepage with three role-lens lanes.
 * Phase 1: FOUND-05
 * Phase 02-03: Lesson list query integrated for GM IQ lane (pilot).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useLessons } from '../features/learning/queries';

export function HomePage() {
    // Query all lessons — used to surface recent or featured lessons per lens.
    // Empty/error states gracefully fall back to the static "Coming Soon" copy.
    const { data: lessons } = useLessons();

    // Pick up to 3 lessons per lens for the lane preview
    const playerLessons = lessons?.filter((l) => l.role_lens === 'player').slice(0, 3) ?? [];
    const coachLessons  = lessons?.filter((l) => l.role_lens === 'coach').slice(0, 3) ?? [];
    const gmLessons     = lessons?.filter((l) => l.role_lens === 'gm').slice(0, 3) ?? [];

    return (
        <div className="min-h-screen bg-cv-navy">
            {/* Hero */}
            <div className="text-center px-4 py-16 lg:py-24">
                <h1 className="font-display text-4xl lg:text-6xl font-bold text-cv-chalk mb-4 tracking-tight">
                    Court Vision
                </h1>
                <p className="text-cv-chalk/70 text-lg lg:text-xl max-w-xl mx-auto">
                    Improve your basketball IQ.
                </p>
            </div>

            {/* Three role-lens lanes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 pb-20">

                {/* Player IQ */}
                <div
                    id="player-iq"
                    className="bg-cv-steel border border-cv-court/30 rounded-cv p-6 lg:p-8 hover:border-cv-court transition-colors flex flex-col"
                >
                    <div className="mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-cv-accent">
                            Player IQ
                        </span>
                    </div>
                    <h2 className="text-cv-chalk text-xl font-semibold mb-3">
                        Read the Game Like a Pro
                    </h2>
                    <p className="text-cv-chalk/60 text-sm leading-relaxed mb-4">
                        Learn spacing, off-ball movement, and shot selection. Understand
                        what the best players see on the floor before the play develops.
                    </p>
                    {playerLessons.length > 0 && (
                        <ul className="space-y-2 mb-6">
                            {playerLessons.map((lesson) => (
                                <li key={lesson.id}>
                                    <Link
                                        to={`/lessons/${lesson.id}`}
                                        className="block text-cv-chalk/80 hover:text-cv-chalk text-sm truncate hover:underline"
                                    >
                                        {lesson.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-auto">
                        <a
                            href="#player-iq"
                            className="inline-block bg-cv-accent hover:bg-orange-500 text-white text-sm font-semibold rounded-cv px-4 py-2 transition-colors"
                        >
                            Coming Soon
                        </a>
                    </div>
                </div>

                {/* Coach IQ */}
                <div
                    id="coach-iq"
                    className="bg-cv-steel border border-cv-court/30 rounded-cv p-6 lg:p-8 hover:border-cv-court transition-colors flex flex-col"
                >
                    <div className="mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-cv-accent">
                            Coach IQ
                        </span>
                    </div>
                    <h2 className="text-cv-chalk text-xl font-semibold mb-3">
                        Think Like a Head Coach
                    </h2>
                    <p className="text-cv-chalk/60 text-sm leading-relaxed mb-4">
                        Understand rotations, clock management, and in-game adjustments.
                        Learn why the best coaches make the decisions they do.
                    </p>
                    {coachLessons.length > 0 && (
                        <ul className="space-y-2 mb-6">
                            {coachLessons.map((lesson) => (
                                <li key={lesson.id}>
                                    <Link
                                        to={`/lessons/${lesson.id}`}
                                        className="block text-cv-chalk/80 hover:text-cv-chalk text-sm truncate hover:underline"
                                    >
                                        {lesson.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-auto">
                        <a
                            href="#coach-iq"
                            className="inline-block bg-cv-accent hover:bg-orange-500 text-white text-sm font-semibold rounded-cv px-4 py-2 transition-colors"
                        >
                            Coming Soon
                        </a>
                    </div>
                </div>

                {/* GM IQ */}
                <div
                    id="gm-iq"
                    className="bg-cv-steel border border-cv-court/30 rounded-cv p-6 lg:p-8 hover:border-cv-court transition-colors flex flex-col"
                >
                    <div className="mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-cv-accent">
                            GM IQ
                        </span>
                    </div>
                    <h2 className="text-cv-chalk text-xl font-semibold mb-3">
                        Build a Championship Roster
                    </h2>
                    <p className="text-cv-chalk/60 text-sm leading-relaxed mb-4">
                        Evaluate trades, draft prospects, and think long-term. The decisions
                        front offices face are harder than they look.
                    </p>
                    {gmLessons.length > 0 && (
                        <ul className="space-y-2 mb-6">
                            {gmLessons.map((lesson) => (
                                <li key={lesson.id}>
                                    <Link
                                        to={`/lessons/${lesson.id}`}
                                        className="block text-cv-chalk/80 hover:text-cv-chalk text-sm truncate hover:underline"
                                    >
                                        {lesson.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-auto flex gap-3 flex-wrap">
                        <Link
                            to="/lobby"
                            className="inline-block bg-cv-accent hover:bg-orange-500 text-white text-sm font-semibold rounded-cv px-4 py-2 transition-colors"
                        >
                            Enter Draft Sim →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
