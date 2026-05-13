import { BrowserRouter, Routes, Route } from 'react-router';
import { TopNav, Sidebar } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { LearningTrack } from './pages/LearningTrack';
import { LearningLibrary } from './pages/LearningLibrary';
import { LessonDetail } from './pages/LessonDetail';
import { LessonRecap } from './pages/LessonRecap';
import { DailyChallenge } from './pages/DailyChallenge';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { DraftSimulator } from './pages/DraftSimulator';
import { OffseasonSimulator } from './pages/OffseasonSimulator';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLessons } from './pages/AdminLessons';
import { Login } from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background dark">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function MainLayout() {
  return (
    <>
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/learning" element={<LearningLibrary />} />
            <Route path="/learning/library" element={<LearningLibrary />} />
            <Route path="/learning/:lane" element={<LearningTrack />} />
            <Route path="/learning/:lane/lesson/:lessonId" element={<LessonDetail />} />
            <Route path="/learning/:lane/lesson/recap" element={<LessonRecap />} />
            <Route path="/daily-challenge" element={<DailyChallenge />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/draft-sim" element={<DraftSimulator />} />
            <Route path="/offseason-sim" element={<OffseasonSimulator />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/lessons" element={<AdminLessons />} />
          </Routes>
        </main>
      </div>
    </>
  );
}