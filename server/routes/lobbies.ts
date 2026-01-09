/**
 * server/routes/lobbies.ts
 * Phase 1A: Public lobbies API endpoint
 */

import { Router } from 'express';
import { PublicLobbyInfo } from '@nba-draft-sim/shared';
import { lobbies } from '../services/handlers';

const router = Router();

/**
 * GET /api/lobbies
 * Returns all public lobbies that are still in waiting room (not started)
 */
router.get('/lobbies', (req, res) => {
  try {
    const publicLobbies: PublicLobbyInfo[] = [];

    for (const [lobbyId, lobby] of lobbies.entries()) {
      // Only include public lobbies that haven't started drafting yet
      if (lobby.isPublic && !lobby.draftStarted) {
        publicLobbies.push({
          lobbyId: lobby.lobbyId,
          inviteCode: lobby.inviteCode,
          commissionerName: lobby.users.find(u => u.isCommissioner)?.displayName || 'Unknown',
          playerCount: lobby.users.length,
          maxPlayers: lobby.config.teamCount,
          config: {
            teamCount: lobby.config.teamCount,
            rosterSize: lobby.config.rosterSize,
            pickTimer: lobby.config.pickTimer,
            seasonFormat: lobby.config.seasonFormat,
            rotationDepth: lobby.config.rotationDepth,
          },
          createdAt: lobby.createdAt,
        });
      }
    }

    // Sort by creation time (newest first)
    publicLobbies.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ lobbies: publicLobbies });
  } catch (error: any) {
    console.error('Error fetching public lobbies:', error);
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

export default router;
