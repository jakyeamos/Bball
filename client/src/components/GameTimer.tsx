import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';

export const GameTimer = () => {
    const { league, timeRemaining } = useApp();
    const location = useLocation();
    const [phaseLabel, setPhaseLabel] = useState('');

    // Only show on relevant pages
    const relevantRoutes = ['/scouting-report', '/coaching', '/quarter-coaching'];
    const isVisible = relevantRoutes.includes(location.pathname);

    useEffect(() => {
        if (!league) return;

        if (league.roundState?.phase === 'scouting') {
            setPhaseLabel('SCOUTING REPORT');
        } else if (league.roundState?.phase === 'coaching_window') {
            setPhaseLabel('COACHING DECISIONS');
        } else if (league.liveGame) {
            setPhaseLabel(`GAME - Q${league.liveGame.currentQuarter}`);
        } else {
            setPhaseLabel('');
        }
    }, [league]);

    if (!isVisible || !phaseLabel || timeRemaining === null) return null;

    const isUrgent = timeRemaining <= 10;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            <div className="bg-black/90 text-white px-4 py-2 rounded-lg shadow-2xl border border-gray-700 backdrop-blur-md flex items-center gap-3">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                        {phaseLabel}
                    </span>
                    <span className={`font-mono text-2xl font-bold leading-none ${isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                </div>
                <div className={`w-3 h-3 rounded-full ${isUrgent ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
            </div>
        </div>
    );
};
