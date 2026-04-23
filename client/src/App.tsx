/**
 * Main App Component
 * Routes and layout
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { HomePage } from './pages/HomePage';
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
import { NavBar } from './components/NavBar';
import { LessonPage } from './pages/LessonPage';
import { LibraryPage } from './pages/LibraryPage';
import { RecapPage } from './pages/RecapPage';
import { LessonDiscussionPage } from './pages/LessonDiscussionPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfilePage } from './pages/ProfilePage';
import { PlayerIqPage } from './pages/PlayerIqPage';
import { CoachIqPage } from './pages/CoachIqPage';
import { GmIqPage } from './pages/GmIqPage';
import { LoginPage } from './pages/LoginPage';
import { AccountUpgradePage } from './pages/AccountUpgradePage';
import { TeamContextPage } from './pages/offseason/TeamContextPage';
import { CoachingMarketPage } from './pages/offseason/CoachingMarketPage';
import { ScoutingPage } from './pages/offseason/ScoutingPage';
import { TradeMarketPage } from './pages/offseason/TradeMarketPage';
import { DraftNightPage } from './pages/offseason/DraftNightPage';
import { FreeAgencyPage } from './pages/offseason/FreeAgencyPage';
import { OffseasonRecapPage } from './pages/offseason/OffseasonRecapPage';
import { AdminLessonsPage } from './pages/admin/AdminLessonsPage';
import { AdminDailyChallengePage } from './pages/admin/AdminDailyChallengePage';
import { AdminTagsPage } from './pages/admin/AdminTagsPage';

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
      <BrowserRouter>
        <div className="min-h-screen bg-cv-navy">
          <NavBar />
          <DebugOverlay />
          <GameTimer />
          <GameRouting />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/player-iq" element={<PlayerIqPage />} />
            <Route path="/coach-iq" element={<CoachIqPage />} />
            <Route path="/gm-iq" element={<GmIqPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/upgrade-account" element={<AccountUpgradePage />} />
            <Route path="/offseason/team-context" element={<TeamContextPage />} />
            <Route path="/offseason/coaching-market" element={<CoachingMarketPage />} />
            <Route path="/offseason/scouting" element={<ScoutingPage />} />
            <Route path="/offseason/trade-market" element={<TradeMarketPage />} />
            <Route path="/offseason/draft-night" element={<DraftNightPage />} />
            <Route path="/offseason/free-agency" element={<FreeAgencyPage />} />
            <Route path="/offseason/recap" element={<OffseasonRecapPage />} />
            <Route path="/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/lessons/:lessonId/discussion" element={<LessonDiscussionPage />} />
            <Route path="/recaps/:recapId" element={<RecapPage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/browse" element={<LobbyBrowserPage />} />
            <Route path="/scouting-report" element={<ScoutingReportPage />} />
            <Route path="/coaching" element={<CoachingDecisionsPage />} />
            <Route path="/quarter-coaching" element={<QuarterCoachingPage />} />
            <Route path="/waiting-room" element={<WaitingRoomPage />} />
            <Route path="/draft" element={<DraftPage />} />
            <Route path="/draft-recap" element={<DraftRecapPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/round-results" element={<RoundResultsPage />} />
            <Route path="/admin/lessons" element={<AdminLessonsPage />} />
            <Route path="/admin/daily-challenge" element={<AdminDailyChallengePage />} />
            <Route path="/admin/tags" element={<AdminTagsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
