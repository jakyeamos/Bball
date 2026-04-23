import { describe, expect, it } from 'vitest';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';
import { buildOffseasonRecap } from './recapEngine';

describe('recap engine', () => {
  it('builds recap sections with grade, fit report, development score, and direction', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-recap',
      season_year: 2026,
    });

    run.phase = 'post_offseason_recap';
    run.team_context.timeline = 'contending';
    run.team_context.needs = [
      'Add backcourt shot creation depth',
      'Add two-way wing size',
      'Add frontcourt rim protection',
    ];
    run.coaching_market.selected_coach = {
      id: 'coach-1',
      team_abbreviation: 'LAL',
      head_coach_name: 'Coach Sample',
      pace: 'fast',
      scheme: 'Spread PnR',
      youth_development: true,
      driver_friendly: true,
      shooter_friendly: true,
    };
    run.coaching_market.tendency_profile = {
      pace_bias: 0.1,
      spacing_bias: 0.15,
      rim_pressure_bias: 0.05,
      defense_bias: 0.02,
      development_bias: 0.6,
    };

    run.scouting_pre_draft.prospects = [
      {
        player_id: 101,
        full_name: 'Prospect Guard',
        position: 'PG',
        draft_year: 2025,
        board_rank: 3,
        scouting_score: 0.83,
        uncertainty_score: 0.42,
        uncertainty_band: 'medium',
        signals: {
          production: 0.76,
          workout: 0.82,
          interview: 0.71,
          tools: 0.74,
        },
      },
      {
        player_id: 102,
        full_name: 'Prospect Wing',
        position: 'SF',
        draft_year: 2025,
        board_rank: 8,
        scouting_score: 0.78,
        uncertainty_score: 0.5,
        uncertainty_band: 'medium',
        signals: {
          production: 0.71,
          workout: 0.79,
          interview: 0.68,
          tools: 0.73,
        },
      },
      {
        player_id: 103,
        full_name: 'Prospect Big',
        position: 'C',
        draft_year: 2025,
        board_rank: 12,
        scouting_score: 0.74,
        uncertainty_score: 0.56,
        uncertainty_band: 'medium',
        signals: {
          production: 0.69,
          workout: 0.73,
          interview: 0.66,
          tools: 0.7,
        },
      },
    ];

    run.draft_night.picks = [
      {
        id: 'pick-1',
        pick_number: 1,
        player_id: 101,
        player_name: 'Prospect Guard',
        board_rank: 3,
        fit_score: 91,
        grade: 'A',
        explanation: ['Strong fit.'],
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    run.free_agency.signings = [
      {
        id: 'signing-1',
        player_id: 102,
        player_name: 'Prospect Wing',
        decision: 'signed',
        contract_millions: 9.5,
        fit_score: 84,
        explanation: ['Addresses wing need.'],
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ];
    run.free_agency.cap_space_millions = 21;

    run.trade_market.proposals = [
      {
        id: 'trade-1',
        offered_player_ids: [],
        offered_pick_ids: ['team-r2-2027'],
        requested_player_ids: [103],
        requested_pick_ids: [],
        decision: 'accepted',
        verdict: 'helps',
        fit_score: 9,
        rationale: ['Improves frontcourt fit.'],
        created_at: '2026-01-03T00:00:00.000Z',
      },
    ];

    run.decision_history = [
      {
        id: 'decision-1',
        phase: 'draft_night',
        title: 'Draft pick 1',
        verdict: 'graded',
        summary: 'Strong pick.',
        details: ['Strong fit.'],
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'decision-2',
        phase: 'free_agency',
        title: 'Free agency signed',
        verdict: 'signed',
        summary: 'Added wing depth.',
        details: ['Wing fit.'],
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'decision-3',
        phase: 'trade_market',
        title: 'Trade accepted',
        verdict: 'accepted',
        summary: 'Added rim protection.',
        details: ['Frontcourt fit.'],
        created_at: '2026-01-03T00:00:00.000Z',
      },
    ];

    const recap = buildOffseasonRecap(run);

    expect(recap.run_id).toBe('run-recap');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(recap.team_grade);
    expect(recap.fit_report.length).toBeGreaterThanOrEqual(4);
    expect(recap.developmental_environment_score).toBeGreaterThan(0);
    expect(recap.projected_direction.toLowerCase()).toContain('contending');
    expect(recap.key_moments).toHaveLength(3);
  });

  it('returns a valid recap for sparse runs with no decisions logged', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-recap-empty',
      season_year: 2026,
    });

    run.phase = 'post_offseason_recap';
    run.team_context.timeline = 'rebuilding';
    run.team_context.needs = ['Add backcourt shot creation depth'];

    const recap = buildOffseasonRecap(run);

    expect(recap.overall_score).toBeGreaterThanOrEqual(0);
    expect(recap.overall_score).toBeLessThanOrEqual(100);
    expect(recap.fit_report.length).toBeGreaterThan(0);
    expect(recap.explanation.length).toBeGreaterThan(0);
    expect(recap.key_moments).toHaveLength(0);
  });
});
