/**
 * server/services/handlers-v2.ts
 * UPDATED WebSocket handlers for Phases 1B (rounds) and 2.5 (trade proposals)
 *
 * Phase 1: FOUND-04 — handleSubmitQuarterCoaching and handleReadyForQuarter added
 */

import { Server as SocketServer, Socket } from 'socket.io';
import {
  ArchetypeProfile,
  CoachingDecision,
  LeagueState,
  Player,
  PlayerFeatures,
  TeamAggregation,
  WS_EVENTS,
} from '@nba-draft-sim/shared';
import {
  createRoundState,
  generateRoundSchedule,
  submitCoachingDecision,
  allDecisionsSubmitted,
  simulateRound,
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
import { generateScoutingReport } from '../services/scoutingReport';
import { simulateQuarter } from '../services/simulation';
import { lobbies } from './handlers'; // Import existing lobbies store

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Module-level ready flags for READY_FOR_QUARTER tracking.
 * Maps lobbyId -> Set of teamIds that have signalled ready.
 * Phase 1: FOUND-04
 */
const quarterReadyFlags = new Map<string, Set<string>>();

/**
 * Module-level player list, set by initHandlersV2 at server startup.
 * Phase 1: FOUND-03 — supplies allPlayers to handleSimulateRoundInternal
 */
let _allPlayers: Player[] = [];

/**
 * Initialize module-level player data for the auto-sim path.
 * Must be called in initializeSocketServer before any socket.on() registration.
 * Phase 1: FOUND-03
 */
export function initHandlersV2(players: Player[]): void {
  _allPlayers = players;
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

    let league = getLeague(lobbyId);
    if (!league || !league.draftState) {
      throw new Error('League not found');
    }

    // Store draftState reference before any reassignment (TypeScript loses narrowing after reassignment)
    const draftState = league.draftState;

    // Expire any pending trades from the previous window
    league = expireAllPendingProposals(league);
    leagueStore.set(lobbyId, league);

    // Calculate total rounds if not set
    if (!league.totalRounds) {
      const totalRounds = calculateTotalRounds(
        draftState.config.teamCount,
        draftState.config.seasonFormat
      );
      leagueStore.update(lobbyId, { totalRounds });
    }

    // Increment round number
    const currentRound = (league.currentRound || 0) + 1;

    // Generate matchups for this round
    const teamIds = draftState.teams.map(t => t.teamId);
    const matchups = generateRoundSchedule(
      teamIds,
      currentRound,
      draftState.config.seasonFormat
    );

    // Create round state
    const roundState = createRoundState(currentRound, matchups);

    // Update league - set phase to regular_season on first round
    const updateData: Partial<LeagueState> = {
      currentRound,
      roundState,
    };
    if (currentRound === 1 && league.phase !== 'regular_season') {
      updateData.phase = 'regular_season';
    }
    leagueStore.update(lobbyId, updateData);

    // Get updated league for broadcast
    const updatedLeague = getLeague(lobbyId);

    // Generate and send scouting reports for each matchup
    for (const matchup of matchups) {
      const teamA = draftState.teams.find(t => t.teamId === matchup.teamAId);
      const teamB = draftState.teams.find(t => t.teamId === matchup.teamBId);

      if (teamA && teamB) {
        // Get rosters
        const teamARoster = teamA.roster
          .map(pid => allPlayers.find(p => p.playerId === pid))
          .filter((p): p is Player => p !== undefined);
        const teamBRoster = teamB.roster
          .map(pid => allPlayers.find(p => p.playerId === pid))
          .filter((p): p is Player => p !== undefined);

        if (teamARoster.length > 0 && teamBRoster.length > 0) {
          // Generate team aggregations
          const teamAAgg = aggregateTeam(teamARoster, teamA.teamId);
          const teamBAgg = aggregateTeam(teamBRoster, teamB.teamId);

          // Get recent coaching decisions for both teams
          const teamARecentDecisions = league.coachingHistory?.[teamA.teamId] || [];
          const teamBRecentDecisions = league.coachingHistory?.[teamB.teamId] || [];

          // Generate scouting report
          const scoutingReport = generateScoutingReport(
            matchup,
            teamA.displayName,
            teamB.displayName,
            teamAAgg,
            teamBAgg,
            teamARoster,
            teamBRoster,
            teamARecentDecisions,
            teamBRecentDecisions
          );

          // Send scouting report to both teams
          io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.GAME_SCOUTING_REPORT, {
            type: 'GAME_SCOUTING_REPORT',
            payload: { scoutingReport },
          });
        }
      }
    }

    // Broadcast round started
    io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.ROUND_STARTED, {
      type: 'ROUND_STARTED',
      payload: { roundNumber: currentRound, matchups, roundState },
    });

    // Broadcast updated league (includes phase change if first round)
    if (updatedLeague) {
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.LEAGUE_UPDATED, {
        type: 'LEAGUE_UPDATED',
        payload: updatedLeague,
      });
    }

    console.log(`✅ Started round ${currentRound} for league ${lobbyId}`);
  } catch (error: unknown) {
    console.error('Start round error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
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

    // Update coaching history
    if (!league.coachingHistory) {
      league.coachingHistory = {};
    }
    if (!league.coachingHistory[team.teamId]) {
      league.coachingHistory[team.teamId] = [];
    }
    league.coachingHistory[team.teamId].push(payload.decision);
    leagueStore.update(lobbyId, { coachingHistory: league.coachingHistory });

    // Check if all decisions submitted
    const activeTeamIds = league.draftState.teams.map(t => t.teamId);
    if (allDecisionsSubmitted(updatedRound, activeTeamIds)) {
      // All decisions in - simulate immediately
      // FIX: Get allPlayers from a stored reference or pass it differently
      // For now, we'll need to load players from the league snapshot
      handleSimulateRoundInternal(io, lobbyId);
    }

    console.log(`✅ Coaching decision submitted for team ${team.teamId}`);
  } catch (error: unknown) {
    console.error('Submit coaching error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
  }
}

/**
 * Simulate round when all decisions are in (internal)
 * Phase 1: FOUND-03 — now uses real TeamAggregation objects via _allPlayers.
 * Previously used stubs (overallRating: 50, features: {}) making coaching decisions
 * have zero mechanical effect. Fixed by mirroring handleSimulateRound lines 311–356.
 */
function handleSimulateRoundInternal(
  io: SocketServer,
  lobbyId: string
) {
  try {
    const league = getLeague(lobbyId);
    if (!league || !league.roundState || !league.draftState) return;

    // Build team aggregations
    const teamAggregations = new Map();
    const teamNames = new Map();

    // FIX: Phase 1 — FOUND-03: use real aggregations (mirrors handleSimulateRound)
    for (const team of league.draftState.teams) {
      const roster = team.roster
        .map(pid => _allPlayers.find(p => p.playerId === pid))
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
      payload: { roundResults: simulatedRound.roundResults },
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
      payload.toPlayerIds,
      _allPlayers,
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
      const notification = createTradeNotification(
        proposal,
        fromTeam.displayName,
        toTeam.displayName
      );

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_PROPOSED, {
        type: 'TRADE_PROPOSED',
        payload: { proposal, notification },
      });
    }

    console.log(`✅ Trade proposed from ${fromTeam.teamId} to ${payload.toTeamId}`);
  } catch (error: unknown) {
    console.error('Propose trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
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

    // Get team names for notification
    const fromTeam = league.draftState.teams.find(t => t.teamId === proposal.fromTeamId);
    const fromTeamName = fromTeam?.displayName || proposal.fromTeamId;
    const toTeamName = recipientTeam.displayName;

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

        const notification = createTradeNotification(proposal, fromTeamName, toTeamName);
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

      const notification = createTradeNotification(proposal, fromTeamName, toTeamName);
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_NOTIFICATION, {
        type: 'TRADE_NOTIFICATION',
        payload: notification,
      });

      console.log(`✅ Trade rejected: ${proposal.proposalId}`);
    }
  } catch (error: unknown) {
    console.error('Respond to trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
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
    if (!league || !league.draftState) throw new Error('League not found');

    const result = cancelTradeProposal(league, payload.proposalId, userId);

    if (result.success) {
      leagueStore.set(lobbyId, result.league);

      const proposal = result.league.tradeProposals.find(p => p.proposalId === payload.proposalId);
      if (proposal) {
        // Get team names for notification
        const fromTeam = league.draftState.teams.find(t => t.teamId === proposal.fromTeamId);
        const toTeam = league.draftState.teams.find(t => t.teamId === proposal.toTeamId);
        const fromTeamName = fromTeam?.displayName || proposal.fromTeamId;
        const toTeamName = toTeam?.displayName || proposal.toTeamId;

        const notification = createTradeNotification(proposal, fromTeamName, toTeamName);
        io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_NOTIFICATION, {
          type: 'TRADE_NOTIFICATION',
          payload: notification,
        });
      }

      console.log(`✅ Trade cancelled: ${payload.proposalId}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error: unknown) {
    console.error('Cancel trade error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
  }
}

/**
 * Handle SUBMIT_QUARTER_COACHING event - Phase 1: FOUND-04
 *
 * Stores the coaching decision for the submitting team. When both teams
 * have submitted, simulates the quarter, emits QUARTER_RESULT, then either
 * advances to the next coaching window or emits GAME_FINAL after Q4.
 */
export function handleSubmitQuarterCoaching(
  io: SocketServer,
  socket: Socket,
  payload: { lobbyId: string; teamId: string; decision: CoachingDecision },
  _userId: string
): void {
  try {
    const { lobbyId, teamId, decision } = payload;
    if (!lobbyId || !teamId || !decision) {
      throw new Error('Invalid payload: lobbyId, teamId, and decision are required');
    }

    const league = getLeague(lobbyId);
    if (!league || !league.liveGame) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'No active live game found' } });
      return;
    }

    const liveGame = league.liveGame;

    // Determine which team slot (A or B) this decision belongs to
    const isTeamA = teamId === liveGame.scoutingReport.teamAId;
    const isTeamB = teamId === liveGame.scoutingReport.teamBId;

    if (!isTeamA && !isTeamB) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'Team not part of this game' } });
      return;
    }

    // Store decision on liveGame
    const updatedLiveGame = {
      ...liveGame,
      coachingDecisionA: isTeamA ? decision : liveGame.coachingDecisionA,
      coachingDecisionB: isTeamB ? decision : liveGame.coachingDecisionB,
    };
    leagueStore.update(lobbyId, { liveGame: updatedLiveGame });

    const bothSubmitted = !!updatedLiveGame.coachingDecisionA && !!updatedLiveGame.coachingDecisionB;

    if (!bothSubmitted) {
      // Waiting on the other team
      console.log(`⏳ Quarter coaching: waiting on other team in lobby ${lobbyId}`);
      return;
    }

    // Both submitted — simulate the quarter
    const currentQuarter = liveGame.currentQuarter === 0 ? 1 : liveGame.currentQuarter;
    const quarter = (currentQuarter as 1 | 2 | 3 | 4);

    // Build team aggregations using draftState rosters
    // FIX: Phase 1 — FOUND-03: use real aggregations via module-level _allPlayers
    const draftState = league.draftState;
    const teamAId = updatedLiveGame.scoutingReport.teamAId;
    const teamBId = updatedLiveGame.scoutingReport.teamBId;

    // Safe neutral fallback if roster data not yet available (pre-draft or empty lobby)
    const DEFAULT_RATING = 50;
    const makeNeutralAgg = (tid: string) => ({
      teamId: tid,
      features: {} as PlayerFeatures,
      teamModel: {
        possessionVolume: 0.5,
        transitionShare: 0.5,
        transitionDefense: 0.5,
        transitionContainment: 0.5,
        turnoverRate: 0.5,
        foulRate: 0.5,
        freeThrowRate: 0.5,
        rimRate: 0.5,
        rimAccuracy: 0.5,
        paintRate: 0.5,
        paintAccuracy: 0.5,
        threeRate: 0.5,
        threeAccuracy: 0.5,
        offensiveReboundRate: 0.5,
        ballSecurity: 0.5,
        primaryCreation: 0.5,
        secondaryCreation: 0.5,
        spacing: 0.5,
        rimPressure: 0.5,
        finishing: 0.5,
        perimeterDefense: 0.5,
        rimDefense: 0.5,
        ballPressure: 0.5,
        paintPacking: 0.5,
        rimContest: 0.5,
        closeoutIntegrity: 0.5,
        reboundPositioning: 0.5,
        turnoverPressure: 0.5,
        defensiveReboundRate: 0.5,
        foulDiscipline: 0.5,
        benchDepth: 0.5,
        volatility: 0.5,
        switchability: 0.5,
      },
      roleProfile: {
        rosterRoleCounts: { backcourt: 0, wing: 0, frontcourt: 0 },
        functionalRoleCounts: {
          primary_creator: 0,
          secondary_creator: 0,
          connector: 0,
          movement_shooter: 0,
          slasher_finisher: 0,
          two_way_wing: 0,
          stretch_big: 0,
          rim_big: 0,
        },
        rosterRoleShare: { backcourt: 0, wing: 0, frontcourt: 0 },
        functionalRoleShare: {
          primary_creator: 0,
          secondary_creator: 0,
          connector: 0,
          movement_shooter: 0,
          slasher_finisher: 0,
          two_way_wing: 0,
          stretch_big: 0,
          rim_big: 0,
        },
      },
      archetypes: {} as ArchetypeProfile,
      modifiers: {
        total: 0, shootBonus: 0, creatorPen: 0, rimPen: 0,
        offenseBonus: 0, offensePenalty: 0, defenseBonus: 0,
        defensePenalty: 0, variancePenalty: 0, homeCourtAdvantage: 2,
      },
      overallRating: DEFAULT_RATING,
      rotation: [],
    });

    let teamAAgg: TeamAggregation = makeNeutralAgg(teamAId) as TeamAggregation;
    let teamBAgg: TeamAggregation = makeNeutralAgg(teamBId) as TeamAggregation;

    // Use real aggregations from _allPlayers (available via initHandlersV2)
    if (draftState && _allPlayers.length > 0) {
      const teamADraft = draftState.teams.find(t => t.teamId === teamAId);
      const teamBDraft = draftState.teams.find(t => t.teamId === teamBId);

      if (teamADraft) {
        const rosterA = teamADraft.roster
          .map(pid => _allPlayers.find(p => p.playerId === pid))
          .filter((p): p is Player => p !== undefined);
        if (rosterA.length > 0) {
          teamAAgg = aggregateTeam(rosterA, teamAId);
        }
      }

      if (teamBDraft) {
        const rosterB = teamBDraft.roster
          .map(pid => _allPlayers.find(p => p.playerId === pid))
          .filter((p): p is Player => p !== undefined);
        if (rosterB.length > 0) {
          teamBAgg = aggregateTeam(rosterB, teamBId);
        }
      }
    }

    const homeTeam: 'A' | 'B' = 'A'; // default; scouting report could carry this in future
    const quarterResult = simulateQuarter(
      teamAAgg,
      teamBAgg,
      homeTeam,
      quarter,
      updatedLiveGame.coachingDecisionA,
      updatedLiveGame.coachingDecisionB,
      updatedLiveGame.completedQuarters
    );

    // Generate a basic blurb
    const momentumWinner = quarterResult.scoreA > quarterResult.scoreB ? 'A' : quarterResult.scoreB > quarterResult.scoreA ? 'B' : 'even';
    const quarterBlurb = {
      quarter,
      narrative: `Quarter ${quarter} ended ${quarterResult.totalScoreA}–${quarterResult.totalScoreB}.`,
      coachingInsight: 'Both coaches made adjustments.',
      momentum: momentumWinner as 'A' | 'B' | 'even',
    };

    // Update liveGame with result
    const completedQuarters = [...updatedLiveGame.completedQuarters, quarterResult];
    const quarterBlurbs = [...updatedLiveGame.quarterBlurbs, quarterBlurb];

    const nextPhase: 'final' | 'coaching' = currentQuarter === 4 ? 'final' : 'coaching';

    const finalLiveGame = {
      ...updatedLiveGame,
      completedQuarters,
      quarterBlurbs,
      coachingDecisionA: undefined,
      coachingDecisionB: undefined,
      phase: nextPhase,
    };

    leagueStore.update(lobbyId, { liveGame: finalLiveGame });

    // Emit QUARTER_RESULT to lobby room
    io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.QUARTER_RESULT, {
      type: 'QUARTER_RESULT',
      payload: {
        quarterResult,
        blurb: quarterBlurb,
        gameState: finalLiveGame,
      },
    });

    if (currentQuarter === 4) {
      // Build QuarterBasedGameResult for GAME_FINAL
      const finalScoreA = quarterResult.totalScoreA;
      const finalScoreB = quarterResult.totalScoreB;
      const gameResult = {
        gameId: finalLiveGame.gameId,
        teamAId,
        teamBId,
        homeTeam,
        scoutingReport: finalLiveGame.scoutingReport,
        quarters: completedQuarters,
        quarterBlurbs,
        finalScoreA,
        finalScoreB,
        winner: finalScoreA >= finalScoreB ? 'A' : 'B' as 'A' | 'B',
        gameEditorial: `Final score: ${finalScoreA}–${finalScoreB}`,
        result: {
          winner: finalScoreA >= finalScoreB ? 'A' : 'B' as 'A' | 'B',
          winPctA: finalScoreA / (finalScoreA + finalScoreB),
          winsA: finalScoreA >= finalScoreB ? 1 : 0,
          winsB: finalScoreA >= finalScoreB ? 0 : 1,
          drivers: [],
          finalScoreA,
          finalScoreB,
        },
      };

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.GAME_FINAL, {
        type: 'GAME_FINAL',
        payload: { gameResult },
      });

      // Clear ready flags for this lobby
      quarterReadyFlags.delete(lobbyId);

      console.log(`✅ Game final emitted for lobby ${lobbyId}: ${finalScoreA}–${finalScoreB}`);
    } else {
      // Advance to next quarter coaching window
      const nextQuarter = (currentQuarter + 1) as 1 | 2 | 3 | 4;
      const nextCoachingWindowEndsAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      leagueStore.update(lobbyId, {
        liveGame: { ...finalLiveGame, currentQuarter: nextQuarter, coachingWindowEndsAt: nextCoachingWindowEndsAt },
      });

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.QUARTER_COACHING_WINDOW, {
        type: 'QUARTER_COACHING_WINDOW',
        payload: {
          quarter: nextQuarter,
          gameState: { ...finalLiveGame, currentQuarter: nextQuarter },
          timeRemaining: 60,
        },
      });

      // Reset ready flags for next quarter
      quarterReadyFlags.delete(lobbyId);

      console.log(`✅ Quarter ${currentQuarter} simulated, advancing to Q${nextQuarter} coaching window in lobby ${lobbyId}`);
    }
  } catch (error: unknown) {
    console.error('Submit quarter coaching error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
  }
}

/**
 * Handle READY_FOR_QUARTER event - Phase 1: FOUND-04
 *
 * Marks the requesting user's team as ready for the next quarter.
 * When both teams signal ready, opens the coaching window for that quarter.
 */
export function handleReadyForQuarter(
  io: SocketServer,
  socket: Socket,
  userId: string
): void {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'Not in a lobby' } });
      return;
    }

    const league = getLeague(lobbyId);
    if (!league || !league.liveGame) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'No active live game found' } });
      return;
    }

    const liveGame = league.liveGame;

    // Identify the user's teamId from draftState
    const draftState = league.draftState;
    if (!draftState) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'Draft state not found' } });
      return;
    }

    const userTeam = draftState.teams.find(t => t.userId === userId);
    if (!userTeam) {
      socket.emit(WS_EVENTS.ERROR, { payload: { message: 'User team not found' } });
      return;
    }

    // Only teams playing this game need to be ready
    const { teamAId, teamBId } = liveGame.scoutingReport;
    const isParticipant = userTeam.teamId === teamAId || userTeam.teamId === teamBId;
    if (!isParticipant) {
      // Non-participant signalling ready — ignore silently
      return;
    }

    // Record readiness
    if (!quarterReadyFlags.has(lobbyId)) {
      quarterReadyFlags.set(lobbyId, new Set());
    }
    quarterReadyFlags.get(lobbyId)!.add(userTeam.teamId);

    const readySet = quarterReadyFlags.get(lobbyId)!;
    const bothReady = readySet.has(teamAId) && readySet.has(teamBId);

    console.log(`✅ Team ${userTeam.teamId} ready for next quarter in lobby ${lobbyId} (${readySet.size}/2)`);

    if (bothReady) {
      // Both teams ready — open the coaching window for the current quarter
      const currentQuarter = liveGame.currentQuarter === 0 ? 1 : liveGame.currentQuarter;
      const coachingWindowEndsAt = new Date(Date.now() + 60 * 1000).toISOString();

      leagueStore.update(lobbyId, {
        liveGame: { ...liveGame, phase: 'coaching', coachingWindowEndsAt },
      });

      const updatedGame = getLeague(lobbyId)?.liveGame || liveGame;

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.QUARTER_COACHING_WINDOW, {
        type: 'QUARTER_COACHING_WINDOW',
        payload: {
          quarter: currentQuarter,
          gameState: updatedGame,
          timeRemaining: 60,
        },
      });

      // Clear ready flags — wait for next round of READY_FOR_QUARTER signals
      quarterReadyFlags.delete(lobbyId);

      console.log(`✅ Both teams ready — opened Q${currentQuarter} coaching window in lobby ${lobbyId}`);
    }
  } catch (error: unknown) {
    console.error('Ready for quarter error:', error);
    socket.emit(WS_EVENTS.ERROR, { payload: { message: getErrorMessage(error) } });
  }
}
