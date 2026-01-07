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
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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
      const samplePlayer = leagueSnapshot.players[0];
      console.log('=== SAMPLE PLAYER DEBUG ===');
      console.log('Name:', samplePlayer.name);
      console.log('Raw stats (MP/GP):', samplePlayer.rawStats.MP_TOTAL, samplePlayer.rawStats.GP);
      console.log('Features:', samplePlayer.features);
      console.log('Archetypes:', samplePlayer.archetypes);
      console.log('Archetype keys:', Object.keys(samplePlayer.archetypes));
      console.log('Archetype values:', Object.values(samplePlayer.archetypes));
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
