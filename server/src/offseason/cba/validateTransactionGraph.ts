import {
  FrontOfficeDraftAsset,
  FrontOfficeExceptionLedgerEntry,
  FrontOfficeLeagueDataset,
  FrontOfficePlayer,
  FrontOfficePlayerContract,
  FrontOfficeRuleCitation,
  FrontOfficeTeamState,
  FrontOfficeTransactionGraph,
  FrontOfficeTransactionPreview,
  FrontOfficeTransactionTeamDelta,
  FrontOfficeValidationIssue,
} from '@nba-draft-sim/shared';
import { CBA_2026_CITATIONS, findCbaCitation } from './citations/2026';
import { CBA_2026_CONSTANTS } from './constants/2026';
import { buildInvalidIssue, buildValidationReport } from './validationTypes';
import { validateLeagueDataset } from './validateLeagueDataset';

interface DatasetIndexes {
  teams: Map<number, FrontOfficeTeamState>;
  players: Map<number, FrontOfficePlayer>;
  contracts: Map<string, FrontOfficePlayerContract>;
  draftAssets: Map<string, FrontOfficeDraftAsset>;
  exceptions: Map<string, FrontOfficeExceptionLedgerEntry>;
}

function buildIndexes(dataset: FrontOfficeLeagueDataset): DatasetIndexes {
  return {
    teams: new Map(dataset.teams.map((team) => [team.identity.id, team])),
    players: new Map(dataset.players.map((player) => [player.id, player])),
    contracts: new Map(
      dataset.contracts.map((contract) => [contract.id, contract])
    ),
    draftAssets: new Map(dataset.draft_assets.map((asset) => [asset.id, asset])),
    exceptions: new Map(dataset.exceptions.map((entry) => [entry.id, entry])),
  };
}

function emptyDelta(team: FrontOfficeTeamState): FrontOfficeTransactionTeamDelta {
  return {
    team_id: team.identity.id,
    outgoing_player_ids: [],
    incoming_player_ids: [],
    outgoing_draft_asset_ids: [],
    incoming_draft_asset_ids: [],
    outgoing_exception_ids: [],
    incoming_exception_ids: [],
    outgoing_cash_millions: 0,
    incoming_cash_millions: 0,
    salary_out_millions: 0,
    salary_in_millions: 0,
    salary_delta_millions: 0,
    tax_salary_after_millions: team.tax_salary_millions,
    standard_roster_count_after: team.active_roster_player_ids.length,
  };
}

function money(value: number): number {
  return Number(value.toFixed(3));
}

function firstSeasonSalary(
  contract: FrontOfficePlayerContract,
  seasonYear: number
): number {
  return (
    contract.seasons.find((season) => season.season_year === seasonYear)
      ?.salary_millions ??
    contract.seasons[0]?.salary_millions ??
    0
  );
}

function salaryMatchingAllowance(postTradeSalaryMillions: number): number {
  return postTradeSalaryMillions > CBA_2026_CONSTANTS.first_apron_millions
    ? 0
    : CBA_2026_CONSTANTS.trade_matching_allowance_millions;
}

function salaryMatchLimit(
  salaryOutMillions: number,
  postTradeSalaryMillions: number
): number {
  const allowance = salaryMatchingAllowance(postTradeSalaryMillions);
  const expandedExceptionLimit = Math.max(
    Math.min(
      salaryOutMillions * 2 + allowance,
      salaryOutMillions +
        CBA_2026_CONSTANTS.expanded_trade_exception_fixed_millions
    ),
    salaryOutMillions * 1.25 + allowance
  );

  if (postTradeSalaryMillions > CBA_2026_CONSTANTS.first_apron_millions) {
    return salaryOutMillions;
  }

  return expandedExceptionLimit;
}

function usesAggregatedSalary(delta: FrontOfficeTransactionTeamDelta): boolean {
  return (
    delta.outgoing_player_ids.length > 1 && delta.incoming_player_ids.length > 0
  );
}

function isAfter(date: string | null, leagueDate: string): boolean {
  return typeof date === 'string' && Date.parse(date) > Date.parse(leagueDate);
}

function hasFutureFirstAfterTrade(
  dataset: FrontOfficeLeagueDataset,
  teamId: number,
  year: number,
  outgoingDraftAssetIds: Set<string>
): boolean {
  return dataset.draft_assets.some(
    (asset) =>
      asset.kind === 'pick' &&
      asset.round === 1 &&
      asset.year === year &&
      asset.current_owner_team_id === teamId &&
      !asset.encumbered &&
      !outgoingDraftAssetIds.has(asset.id)
  );
}

