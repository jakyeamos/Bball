/**
 * Main App Component
 * Routes and layout
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LobbyPage } from './pages/LobbyPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';
import { DraftPage } from './pages/DraftPage';
import { DraftRecapPage } from './pages/DraftRecapPage';
import { ResultsPage } from './pages/ResultsPage';
import { LobbyBrowserPage } from './pages/LobbyBrowserPage';
import { CoachingDecisionsPage } from './pages/CoachingDecisionsPage';
import { QuarterCoachingPage } from './pages/QuarterCoachingPage';
import { RoundResultsPage } from './pages/RoundResultsPage';
import { DebugOverlay } from './components/DebugOverlay';
import { GameTimer } from './components/GameTimer';
import { ScoutingReportPage } from './pages/ScoutingReportPage';

const GameRouting = () => {
  const { league } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!league) return;

    // Debug logging
    console.log('[RoutingDebug] Sync Check:', {
      path: location.pathname,
      leaguePhase: league.phase,
      roundPhase: league.roundState?.phase,
      liveGamePhase: league.liveGame?.phase,
      liveGameId: league.liveGame?.gameId,
      timestamp: new Date().toISOString()
    });

    // 0. Scouting Phase -> Go to Scouting Page
    if (league.roundState?.phase === 'scouting' && !league.liveGame) {
      if (location.pathname !== '/scouting-report') {
        console.log('🔄 [RoutingDebug] SCOUTING PHASE FOUND -> Redirecting to /scouting-report');
        navigate('/scouting-report');
      }
    }

    // 1. Live Game Active -> Go to Quarter Coaching
    else if (league.liveGame && league.liveGame.phase !== 'final') {
      if (location.pathname !== '/quarter-coaching') {
        console.log('🔄 [RoutingDebug] LIVE GAME FOUND -> Redirecting to /quarter-coaching');
        navigate('/quarter-coaching');
      }
    }

    // 2. Coaching Window Active (Pre-Game) -> Go to Coaching Dashboard
    else if (league.roundState?.phase === 'coaching_window' && !league.liveGame) {
      if (location.pathname !== '/coaching') {
        console.log('🔄 [RoutingDebug] COACHING WINDOW FOUND -> Redirecting to /coaching');
        navigate('/coaching');
      }
    }
  }, [league, navigate, location.pathname]);

  return null;
};

function App() {
  return (
    <AppProvider>
      <DebugOverlay />
      <GameTimer />
      <BrowserRouter>
        <GameRouting />
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/browse" element={<LobbyBrowserPage />} />
          <Route path="/scouting-report" element={<ScoutingReportPage />} />
          <Route path="/coaching" element={<CoachingDecisionsPage />} />
          <Route path="/quarter-coaching" element={<QuarterCoachingPage />} />
          <Route path="/waiting-room" element={<WaitingRoomPage />} />
          <Route path="/draft" element={<DraftPage />} />
          <Route path="/draft-recap" element={<DraftRecapPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/round-results" element={<RoundResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
