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
import { aggregateTeam } from './services/aggregation';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, cleanupOldSessions } from './managers/sessionManager';

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

    // Allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'https://bball-client.vercel.app',
    ];

    // Also allow any Vercel preview deployment
    const isVercelPreview = /^https:\/\/bball-client-.*\.vercel\.app$/.test(origin);

    if (allowedOrigins.includes(origin) || isVercelPreview) {
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

    // Step 1: Fetch player data
    console.log('📊 Fetching player data...');
    const rawPlayers = await fetchPlayerData('2025-26');
    console.log(`✅ Loaded ${rawPlayers.length} players`);

    // Step 2: Create league snapshot
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

    // Step 3: Create HTTP server
    const httpServer = http.createServer(app);

    // Step 4: Initialize Socket.io
    console.log('🔌 Initializing WebSocket server...');
    initializeSocketServer(httpServer, leagueSnapshot.players);
    console.log('✅ WebSocket server ready');

    // Step 5: Start listening
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Client URL: ${CLIENT_URL}`);
      console.log(`📡 WebSocket ready for connections`);
    });

    // Step 6: Start periodic cleanup
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
