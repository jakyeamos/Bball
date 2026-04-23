import { describe, expect, it } from 'vitest';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';
import { applyTradeProposalToRun } from './tradeEvaluator';

describe('trade evaluator', () => {
  it('returns fit rationale and persists proposal history', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-trade-1',
      season_year: 2026,
    });

    run.phase = 'trade_market';
    run.team_context.needs = [
      'Add backcourt shot creation depth',
      'Add frontcourt rim protection',
    ];
    run.team_context.timeline = 'contending';
    run.team_context.roster = [
      { id: 1, full_name: 'Current Guard', position: 'PG' },
      { id: 2, full_name: 'Current Big', position: 'C' },
    ];
    run.scouting_pre_draft.prospects = [
      {
        player_id: 1001,
        full_name: 'Prospect Guard',
        position: 'SG',
        draft_year: 2025,
        board_rank: 1,
        scouting_score: 0.81,
        uncertainty_score: 0.55,
        uncertainty_band: 'medium',
        signals: {
          production: 0.73,
          workout: 0.79,
          interview: 0.67,
          tools: 0.71,
        },
      },
    ];
    run.coaching_market.tendency_profile = {
      pace_bias: 0.08,
      spacing_bias: 0.06,
      rim_pressure_bias: 0.04,
      defense_bias: 0.02,
      development_bias: 0.03,
    };

    const result = applyTradeProposalToRun(
      run,
      {
        offered_player_ids: [2],
        offered_pick_ids: [],
        requested_player_ids: [1001],
        requested_pick_ids: ['partner-future-R1'],
        decision: 'accepted',
      },
      '2026-01-05T00:00:00.000Z'
    );

    expect(result.proposal.rationale.length).toBeGreaterThan(0);
    expect(['helps', 'neutral', 'hurts']).toContain(result.proposal.verdict);
    expect(result.run.trade_market.proposals).toHaveLength(1);
    expect(result.run.decision_history.at(-1)?.phase).toBe('trade_market');
  });

  it('scores heavy outgoing-asset proposals as lower fit', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-trade-2',
      season_year: 2026,
    });
    run.phase = 'trade_market';
    run.team_context.needs = ['Add two-way wing size'];
    run.team_context.timeline = 'rebuilding';
    run.team_context.roster = [
      { id: 10, full_name: 'Wing A', position: 'SF' },
      { id: 11, full_name: 'Guard B', position: 'PG' },
    ];

    const result = applyTradeProposalToRun(
      run,
      {
        offered_player_ids: [10, 11],
        offered_pick_ids: ['team-future-R1'],
        requested_player_ids: [],
        requested_pick_ids: [],
        decision: 'rejected',
      },
      '2026-01-06T00:00:00.000Z'
    );

    expect(result.proposal.fit_score).toBeLessThan(0);
    expect(result.proposal.verdict).toBe('hurts');
  });
});