function validateStepienWindows(
  dataset: FrontOfficeLeagueDataset,
  teamId: number,
  outgoingDraftAssetIds: Set<string>
): boolean {
  const firstFutureYear = dataset.season_year;
  const lastFutureYear = dataset.season_year + 7;

  for (let year = firstFutureYear; year < lastFutureYear; year += 1) {
    if (
      !hasFutureFirstAfterTrade(dataset, teamId, year, outgoingDraftAssetIds) &&
      !hasFutureFirstAfterTrade(dataset, teamId, year + 1, outgoingDraftAssetIds)
    ) {
      return false;
    }
  }

  return true;
}

function collectCitations(
  issues: FrontOfficeValidationIssue[]
): FrontOfficeRuleCitation[] {
  const ruleIds = new Set(issues.flatMap((issue) => issue.rule_ids));
  const citations: FrontOfficeRuleCitation[] = [];

  for (const ruleId of ruleIds) {
    const citation = findCbaCitation(ruleId);
    if (citation) {
      citations.push(citation);
    }
  }

  return citations;
}

function buildSuggestedFixes(
  issues: FrontOfficeValidationIssue[]
): string[] {
  const fixes: string[] = [];
  const issueIds = new Set(issues.map((issue) => issue.id));

  if (issueIds.has('transaction-team-count')) {
    fixes.push('Add at least two participating teams to the transaction graph.');
  }

  if (issueIds.has('transaction-empty')) {
    fixes.push('Add at least one player, pick, cash, or exception movement.');
  }

  if (issueIds.has('cash-sent-limit') || issueIds.has('cash-received-limit')) {
    fixes.push('Reduce cash in the trade to fit the season trade cash limit.');
  }

  if (issueIds.has('draft-asset-encumbered')) {
    fixes.push('Remove encumbered draft assets or replace them with tradeable picks.');
  }

  if (issueIds.has('player-trade-eligibility')) {
    fixes.push('Wait until the player trade restriction date passes or remove the player.');
  }

  if (issueIds.has('roster-limit-after-trade')) {
    fixes.push('Balance incoming and outgoing standard roster players before execution.');
  }

  if (issueIds.has('salary-matching')) {
    fixes.push('Add outgoing salary, remove incoming salary, or create cap room before execution.');
  }

  if (
    issueIds.has('first-apron-incoming-salary') ||
    issueIds.has('second-apron-cash') ||
    issueIds.has('second-apron-aggregation') ||
    issueIds.has('hard-cap-first-apron') ||
    issueIds.has('hard-cap-second-apron')
  ) {
    fixes.push('Rework the trade so apron teams do not add restricted salary, cash, or aggregation.');
  }

  if (
    issueIds.has('draft-asset-protection-conveyance') ||
    issueIds.has('draft-stepien')
  ) {
    fixes.push('Replace the pick package with draft assets that preserve legal future first-round coverage.');
  }

  return fixes;
}

function addIssue(
  issues: FrontOfficeValidationIssue[],
  input: Omit<FrontOfficeValidationIssue, 'status'>
): void {
  issues.push(buildInvalidIssue(input));
}

