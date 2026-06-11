/**
 * Main Server
 * Express + Socket.io server for NBA Draft Simulator
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { LeagueSnapshot } from '@nba-draft-sim/shared';
import { initializeSocketServer } from './managers/socketManager';
import { fetchPlayerData } from '../scripts/scraper';
import { createLeagueSnapshot } from './services/snapshot';
import lobbiesRouter from './routes/lobbies';
import lessonsRouter from './src/routes/lessons';
import progressRouter from './src/routes/progress';
import contentLibraryRouter from './src/routes/contentLibrary';
import recommendationsRouter from './src/routes/recommendations';
import discussionRouter from './src/routes/discussion';
import recapsRouter from './src/routes/recaps';
import dailyChallengeRouter from './src/routes/dailyChallenge';
import leaderboardRouter from './src/routes/leaderboard';
import friendsRouter from './src/routes/friends';
import profileRouter from './src/routes/profile';
import draftTeachingRouter from './src/routes/draftTeaching';
import offseasonRunsRouter from './src/routes/offseasonRuns';
import frontOfficeTransactionsRouter from './src/routes/frontOfficeTransactions';
import adminLessonsRouter from './src/routes/adminLessons';
import adminDailyChallengeRouter from './src/routes/adminDailyChallenge';
import adminTagsRouter from './src/routes/adminTags';
import accountUpgradeRouter from './src/routes/internal/accountUpgrade';
import { aggregateTeam } from './services/aggregation';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, cleanupOldSessions } from './managers/sessionManager';
import { validateSupabaseAdminEnv } from './src/lib/supabaseAdmin';
import { getNbaDataCache } from './services/dataCache';
import { isAllowedCorsOrigin } from './utils/corsOrigins';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Global league snapshot
 * Created once on server startup
 */
let leagueSnapshot: LeagueSnapshot | null = null;

/**
 * Initialize Express app
 */
const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    if (isAllowedCorsOrigin(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api', lobbiesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/library', contentLibraryRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/discussion', discussionRouter);
app.use('/api/recaps', recapsRouter);
app.use('/api/daily-challenge', dailyChallengeRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/draft-teaching', draftTeachingRouter);
app.use('/api/offseason/runs', offseasonRunsRouter);
app.use('/api/front-office/transactions', frontOfficeTransactionsRouter);
app.use('/api/admin/lessons', adminLessonsRouter);
app.use('/api/admin/daily-challenge', adminDailyChallengeRouter);
app.use('/api/admin/tags', adminTagsRouter);
app.use('/internal', accountUpgradeRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get league snapshot endpoint
app.get('/api/snapshot', (req, res) => {
  if (!leagueSnapshot) {
    return res.status(503).json({ error: 'League snapshot not ready' });
  }

  res.json({ snapshot: leagueSnapshot });
});

// Get all available players
app.get('/api/players', (req, res) => {
  if (!leagueSnapshot) {
    return res.status(503).json({ error: 'League snapshot not ready' });
  }

  res.json({ players: leagueSnapshot.players });
});

// Aggregate team data
app.post('/api/team/aggregate', (req, res) => {
  const { playerIds, teamId } = req.body;

  if (!leagueSnapshot) {
    return res.status(503).json({ error: 'League snapshot not ready' });
  }
  if (!playerIds || !Array.isArray(playerIds) || !teamId) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const players = leagueSnapshot.players.filter((p) =>
    playerIds.includes(p.playerId)
  );

  if (players.length !== playerIds.length) {
    return res.status(404).json({ error: 'One or more players not found' });
  }

  const aggregation = aggregateTeam(players, teamId);
  res.json(aggregation);
});

// Session endpoint (creates/retrieves session)
app.post('/api/session', (req, res) => {
  const { displayName } = req.body;
  const existingUserId = req.cookies[SESSION_COOKIE_NAME];

  // This will be handled by Socket.io middleware
  // Just set a temporary cookie here
  const userId = existingUserId || `temp_${Date.now()}`;

  res.cookie(SESSION_COOKIE_NAME, userId, SESSION_COOKIE_OPTIONS);
  res.json({ userId, displayName: displayName || 'Player' });
});

/**
 * Initialize server
 */
async function startServer() {
  try {
    console.log('🚀 Starting NBA Draft Simulator server...');

    // Step 1: Supabase is optional for local-first phases 4-8. Keep prior behavior
    // when configured, but allow the app to run in guest/local mode otherwise.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      validateSupabaseAdminEnv();
      console.log('[supabaseAdmin] Supabase admin client environment validated');
    } else {
      console.warn('[supabaseAdmin] Missing Supabase admin env; starting in local-first persistence mode');
    }

    // Warm NBA identity cache from disk (non-blocking; no stats.nba.com on request path)
    void getNbaDataCache()
      .warmUp()
      .catch((err) => console.error('[dataCache] warm-up failed', err));

    // Step 2: Fetch player data
    console.log('📊 Fetching player data...');
    const rawPlayers = await fetchPlayerData('2025-26');
    console.log(`✅ Loaded ${rawPlayers.length} players`);

    // Step 3: Create league snapshot
    console.log('📸 Creating league snapshot...');
    leagueSnapshot = await createLeagueSnapshot(rawPlayers, '2025-26');
    console.log(`✅ Snapshot created with ${leagueSnapshot.players.length} players`);

    if (leagueSnapshot.players.length > 0) {
      console.log('=== SAMPLE PLAYER POSITIONS ===');
      for (let i = 0; i < 5; i++) {
        const player = leagueSnapshot.players[i];
        console.log(`Player: ${player.name}, Position: ${player.position}`);
      }
    }

    // Step 4: Create HTTP server
    const httpServer = http.createServer(app);

    // Step 5: Initialize Socket.io
    console.log('🔌 Initializing WebSocket server...');
    initializeSocketServer(httpServer, leagueSnapshot.players);
    console.log('✅ WebSocket server ready');

    // Step 6: Start listening
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Client URL: ${CLIENT_URL}`);
      console.log(`📡 WebSocket ready for connections`);
    });

    // Step 7: Start periodic cleanup
    setInterval(() => {
      const deleted = cleanupOldSessions();
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} old sessions`);
      }
    }, 60 * 60 * 1000); // Every hour

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, leagueSnapshot };
