/**
 * Main App Component
 * Routes and layout
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LobbyPage } from './pages/LobbyPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';
import { DraftPage } from './pages/DraftPage';
import { DraftRecapPage } from './pages/DraftRecapPage';
import { ResultsPage } from './pages/ResultsPage';
import { LobbyBrowserPage } from './pages/LobbyBrowserPage';
import { CoachingDecisionsPage } from './pages/CoachingDecisionsPage';
import { QuarterCoachingPage } from './pages/QuarterCoachingPage';
import { RoundResultsPage } from './pages/RoundResultsPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/browse" element={<LobbyBrowserPage />} />
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
