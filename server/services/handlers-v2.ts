/**
 * server/services/handlers-v2.ts
 * UPDATED WebSocket handlers for Phases 1B (rounds) and 2.5 (trade proposals)
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { WS_EVENTS, Player, CoachingDecision } from '@nba-draft-sim/shared';
import {
  createRoundState,
  generateRoundSchedule,
  submitCoachingDecision,
  allDecisionsSubmitted,
  simulateRound,
  transitionRoundPhase,
  calculateTotalRounds,
} from '../managers/roundManager';
import {
  createTradeProposal,
  addTradeProposal,
  updateProposalStatus,
  executeTradeProposal,
  cancelTradeProposal,
  validateTradeProposal,
  createTradeNotification,
  expireAllPendingProposals,
} from '../managers/tradeProposalManager';
import { getLeague, leagueStore } from '../stores/leagueStore';
import { aggregateTeam } from '../services/aggregation';
import { lobbies } from './handlers'; // Import existing lobbies store

export function getDefaultCoachingDecision(teamId: string, roundNumber: number): CoachingDecision {
  return {
    teamId,
    roundNumber,
    rotation: [], // Rotation will be filled in by the logic that uses this.
    lineupStrategy: 'balanced',
    defensiveStrategy: 'standard',
    offensiveStrategy: 'balanced_attack',
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Handle ROUND_START event - Phase 1B
 * Commissioner starts a new round
 */
