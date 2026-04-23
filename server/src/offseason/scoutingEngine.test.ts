import { describe, expect, it } from 'vitest';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';
import {
  applyScoutingBoardToRun,
  buildInitialScoutingBoard,
  reorderScoutingBoard,
} from './scoutingEngine';

describe('scouting engine', () => {
  it('builds scouting prospects with explicit uncertainty fields', async () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-scouting',
      season_year: 2026,
    });

    run.phase = 'scouting_pre_draft';
    run.team_context.selected_team_id = 1610612747;

    const board = await buildInitialScoutingBoard(run);

    expect(board.length).toBeGreaterThan(0);
    expect(
      board.every(
        (prospect) =>
          ['high', 'medium', 'low'].includes(prospect.uncertainty_band) &&
          typeof prospect.uncertainty_score === 'number' &&
          typeof prospect.signals.production === 'number' &&
          typeof prospect.signals.workout === 'number' &&
          typeof prospect.signals.interview === 'number' &&
          typeof prospect.signals.tools === 'number'
      )
    ).toBe(true);
  });

  it('reorders a scouting board and persists rank changes', async () => {
    const run = createInitialOffseasonRunState({
      run_id: 'run-scouting-reorder',
      season_year: 2026,
    });
    run.phase = 'scouting_pre_draft';
    run.team_context.selected_team_id = 1610612747;

    const board = await buildInitialScoutingBoard(run);
    const thirdProspectId = board[2].player_id;

    const reordered = reorderScoutingBoard(board, [thirdProspectId]);
    const updatedRun = applyScoutingBoardToRun(
      run,
      reordered,
      '2026-01-04T00:00:00.000Z'
    );

    expect(reordered[0].player_id).toBe(thirdProspectId);
    expect(updatedRun.scouting_pre_draft.prospects[0].player_id).toBe(
      thirdProspectId
    );
    expect(updatedRun.scouting_pre_draft.last_board_update_at).toBe(
      '2026-01-04T00:00:00.000Z'
    );
  });
});

