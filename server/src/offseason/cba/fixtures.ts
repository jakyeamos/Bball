import { FrontOfficeLeagueDataset } from '@nba-draft-sim/shared';

const TEAM_ABBREVIATIONS = [
  'ATL',
  'BOS',
  'BKN',
  'CHA',
  'CHI',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GSW',
  'HOU',
  'IND',
  'LAC',
  'LAL',
  'MEM',
  'MIA',
  'MIL',
  'MIN',
  'NOP',
  'NYK',
  'OKC',
  'ORL',
  'PHI',
  'PHX',
  'POR',
  'SAC',
  'SAS',
  'TOR',
  'UTA',
  'WAS',
] as const;

export function buildCompleteFrontOfficeDataset(): FrontOfficeLeagueDataset {
  const teams = TEAM_ABBREVIATIONS.map((abbreviation, index) => {
    const teamId = 1610612737 + index;
    const playerId = 100000 + index;
    const rightsPlayerId = 600000 + index;
    const contractId = `${abbreviation}-contract-${playerId}`;
    const exceptionId = `${abbreviation}-room-exception`;
    const firstRoundPickId = `${abbreviation}-2026-R1`;
    const secondRoundPickId = `${abbreviation}-2026-R2`;

    return {
      identity: {
        id: teamId,
        abbreviation,
        city: `City ${abbreviation}`,
        name: `Team ${abbreviation}`,
        full_name: `City ${abbreviation} Team ${abbreviation}`,
        conference: index < 15 ? 'East' : 'West',
        division: index < 15 ? 'Fixture East' : 'Fixture West',
      },
      timeline: 'transitioning',
      apron_status: 'below_tax',
      hard_capped_at_first_apron: false,
      hard_capped_at_second_apron: false,
      tax_salary_millions: 90,
      active_roster_player_ids: [playerId],
      two_way_player_ids: [],
      rights_player_ids: [rightsPlayerId],
      contract_ids: [contractId],
      exception_ids: [exceptionId],
      draft_asset_ids: [firstRoundPickId, secondRoundPickId],
      needs: ['Add two-way wing size'],
    } satisfies FrontOfficeLeagueDataset['teams'][number];
  });

  return {
    schema_version: 1,
    dataset_version: 'fixture-2026-v1',
    season_year: 2026,
    generated_at: '2026-05-14T00:00:00.000Z',
    source_snapshot: 'fixture',
    patch_version: 'fixture-patch-v1',
    teams,
    players: teams.flatMap((team, index) => {
      const abbreviation = team.identity.abbreviation;
      const playerId = 100000 + index;
      const rightsPlayerId = 600000 + index;
      return [
        {
          id: playerId,
          full_name: `Player ${abbreviation}`,
          position: 'SF',
          roster_slot: 'standard',
          contract_id: `${abbreviation}-contract-${playerId}`,
          rights_team_id: null,
        },
        {
          id: rightsPlayerId,
          full_name: `Rights Player ${abbreviation}`,
          position: 'SG',
          roster_slot: 'rights',
          contract_id: null,
          rights_team_id: team.identity.id,
        },
      ];
    }),
    contracts: teams.map((team, index) => {
      const abbreviation = team.identity.abbreviation;
      const playerId = 100000 + index;
      return {
        id: `${abbreviation}-contract-${playerId}`,
        player_id: playerId,
        team_id: team.identity.id,
        signed_at: '2025-07-06T00:00:00.000Z',
        seasons: [
          {
            season_year: 2026,
            salary_millions: 10,
            guarantee_type: 'fully_guaranteed',
            guaranteed_millions: 10,
            option_type: 'none',
          },
        ],
        bird_rights_type: 'bird',
        years_of_service: 4,
        trade_eligible_at: '2025-12-15T00:00:00.000Z',
        recently_traded_until: null,
      };
    }),
    free_agent_rights: teams.map((team, index) => ({
      player_id: 600000 + index,
      team_id: team.identity.id,
      rights_type: 'bird',
      cap_hold_millions: 12,
      qualifying_offer_millions: null,
      offer_sheet_match_deadline: null,
    })),
    exceptions: teams.map((team) => ({
      id: `${team.identity.abbreviation}-room-exception`,
      team_id: team.identity.id,
      type: 'room_exception',
      amount_millions: 8,
      remaining_millions: 8,
      expires_at: '2027-06-30T23:59:59.000Z',
    })),
    draft_assets: teams.flatMap((team) => [
      {
        id: `${team.identity.abbreviation}-2026-R1`,
        kind: 'pick',
        year: 2026,
        round: 1,
        original_team_id: team.identity.id,
        current_owner_team_id: team.identity.id,
        encumbered: false,
        protections: [],
        notes: [],
      },
      {
        id: `${team.identity.abbreviation}-2026-R2`,
        kind: 'pick',
        year: 2026,
        round: 2,
        original_team_id: team.identity.id,
        current_owner_team_id: team.identity.id,
        encumbered: false,
        protections: [],
        notes: [],
      },
    ]),
  };
}