export function handleStartRound(
  io: SocketServer,
  socket: Socket,
  userId: string,
  allPlayers: Player[]
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) throw new Error('Not in a lobby');

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can start round');
    }

    const league = getLeague(lobbyId);
    if (!league || !league.draftState) {
      throw new Error('League not found');
    }

    // Expire any pending trades from the previous window
    league = expireAllPendingProposals(league);
    leagueStore.set(lobbyId, league);

    // Calculate total rounds if not set
    if (!league.totalRounds) {
      const totalRounds = calculateTotalRounds(
        league.draftState.config.teamCount,
        league.draftState.config.seasonFormat
      );
      leagueStore.update(lobbyId, { totalRounds });
    }

    // Increment round number
    const currentRound = (league.currentRound || 0) + 1;

    // Generate matchups for this round
    const teamIds = league.draftState.teams.map(t => t.teamId);
    const matchups = generateRoundSchedule(
      teamIds,
      currentRound,
      league.draftState.config.seasonFormat
    );

    // Create round state
    const roundState = createRoundState(currentRound, matchups);

    // Update league
    leagueStore.update(lobbyId, {
      currentRound,
      roundState,
    });

    // Broadcast round started
    io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.ROUND_STARTED, {
      type: 'ROUND_STARTED',
      payload: { roundNumber: currentRound, matchups, roundState },
    });

    console.log(`✅ Started round ${currentRound} for league ${lobbyId}`);
  } catch (error: any) {
    console.error('Start round error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle COACHING_SUBMIT event - Phase 2
 * Player submits coaching decisions for current round
 */
export function handleSubmitCoaching(
  io: SocketServer,
  socket: Socket,
  payload: { decision: CoachingDecision },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) throw new Error('Not in a lobby');

    const league = getLeague(lobbyId);
    if (!league || !league.roundState || !league.draftState) {
      throw new Error('No active round');
    }

    // Find user's team
    const team = league.draftState.teams.find(t => t.userId === userId);
    if (!team) throw new Error('Team not found');

    // Submit decision
    const updatedRound = submitCoachingDecision(
      league.roundState,
      team.teamId,
      payload.decision
    );

    leagueStore.update(lobbyId, { roundState: updatedRound });

    // Check if all decisions submitted
    const activeTeamIds = league.draftState.teams.map(t => t.teamId);
    if (allDecisionsSubmitted(updatedRound, activeTeamIds)) {
      // All decisions in - simulate immediately
      handleSimulateRound(io, lobbyId, league.draftState.teams.map(t => t.teamId), allPlayers);
    }

    console.log(`✅ Coaching decision submitted for team ${team.teamId}`);
  } catch (error: any) {
    console.error('Submit coaching error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Simulate round when all decisions are in (internal)
 */
function handleSimulateRound(
  io: SocketServer,
  lobbyId: string,
  teamIds: string[],
  allPlayers: Player[]
) {
  try {
    const league = getLeague(lobbyId);
    if (!league || !league.roundState || !league.draftState) return;

    // Build team aggregations
    const teamAggregations = new Map();
    const teamNames = new Map();

    for (const team of league.draftState.teams) {
      const roster = team.roster
        .map(pid => allPlayers.find(p => p.playerId === pid))
        .filter((p): p is Player => p !== undefined);

      if (roster.length > 0) {
        const aggregation = aggregateTeam(roster, team.teamId);
        teamAggregations.set(team.teamId, aggregation);
        teamNames.set(team.teamId, team.displayName);
      }
    }

    // Simulate round
    const simulatedRound = simulateRound(
      league.roundState,
      teamAggregations,
      teamNames
    );

    leagueStore.update(lobbyId, { roundState: simulatedRound });

    // Broadcast results
    io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.ROUND_SIMULATED, {
      type: 'ROUND_SIMULATED',
      payload: { results: simulatedRound.results },
    });

    console.log(`✅ Round ${league.currentRound} simulated for league ${lobbyId}`);
  } catch (error) {
    console.error('Simulate round error:', error);
  }
}

/**
 * Handle TRADE_PROPOSE event - Phase 2.5
 * Player proposes a trade to another team
 */
export function handleProposeTrade(
  io: SocketServer,
  socket: Socket,
  payload: {
    toTeamId: string;
    fromPlayerIds: string[];
    toPlayerIds: string[];
  },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) throw new Error('Not in a lobby');

    const league = getLeague(lobbyId);
    if (!league || !league.draftState) {
      throw new Error('League not found');
    }

    // Find proposer's team
    const fromTeam = league.draftState.teams.find(t => t.userId === userId);
    if (!fromTeam) throw new Error('Team not found');

    // Validate trade
    const validation = validateTradeProposal(
      league,
      fromTeam.teamId,
      payload.toTeamId,
      payload.fromPlayerIds,
      payload.toPlayerIds
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create proposal
    const proposal = createTradeProposal(
      fromTeam.teamId,
      payload.toTeamId,
      payload.fromPlayerIds,
      payload.toPlayerIds
    );

    // Add to league
    const updatedLeague = addTradeProposal(league, proposal);
    leagueStore.set(lobbyId, updatedLeague);

    // Notify recipient
    const toTeam = league.draftState.teams.find(t => t.teamId === payload.toTeamId);
    if (toTeam) {
      const notification = createTradeNotification(proposal, 'received');

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_PROPOSED, {
        type: 'TRADE_PROPOSED',
        payload: { proposal, notification },
      });
    }

    console.log(`✅ Trade proposed from ${fromTeam.teamId} to ${payload.toTeamId}`);
  } catch (error: any) {
    console.error('Propose trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle TRADE_RESPOND event - Phase 2.5
 * Player accepts or rejects a trade proposal
 */
export function handleRespondToTrade(
  io: SocketServer,
  socket: Socket,
  payload: { proposalId: string; accept: boolean },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) throw new Error('Not in a lobby');

    let league = getLeague(lobbyId);
    if (!league || !league.draftState) {
      throw new Error('League not found');
    }

    const proposal = league.tradeProposals.find(p => p.proposalId === payload.proposalId);
    if (!proposal) throw new Error('Proposal not found');

    // Verify user is the recipient
    const recipientTeam = league.draftState.teams.find(t => t.teamId === proposal.toTeamId);
    if (!recipientTeam || recipientTeam.userId !== userId) {
      throw new Error('Not authorized');
    }

    if (payload.accept) {
      // Accept and execute trade
      league = updateProposalStatus(league, proposal.proposalId, 'accepted', new Date().toISOString());
      leagueStore.set(lobbyId, league);

      const result = executeTradeProposal(league, proposal.proposalId);

      if (result.success) {
        leagueStore.set(lobbyId, result.league);

        // Broadcast trade execution
        io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_EXECUTED, {
          type: 'TRADE_EXECUTED',
          payload: { proposal, league: result.league },
        });

        const notification = createTradeNotification(proposal, 'accepted');
        io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_NOTIFICATION, {
          type: 'TRADE_NOTIFICATION',
          payload: notification,
        });

        console.log(`✅ Trade executed: ${proposal.proposalId}`);
      } else {
        throw new Error(result.error);
      }
    } else {
      // Reject trade
      league = updateProposalStatus(league, proposal.proposalId, 'rejected', new Date().toISOString());
      leagueStore.set(lobbyId, league);

      const notification = createTradeNotification(proposal, 'rejected');
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_NOTIFICATION, {
        type: 'TRADE_NOTIFICATION',
        payload: notification,
      });

      console.log(`✅ Trade rejected: ${proposal.proposalId}`);
    }
  } catch (error: any) {
    console.error('Respond to trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle TRADE_CANCEL event - Phase 2.5
 * Player cancels their own trade proposal
 */
export function handleCancelTrade(
  io: SocketServer,
  socket: Socket,
  payload: { proposalId: string },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) throw new Error('Not in a lobby');

    const league = getLeague(lobbyId);
    if (!league) throw new Error('League not found');

    const result = cancelTradeProposal(league, payload.proposalId, userId);

    if (result.success) {
      leagueStore.set(lobbyId, result.league);

      const proposal = result.league.tradeProposals.find(p => p.proposalId === payload.proposalId);
      if (proposal) {
        const notification = createTradeNotification(proposal, 'cancelled');
        io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_NOTIFICATION, {
          type: 'TRADE_NOTIFICATION',
          payload: notification,
        });
      }

      console.log(`✅ Trade cancelled: ${payload.proposalId}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    console.error('Cancel trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}
