import { describe, expect, it } from 'vitest';
import { OFFSEASON_SCHEMA_VERSION, OffseasonRunState } from '@nba-draft-sim/shared';
import { migrateOffseasonRunState } from '../offseason/migrations';
import { transitionRunPhase } from '../offseason/stateMachine';

describe('offseason migrations', () => {
  it('migrates legacy run payloads to the latest schema version', () => {
    const legacyPayload = {
      run_id: 'legacy-run',
      season_year: 2026,
      phase: 'team_context',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-03T00:00:00.000Z',
      team_context: {
        stage: 'review_context',
        selected_team_id: 1610612747,
        needs: ['Add two-way wing size'],
      },
    };

    const result = migrateOffseasonRunState(legacyPayload);

    expect(result.migrated).toBe(true);
    expect(result.from_version).toBe(1);
    expect(result.to_version).toBe(OFFSEASON_SCHEMA_VERSION);
    expect(result.state.schemaVersion).toBe(OFFSEASON_SCHEMA_VERSION);
    expect(result.state.team_context.selected_team_id).toBe(1610612747);
    expect(result.state.team_context.needs).toContain('Add two-way wing size');
    expect(result.state.coaching_market.selected_coach).toBeNull();
    expect(result.state.decision_history).toEqual([]);
  });

  it('throws when the payload cannot be migrated into a valid run state', () => {
    expect(() =>
      migrateOffseasonRunState({
        schemaVersion: 99,
        run_id: 'bad',
      })
    ).toThrow('Migrated offseason state failed validation');
  });
});

describe('offseason state machine', () => {
  const baseRun: OffseasonRunState = {
    schemaVersion: OFFSEASON_SCHEMA_VERSION,
    run_id: 'run-1',
    season_year: 2026,
    phase: 'team_context',
    created_at: '2026-01-02T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    team_context: {
      stage: 'review_context',
      selected_team_id: 1610612747,
      team: null,
      roster: [],
      picks: [],
      timeline: null,
      needs: [],
    },
    coaching_market: {
      stage: 'evaluate_pool',
      selected_coach: null,
      tendency_profile: null,
      hiring_notes: [],
    },
    scouting_pre_draft: {
      stage: 'build_board',
      prospects: [],
      last_board_update_at: null,
    },
    trade_market: {
      stage: 'explore_market',
      proposals: [],
    },
    decision_history: [],
  };

  it('allows adjacent phase transitions', () => {
    const next = transitionRunPhase(
      baseRun,
      'coaching_market',
      '2026-01-03T00:00:00.000Z'
    );
    expect(next.phase).toBe('coaching_market');
    expect(next.team_context.stage).toBe('ready_for_coaching_market');
  });

  it('blocks non-adjacent phase transitions', () => {
    expect(() =>
      transitionRunPhase(baseRun, 'trade_market', '2026-01-03T00:00:00.000Z')
    ).toThrow('Invalid phase transition');
  });
});
