import { describe, expect, it } from 'vitest';
import {
  buildTeamContextForTeam,
  listAvailableTeams,
} from '../offseason/teamContext';

describe('offseason team context', () => {
  it('lists real NBA teams from the disk seed cache', async () => {
    const teams = await listAvailableTeams();
    expect(teams.length).toBeGreaterThanOrEqual(30);
    expect(teams.some((team) => team.abbreviation === 'LAL')).toBe(true);
  });

  it('builds Team Context payload with roster, picks, timeline, and needs', async () => {
    const teams = await listAvailableTeams();
    const lakers = teams.find((team) => team.abbreviation === 'LAL');
    expect(lakers).toBeDefined();

    const context = await buildTeamContextForTeam(lakers!.id);

    expect(context.stage).toBe('review_context');
    expect(context.selected_team_id).toBe(lakers!.id);
    expect(context.team?.abbreviation).toBe('LAL');
    expect(context.roster.length).toBeGreaterThan(0);
    expect(context.picks.length).toBeGreaterThan(0);
    expect(['rebuilding', 'transitioning', 'contending']).toContain(
      context.timeline
    );
    expect(context.needs.length).toBeGreaterThan(0);
  });
});
