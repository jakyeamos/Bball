import { describe, expect, it } from 'vitest';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';
import { applyFreeAgencyOfferToRun, listFreeAgencyTargets } from './freeAgencyEngine';

describe('free agency engine', () => {
  it('lists targets and applies a valid signing within constraints', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-fa',
      season_year: 2026,
    });
    run.phase = 'free_agency';
    run.team_context.needs = ['Add two-way wing size'];
    run.team_context.roster = [
      { id: 1, full_name: 'Guard One', position: 'PG' },
      { id: 2, full_name: 'Wing Two', position: 'SF' },
    ];
    run.scouting_pre_draft.prospects = [
      {
        player_id: 701,
        full_name: 'Target Wing',
        position: 'SF',
        draft_year: 2025,
        board_rank: 4,
        scouting_score: 0.8,
        uncertainty_score: 0.42,
        uncertainty_band: 'medium',
        signals: {
          production: 0.75,
          workout: 0.82,
          interview: 0.7,
          tools: 0.76,
        },
      },
    ];

    const targets = listFreeAgencyTargets(run);
    expect(targets.length).toBe(1);

    const result = applyFreeAgencyOfferToRun(
      run,
      {
        player_id: 701,
        contract_millions: 7.5,
        decision: 'signed',
      },
      '2026-01-08T00:00:00.000Z'
    );

    expect(result.signing.player_name).toBe('Target Wing');
    expect(result.run.free_agency.cap_space_millions).toBe(28.5);
    expect(result.run.team_context.roster.length).toBe(3);
    expect(result.signing.explanation.length).toBeGreaterThan(0);
  });

  it('blocks offers that exceed cap space', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-fa-2',
      season_year: 2026,
    });
    run.phase = 'free_agency';
    run.free_agency.cap_space_millions = 4;
    run.scouting_pre_draft.prospects = [
      {
        player_id: 711,
        full_name: 'Target Guard',
        position: 'PG',
        draft_year: 2025,
        board_rank: 7,
        scouting_score: 0.72,
        uncertainty_score: 0.51,
        uncertainty_band: 'medium',
        signals: {
          production: 0.68,
          workout: 0.74,
          interview: 0.64,
          tools: 0.7,
        },
      },
    ];

    expect(() =>
      applyFreeAgencyOfferToRun(
        run,
        {
          player_id: 711,
          contract_millions: 9,
          decision: 'signed',
        },
        '2026-01-08T00:00:00.000Z'
      )
    ).toThrow('Offer exceeds available cap space');
  });
});

