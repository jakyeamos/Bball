import {
  FRONT_OFFICE_DATASET_SCHEMA_VERSION,
  FRONT_OFFICE_LEAGUE_TEAM_COUNT,
  FrontOfficeLeagueDataset,
  FrontOfficeValidationIssue,
} from '@nba-draft-sim/shared';
import { buildInvalidIssue, buildValidationReport } from './validationTypes';

function duplicateNumbers(values: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function duplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

export function validateLeagueDataset(
  dataset: FrontOfficeLeagueDataset,
  checkedAt = new Date().toISOString()
) {
  const issues: FrontOfficeValidationIssue[] = [];

  if (dataset.schema_version !== FRONT_OFFICE_DATASET_SCHEMA_VERSION) {
    issues.push(
      buildInvalidIssue({
        id: 'dataset-schema-version',
        message: `Front-office dataset schema_version must be ${FRONT_OFFICE_DATASET_SCHEMA_VERSION}.`,
        rule_ids: ['league-dataset-completeness'],
      })
    );
  }

  if (dataset.teams.length !== FRONT_OFFICE_LEAGUE_TEAM_COUNT) {
    issues.push(
      buildInvalidIssue({
        id: 'league-team-count',
        message: 'League dataset must include exactly 30 teams.',
        rule_ids: ['league-dataset-completeness'],
      })
    );
  }

  for (const teamId of duplicateNumbers(
    dataset.teams.map((team) => team.identity.id)
  )) {
    issues.push(
      buildInvalidIssue({
        id: 'duplicate-team-id',
        message: `Duplicate team id ${teamId}.`,
        team_id: teamId,
        rule_ids: ['league-dataset-completeness'],
      })
    );
  }

  for (const playerId of duplicateNumbers(
    dataset.players.map((player) => player.id)
  )) {
    issues.push(
      buildInvalidIssue({
        id: 'duplicate-player-id',
        message: `Duplicate player id ${playerId}.`,
        player_id: playerId,
        rule_ids: ['league-dataset-completeness'],
      })
    );
  }

  for (const contractId of duplicateStrings(
    dataset.contracts.map((contract) => contract.id)
  )) {
    issues.push(
      buildInvalidIssue({
        id: 'duplicate-contract-id',
        message: `Duplicate contract id ${contractId}.`,
        rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
      })
    );
  }

  for (const assetId of duplicateStrings(
    dataset.draft_assets.map((asset) => asset.id)
  )) {
    issues.push(
      buildInvalidIssue({
        id: 'duplicate-draft-asset-id',
        message: `Duplicate draft asset id ${assetId}.`,
        asset_id: assetId,
        rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
      })
    );
  }

  const teamIds = new Set(dataset.teams.map((team) => team.identity.id));
  const playerIds = new Set(dataset.players.map((player) => player.id));
  const contractIds = new Set(dataset.contracts.map((contract) => contract.id));
  const exceptionIds = new Set(dataset.exceptions.map((entry) => entry.id));
  const draftAssetIds = new Set(dataset.draft_assets.map((asset) => asset.id));

  for (const player of dataset.players) {
    if (player.contract_id && !contractIds.has(player.contract_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'player-contract-reference',
          message: `Player ${player.id} references missing contract ${player.contract_id}.`,
          player_id: player.id,
          rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
        })
      );
    }

    if (
      player.roster_slot === 'rights' &&
      typeof player.rights_team_id !== 'number'
    ) {
      issues.push(
        buildInvalidIssue({
          id: 'rights-player-team-reference',
          message: `Rights player ${player.id} must reference a rights team.`,
          player_id: player.id,
          rule_ids: ['league-dataset-completeness', 'free-agent-rights'],
        })
      );
    }
  }

  for (const contract of dataset.contracts) {
    if (!playerIds.has(contract.player_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'contract-player-reference',
          message: `Contract ${contract.id} references missing player ${contract.player_id}.`,
          player_id: contract.player_id,
          rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
        })
      );
    }

    if (!teamIds.has(contract.team_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'contract-team-reference',
          message: `Contract ${contract.id} references missing team ${contract.team_id}.`,
          team_id: contract.team_id,
          rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
        })
      );
    }

    if (contract.seasons.length === 0) {
      issues.push(
        buildInvalidIssue({
          id: 'contract-season-missing',
          message: `Contract ${contract.id} must include at least one season.`,
          player_id: contract.player_id,
          rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
        })
      );
    }
  }

  for (const rights of dataset.free_agent_rights) {
    if (!playerIds.has(rights.player_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'rights-player-reference',
          message: `Free-agent rights reference missing player ${rights.player_id}.`,
          player_id: rights.player_id,
          rule_ids: ['league-dataset-completeness', 'free-agent-rights'],
        })
      );
    }

    if (!teamIds.has(rights.team_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'rights-team-reference',
          message: `Free-agent rights for player ${rights.player_id} reference missing team ${rights.team_id}.`,
          team_id: rights.team_id,
          player_id: rights.player_id,
          rule_ids: ['league-dataset-completeness', 'free-agent-rights'],
        })
      );
    }
  }

  for (const team of dataset.teams) {
    for (const playerId of [
      ...team.active_roster_player_ids,
      ...team.two_way_player_ids,
      ...team.rights_player_ids,
    ]) {
      if (!playerIds.has(playerId)) {
        issues.push(
          buildInvalidIssue({
            id: 'team-player-reference',
            message: `Team ${team.identity.abbreviation} references missing player ${playerId}.`,
            team_id: team.identity.id,
            player_id: playerId,
            rule_ids: ['league-dataset-completeness', 'roster-size'],
          })
        );
      }
    }

    for (const contractId of team.contract_ids) {
      if (!contractIds.has(contractId)) {
        issues.push(
          buildInvalidIssue({
            id: 'team-contract-reference',
            message: `Team ${team.identity.abbreviation} references missing contract ${contractId}.`,
            team_id: team.identity.id,
            rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
          })
        );
      }
    }

    for (const exceptionId of team.exception_ids) {
      if (!exceptionIds.has(exceptionId)) {
        issues.push(
          buildInvalidIssue({
            id: 'team-exception-reference',
            message: `Team ${team.identity.abbreviation} references missing exception ${exceptionId}.`,
            team_id: team.identity.id,
            rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
          })
        );
      }
    }

    for (const assetId of team.draft_asset_ids) {
      if (!draftAssetIds.has(assetId)) {
        issues.push(
          buildInvalidIssue({
            id: 'team-draft-asset-reference',
            message: `Team ${team.identity.abbreviation} references missing draft asset ${assetId}.`,
            team_id: team.identity.id,
            asset_id: assetId,
            rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
          })
        );
      }
    }
  }

  for (const asset of dataset.draft_assets) {
    if (!teamIds.has(asset.original_team_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'draft-asset-original-team-reference',
          message: `Draft asset ${asset.id} references missing original team ${asset.original_team_id}.`,
          team_id: asset.original_team_id,
          asset_id: asset.id,
          rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
        })
      );
    }

    if (!teamIds.has(asset.current_owner_team_id)) {
      issues.push(
        buildInvalidIssue({
          id: 'draft-asset-owner-team-reference',
          message: `Draft asset ${asset.id} references missing owner team ${asset.current_owner_team_id}.`,
          team_id: asset.current_owner_team_id,
          asset_id: asset.id,
          rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
        })
      );
    }
  }

  return buildValidationReport(issues, checkedAt);
}
