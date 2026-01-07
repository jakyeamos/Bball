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

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/waiting-room" element={<WaitingRoomPage />} />
          <Route path="/draft" element={<DraftPage />} />
          <Route path="/draft-recap" element={<DraftRecapPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