export function validateTransactionGraph(
  dataset: FrontOfficeLeagueDataset,
  graph: FrontOfficeTransactionGraph,
  checkedAt = new Date().toISOString()
): FrontOfficeTransactionPreview {
  const datasetReport = validateLeagueDataset(dataset, checkedAt);
  const issues: FrontOfficeValidationIssue[] = [...datasetReport.issues];
  const indexes = buildIndexes(dataset);
  const deltas = new Map<number, FrontOfficeTransactionTeamDelta>();
  const graphTeamIds = new Set(graph.team_ids);
  const outgoingDraftAssetIdsByTeam = new Map<number, Set<string>>();

  for (const teamId of graph.team_ids) {
    const team = indexes.teams.get(teamId);
    if (team) {
      deltas.set(teamId, emptyDelta(team));
    }
  }

  if (graph.team_ids.length < 2) {
    addIssue(issues, {
      id: 'transaction-team-count',
      message: 'Transaction graph must include at least two teams.',
      rule_ids: ['transaction-graph-shape'],
    });
  }

  if (!graphTeamIds.has(graph.created_by_team_id)) {
    addIssue(issues, {
      id: 'transaction-creator-team',
      message: 'Transaction creator must be one of the participating teams.',
      team_id: graph.created_by_team_id,
      rule_ids: ['transaction-graph-shape'],
    });
  }

  for (const teamId of graph.team_ids) {
    if (!indexes.teams.has(teamId)) {
      addIssue(issues, {
        id: 'transaction-team-reference',
        message: `Transaction graph references missing team ${teamId}.`,
        team_id: teamId,
        rule_ids: ['transaction-graph-shape', 'league-dataset-completeness'],
      });
    }
  }

  if (graph.movements.length === 0) {
    addIssue(issues, {
      id: 'transaction-empty',
      message: 'Transaction graph must include at least one asset movement.',
      rule_ids: ['transaction-graph-shape'],
    });
  }

  for (const movement of graph.movements) {
    if (movement.from_team_id === movement.to_team_id) {
      addIssue(issues, {
        id: 'movement-same-team',
        message: 'Transaction movement must send assets to a different team.',
        team_id: movement.from_team_id,
        rule_ids: ['transaction-graph-shape'],
      });
    }

    if (!graphTeamIds.has(movement.from_team_id)) {
      addIssue(issues, {
        id: 'movement-from-team-not-in-graph',
        message: `Movement sender ${movement.from_team_id} is not in the transaction graph.`,
        team_id: movement.from_team_id,
        rule_ids: ['transaction-graph-shape'],
      });
    }

    if (!graphTeamIds.has(movement.to_team_id)) {
      addIssue(issues, {
        id: 'movement-to-team-not-in-graph',
        message: `Movement recipient ${movement.to_team_id} is not in the transaction graph.`,
        team_id: movement.to_team_id,
        rule_ids: ['transaction-graph-shape'],
      });
    }

    const fromDelta = deltas.get(movement.from_team_id);
    const toDelta = deltas.get(movement.to_team_id);

    if (!fromDelta || !toDelta) {
      continue;
    }

    if (movement.kind === 'player') {
      const player = indexes.players.get(movement.player_id);
      if (!player || !player.contract_id) {
        addIssue(issues, {
          id: 'player-movement-reference',
          message: `Player movement references missing contracted player ${movement.player_id}.`,
          player_id: movement.player_id,
          rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
        });
        continue;
      }

      const contract = indexes.contracts.get(player.contract_id);
      const fromTeam = indexes.teams.get(movement.from_team_id);
      if (!contract || contract.team_id !== movement.from_team_id) {
        addIssue(issues, {
          id: 'player-contract-team',
          message: `Player ${movement.player_id} is not under contract with sending team ${movement.from_team_id}.`,
          team_id: movement.from_team_id,
          player_id: movement.player_id,
          rule_ids: ['salary-cap-system', 'transaction-graph-shape'],
        });
        continue;
      }

      if (!fromTeam?.active_roster_player_ids.includes(movement.player_id)) {
        addIssue(issues, {
          id: 'player-roster-team',
          message: `Player ${movement.player_id} is not on sending team ${movement.from_team_id}'s active roster.`,
          team_id: movement.from_team_id,
          player_id: movement.player_id,
          rule_ids: ['roster-size', 'transaction-graph-shape'],
        });
      }

      if (
        isAfter(contract.trade_eligible_at, graph.league_date) ||
        isAfter(contract.recently_traded_until, graph.league_date)
      ) {
        addIssue(issues, {
          id: 'player-trade-eligibility',
          message: `Player ${movement.player_id} is not trade eligible on ${graph.league_date}.`,
          team_id: movement.from_team_id,
          player_id: movement.player_id,
          rule_ids: ['trade-player-eligibility'],
        });
      }

      const salary = firstSeasonSalary(contract, dataset.season_year);
      fromDelta.outgoing_player_ids.push(movement.player_id);
      fromDelta.salary_out_millions = money(fromDelta.salary_out_millions + salary);
      fromDelta.standard_roster_count_after -= 1;
      toDelta.incoming_player_ids.push(movement.player_id);
      toDelta.salary_in_millions = money(toDelta.salary_in_millions + salary);
      toDelta.standard_roster_count_after += 1;
      continue;
    }

    if (movement.kind === 'draft_asset') {
      const asset = indexes.draftAssets.get(movement.asset_id);
      if (!asset) {
        addIssue(issues, {
          id: 'draft-asset-reference',
          message: `Draft asset movement references missing asset ${movement.asset_id}.`,
          asset_id: movement.asset_id,
          rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
        });
        continue;
      }

      if (asset.current_owner_team_id !== movement.from_team_id) {
        addIssue(issues, {
          id: 'draft-asset-owner',
          message: `Draft asset ${movement.asset_id} is not owned by sending team ${movement.from_team_id}.`,
          team_id: movement.from_team_id,
          asset_id: movement.asset_id,
          rule_ids: ['draft-pick-ledger'],
        });
      }

      if (asset.encumbered) {
        addIssue(issues, {
          id: 'draft-asset-encumbered',
          message: `Draft asset ${movement.asset_id} is encumbered and cannot be previewed as tradeable.`,
          team_id: movement.from_team_id,
          asset_id: movement.asset_id,
          rule_ids: ['draft-pick-ledger'],
        });
      }

      for (const protection of asset.protections) {
        if (protection.converts_to_asset_ids.length === 0) {
          addIssue(issues, {
            id: 'draft-asset-protection-conveyance',
            message: `Draft asset ${movement.asset_id} has protection terms without conversion fallback assets.`,
            team_id: movement.from_team_id,
            asset_id: movement.asset_id,
            rule_ids: ['draft-pick-ledger', 'draft-stepien'],
          });
        }

        for (const conversionAssetId of protection.converts_to_asset_ids) {
          const conversionAsset = indexes.draftAssets.get(conversionAssetId);
          if (
            !conversionAsset ||
            conversionAsset.current_owner_team_id !== movement.from_team_id ||
            conversionAsset.encumbered
          ) {
            addIssue(issues, {
              id: 'draft-asset-protection-conveyance',
              message: `Draft asset ${movement.asset_id} has protection conversion ${conversionAssetId} that is not controlled as a tradeable fallback by sending team ${movement.from_team_id}.`,
              team_id: movement.from_team_id,
              asset_id: movement.asset_id,
              rule_ids: ['draft-pick-ledger', 'draft-stepien'],
            });
          }
        }
      }

      fromDelta.outgoing_draft_asset_ids.push(movement.asset_id);
      toDelta.incoming_draft_asset_ids.push(movement.asset_id);
      const outgoingDraftAssetIds =
        outgoingDraftAssetIdsByTeam.get(movement.from_team_id) ?? new Set<string>();
      outgoingDraftAssetIds.add(movement.asset_id);
      outgoingDraftAssetIdsByTeam.set(movement.from_team_id, outgoingDraftAssetIds);
      continue;
    }

    if (movement.kind === 'cash') {
      if (movement.amount_millions <= 0) {
        addIssue(issues, {
          id: 'cash-positive-amount',
          message: 'Cash movement amount must be greater than zero.',
          team_id: movement.from_team_id,
          rule_ids: ['trade-cash-limit'],
        });
      }

      fromDelta.outgoing_cash_millions = money(
        fromDelta.outgoing_cash_millions + movement.amount_millions
      );
      toDelta.incoming_cash_millions = money(
        toDelta.incoming_cash_millions + movement.amount_millions
      );
      continue;
    }

    const exceptionEntry = indexes.exceptions.get(movement.exception_id);
    if (!exceptionEntry || exceptionEntry.team_id !== movement.from_team_id) {
      addIssue(issues, {
        id: 'exception-owner',
        message: `Exception ${movement.exception_id} is not available to sending team ${movement.from_team_id}.`,
        team_id: movement.from_team_id,
        rule_ids: ['salary-cap-system', 'transaction-graph-shape'],
      });
      continue;
    }

    if (
      movement.amount_millions <= 0 ||
      movement.amount_millions > exceptionEntry.remaining_millions
    ) {
      addIssue(issues, {
        id: 'exception-amount',
        message: `Exception ${movement.exception_id} movement exceeds the remaining exception amount.`,
        team_id: movement.from_team_id,
        rule_ids: ['salary-cap-system'],
      });
    }

    fromDelta.outgoing_exception_ids.push(movement.exception_id);
    toDelta.incoming_exception_ids.push(movement.exception_id);
  }

  for (const delta of deltas.values()) {
    if (delta.outgoing_cash_millions > CBA_2026_CONSTANTS.trade_cash_limit_millions) {
      addIssue(issues, {
        id: 'cash-sent-limit',
        message: `Team ${delta.team_id} sends ${delta.outgoing_cash_millions}M, above the ${CBA_2026_CONSTANTS.trade_cash_limit_millions}M trade cash limit.`,
        team_id: delta.team_id,
        rule_ids: ['trade-cash-limit'],
      });
    }

    if (delta.incoming_cash_millions > CBA_2026_CONSTANTS.max_cash_received_millions) {
      addIssue(issues, {
        id: 'cash-received-limit',
        message: `Team ${delta.team_id} receives ${delta.incoming_cash_millions}M, above the ${CBA_2026_CONSTANTS.max_cash_received_millions}M cash received limit.`,
        team_id: delta.team_id,
        rule_ids: ['trade-cash-limit'],
      });
    }

    if (delta.standard_roster_count_after > CBA_2026_CONSTANTS.standard_roster_limit) {
      addIssue(issues, {
        id: 'roster-limit-after-trade',
        message: `Team ${delta.team_id} would have ${delta.standard_roster_count_after} standard roster players after the trade.`,
        team_id: delta.team_id,
        rule_ids: ['roster-size'],
      });
    }

    delta.salary_delta_millions = money(delta.salary_in_millions - delta.salary_out_millions);
    delta.tax_salary_after_millions = money(
      delta.tax_salary_after_millions + delta.salary_delta_millions
    );

    const team = indexes.teams.get(delta.team_id);
    if (!team) {
      continue;
    }

    if (
      delta.incoming_player_ids.length > 0 &&
      delta.salary_in_millions > 0 &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.salary_cap_millions
    ) {
      const allowedIncomingSalary = money(
        salaryMatchLimit(delta.salary_out_millions, delta.tax_salary_after_millions)
      );

      if (delta.salary_in_millions > allowedIncomingSalary) {
        addIssue(issues, {
          id: 'salary-matching',
          message: `Team ${delta.team_id} receives ${delta.salary_in_millions}M in salary but can match only ${allowedIncomingSalary}M.`,
          team_id: delta.team_id,
          rule_ids: ['trade-salary-matching', 'salary-cap-system'],
        });
      }
    }

    if (
      delta.salary_in_millions > delta.salary_out_millions &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.first_apron_millions
    ) {
      addIssue(issues, {
        id: 'first-apron-incoming-salary',
        message: `Team ${delta.team_id} would finish above the first apron while taking back more salary than it sends out.`,
        team_id: delta.team_id,
        rule_ids: ['apron-system', 'trade-salary-matching'],
      });
    }

    if (
      delta.outgoing_cash_millions > 0 &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.second_apron_millions
    ) {
      addIssue(issues, {
        id: 'second-apron-cash',
        message: `Team ${delta.team_id} would finish above the second apron and cannot send cash in a trade.`,
        team_id: delta.team_id,
        rule_ids: ['apron-system', 'trade-cash-limit'],
      });
    }

    if (
      usesAggregatedSalary(delta) &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.second_apron_millions
    ) {
      addIssue(issues, {
        id: 'second-apron-aggregation',
        message: `Team ${delta.team_id} would finish above the second apron and cannot aggregate outgoing salaries.`,
        team_id: delta.team_id,
        rule_ids: ['apron-system', 'trade-salary-matching'],
      });
    }

    if (
      team.hard_capped_at_first_apron &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.first_apron_millions
    ) {
      addIssue(issues, {
        id: 'hard-cap-first-apron',
        message: `Team ${delta.team_id} is hard-capped at the first apron and would exceed it after the transaction.`,
        team_id: delta.team_id,
        rule_ids: ['apron-system'],
      });
    }

    if (
      team.hard_capped_at_second_apron &&
      delta.tax_salary_after_millions > CBA_2026_CONSTANTS.second_apron_millions
    ) {
      addIssue(issues, {
        id: 'hard-cap-second-apron',
        message: `Team ${delta.team_id} is hard-capped at the second apron and would exceed it after the transaction.`,
        team_id: delta.team_id,
        rule_ids: ['apron-system'],
      });
    }
  }

  for (const [teamId, outgoingDraftAssetIds] of outgoingDraftAssetIdsByTeam) {
    const outgoingFirstRoundPick = [...outgoingDraftAssetIds].some((assetId) => {
      const asset = indexes.draftAssets.get(assetId);
      return asset?.kind === 'pick' && asset.round === 1;
    });

    if (
      outgoingFirstRoundPick &&
      !validateStepienWindows(dataset, teamId, outgoingDraftAssetIds)
    ) {
      addIssue(issues, {
        id: 'draft-stepien',
        message: `Team ${teamId} would not retain first-round coverage in every rolling two-year future draft window after the pick trade.`,
        team_id: teamId,
        rule_ids: ['draft-stepien', 'draft-pick-ledger'],
      });
    }
  }

  const report = buildValidationReport(issues, checkedAt);
  const citations = collectCitations(issues);

  return {
    graph_id: graph.id,
    validation_report: report,
    team_deltas: [...deltas.values()],
    citations: citations.length > 0 ? citations : CBA_2026_CITATIONS,
    suggested_fixes: buildSuggestedFixes(issues),
  };
}
