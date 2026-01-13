import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Player } from '@nba-draft-sim/shared';

export function ScoutingReportPage() {
    const { league, timeRemaining } = useApp();
    const navigate = useNavigate();
    const [scoutingReport, setScoutingReport] = useState<any>(null);

    // Auto-route if phase changes
    useEffect(() => {
        if (league?.roundState?.phase === 'coaching_window') {
            navigate('/coaching');
        }
    }, [league?.roundState?.phase, navigate]);

    // Use the liveGame or roundState scouting report
    useEffect(() => {
        if (league?.liveGame?.scoutingReport) {
            setScoutingReport(league.liveGame.scoutingReport);
        } /* else if (league?.scoutingReports) {
            // Find relevant report - logic simplified for specific user if needed
            // For now, grabbing first available or specific if we can identify user match
            const reports = Object.values(league.scoutingReports);
            if (reports.length > 0) setScoutingReport(reports[0]);
        } */
    }, [league]);

    if (!scoutingReport) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Preparing Scouting Report...</h2>
                    <div className="animate-spin text-4xl">📊</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 overflow-hidden h-screen flex flex-col">
            {/* Header */}
            <div className="mb-6 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Scouting Report</h1>
                    <p className="text-gray-600 mt-1">
                        Analyzing matchup: {scoutingReport.teamAName} vs {scoutingReport.teamBName}
                    </p>
                </div>
            </div>

            {/* Main Content - HORIZONTAL LAYOUT */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 flex-1">

                {/* LEFT PANEL (65%): Deep Analysis */}
                <div className="lg:w-[65%] flex flex-col gap-4 overflow-y-auto">

                    {/* Matchup Style */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 shrink-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Matchup Dynamics</h3>
                        <p className="text-gray-700 italic text-lg text-center">"{scoutingReport.styleClash}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        {/* Team A */}
                        <Card className="h-full">
                            <h3 className="font-bold text-xl mb-4 border-b pb-2">{scoutingReport.teamAName}</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide">Strengths</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                                        {scoutingReport.teamAStrengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-red-700 uppercase tracking-wide">Weaknesses</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                                        {scoutingReport.teamAWeaknesses?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide">Tendencies</h4>
                                    <p className="text-sm text-gray-600 mt-1">{scoutingReport.teamACoachingTendencies}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Team B */}
                        <Card className="h-full">
                            <h3 className="font-bold text-xl mb-4 border-b pb-2">{scoutingReport.teamBName}</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide">Strengths</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                                        {scoutingReport.teamBStrengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-red-700 uppercase tracking-wide">Weaknesses</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                                        {scoutingReport.teamBWeaknesses?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide">Tendencies</h4>
                                    <p className="text-sm text-gray-600 mt-1">{scoutingReport.teamBCoachingTendencies}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* RIGHT PANEL (35%): Key Players & Prediction */}
                <div className="lg:w-[35%] flex flex-col gap-4 overflow-y-auto">
                    <Card>
                        <h3 className="font-bold text-gray-900 mb-4">🔑 Key Players</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{scoutingReport.teamAName}</h4>
                                <div className="space-y-2">
                                    {scoutingReport.teamAKeyPlayers?.map((p: any, i: number) => (
                                        <div key={i} className="bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className="text-xs text-orange-600">{p.threat}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{scoutingReport.teamBName}</h4>
                                <div className="space-y-2">
                                    {scoutingReport.teamBKeyPlayers?.map((p: any, i: number) => (
                                        <div key={i} className="bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className="text-xs text-orange-600">{p.threat}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                        <h3 className="font-bold text-blue-900 mb-2">Prediction</h3>
                        <p className="text-blue-800 italic text-sm">{scoutingReport.prediction}</p>
                    </Card>

                    <div className="mt-auto p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 text-center font-bold">
                            Next: Coaching Decisions ({Math.max(0, timeRemaining || 0)}s)
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
