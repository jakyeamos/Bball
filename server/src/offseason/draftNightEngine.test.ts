import { describe, expect, it } from 'vitest';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';
import { applyDraftPickToRun } from './draftNightEngine';

describe('draft night engine', () => {
  it('grades a draft pick with explanation-first output', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-draft',
      season_year: 2026,
    });
    run.phase = 'draft_night';
    run.team_context.needs = ['Add backcourt shot creation depth'];
    run.scouting_pre_draft.prospects = [
      {
        player_id: 501,
        full_name: 'Prospect Guard',
        position: 'PG',
        draft_year: 2025,
        board_rank: 2,
        scouting_score: 0.82,
        uncertainty_score: 0.43,
        uncertainty_band: 'medium',
        signals: {
          production: 0.77,
          workout: 0.81,
          interview: 0.69,
          tools: 0.74,
        },
      },
    ];
    run.coaching_market.tendency_profile = {
      pace_bias: 0.06,
      spacing_bias: 0.05,
      rim_pressure_bias: 0.04,
      defense_bias: 0.01,
      development_bias: 0.03,
    };

    const result = applyDraftPickToRun(
      run,
      { player_id: 501 },
      '2026-01-07T00:00:00.000Z'
    );

    expect(result.pick.player_name).toBe('Prospect Guard');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.pick.grade);
    expect(result.pick.explanation.length).toBeGreaterThan(0);
    expect(result.run.draft_night.picks).toHaveLength(1);
  });

  it('throws when a draft pick references an unknown prospect', () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-draft-2',
      season_year: 2026,
    });
    run.phase = 'draft_night';

    expect(() =>
      applyDraftPickToRun(run, { player_id: 999 }, '2026-01-07T00:00:00.000Z')
    ).toThrow('Prospect not found');
  });
});

