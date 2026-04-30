import React from 'react';
import { useApp } from '../context/AppContext';

export const DebugOverlay = () => {
    const { league, timeRemaining, isConnected } = useApp();

    if (!window.location.search.includes('debug')) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs z-[9999] pointer-events-none border border-green-500/30 shadow-2xl backdrop-blur-sm min-w-[200px]">
            <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-1">
                <span className="font-bold">DEBUG INFO</span>
                <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                    {isConnected ? '●' : '○'}
                </span>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-400">Time:</span>
                    <span className="font-bold">{timeRemaining ?? 'null'}s</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-400">Phase:</span>
                    <span>{league?.phase ?? 'N/A'}</span>
                </div>

                {league?.roundState && (
                    <div className="flex justify-between">
                        <span className="text-gray-400">Round:</span>
                        <span>{league.roundState.phase}</span>
                    </div>
                )}

                {league?.liveGame && (
                    <div className="mt-2 pt-2 border-t border-green-500/30">
                        <div className="text-green-300 font-bold mb-1">LIVE GAME</div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">State:</span>
                            <span>{league.liveGame.phase}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Qtr:</span>
                            <span>{league.liveGame.currentQuarter}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
