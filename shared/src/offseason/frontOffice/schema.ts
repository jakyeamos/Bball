export const FRONT_OFFICE_DATASET_SCHEMA_VERSION = 1;
export const FRONT_OFFICE_LEAGUE_TEAM_COUNT = 30;
export const FRONT_OFFICE_VALIDATION_STATUSES = [
  'valid',
  'warning',
  'invalid',
] as const;

export type FrontOfficeValidationStatus =
  (typeof FRONT_OFFICE_VALIDATION_STATUSES)[number];

export type FrontOfficeConference = 'East' | 'West';
export type FrontOfficeRosterSlot = 'standard' | 'two_way' | 'rights';
export type FrontOfficeContractOptionType =
  | 'none'
  | 'team'
  | 'player'
  | 'mutual';
export type FrontOfficeGuaranteeType =
  | 'fully_guaranteed'
  | 'partially_guaranteed'
  | 'non_guaranteed';
export type FrontOfficeRightsType =
  | 'none'
  | 'bird'
  | 'early_bird'
  | 'non_bird'
  | 'restricted';
export type FrontOfficeApronStatus =
  | 'below_tax'
  | 'tax'
  | 'first_apron'
  | 'second_apron';
export type FrontOfficeTeamTimeline =
  | 'rebuilding'
  | 'transitioning'
  | 'contending';
export type FrontOfficeDraftAssetKind = 'pick' | 'swap';
export type FrontOfficeDraftPickRound = 1 | 2;
export type FrontOfficeTransactionMovementKind =
  | 'player'
  | 'draft_asset'
  | 'cash'
  | 'exception';

export interface FrontOfficeRuleCitation {
  rule_id: string;
  title: string;
  source: 'nba_cba' | 'nba_cba_101' | 'nbpa_cba_page' | 'nba_release';
  locator: string;
  url: string;
  summary: string;
}

export interface FrontOfficeValidationIssue {
  id: string;
  status: Exclude<FrontOfficeValidationStatus, 'valid'>;
  message: string;
  team_id?: number;
  player_id?: number;
  asset_id?: string;
  rule_ids: string[];
}

export interface FrontOfficeValidationReport {
  status: FrontOfficeValidationStatus;
  issues: FrontOfficeValidationIssue[];
  checked_at: string;
}

export interface FrontOfficeTransactionPlayerMovement {
  kind: 'player';
  from_team_id: number;
  to_team_id: number;
  player_id: number;
}

export interface FrontOfficeTransactionDraftAssetMovement {
  kind: 'draft_asset';
  from_team_id: number;
  to_team_id: number;
  asset_id: string;
}

export interface FrontOfficeTransactionCashMovement {
  kind: 'cash';
  from_team_id: number;
  to_team_id: number;
  amount_millions: number;
}

export interface FrontOfficeTransactionExceptionMovement {
  kind: 'exception';
  from_team_id: number;
  to_team_id: number;
  exception_id: string;
  amount_millions: number;
}

export type FrontOfficeTransactionMovement =
  | FrontOfficeTransactionPlayerMovement
  | FrontOfficeTransactionDraftAssetMovement
  | FrontOfficeTransactionCashMovement
  | FrontOfficeTransactionExceptionMovement;

export interface FrontOfficeTransactionGraph {
  id: string;
  league_date: string;
  created_by_team_id: number;
  team_ids: number[];
  movements: FrontOfficeTransactionMovement[];
}

export interface FrontOfficeTransactionTeamDelta {
  team_id: number;
  outgoing_player_ids: number[];
  incoming_player_ids: number[];
  outgoing_draft_asset_ids: string[];
  incoming_draft_asset_ids: string[];
  outgoing_exception_ids: string[];
  incoming_exception_ids: string[];
  outgoing_cash_millions: number;
  incoming_cash_millions: number;
  salary_out_millions: number;
  salary_in_millions: number;
  salary_delta_millions: number;
  tax_salary_after_millions: number;
  standard_roster_count_after: number;
}

export interface FrontOfficeTransactionPreview {
  graph_id: string;
  validation_report: FrontOfficeValidationReport;
  team_deltas: FrontOfficeTransactionTeamDelta[];
  citations: FrontOfficeRuleCitation[];
  suggested_fixes: string[];
}

export interface FrontOfficeTeamIdentity {
  id: number;
  abbreviation: string;
  city: string;
  name: string;
  full_name: string;
  conference: FrontOfficeConference;
  division: string;
}

export interface FrontOfficeContractSeason {
  season_year: number;
  salary_millions: number;
  guarantee_type: FrontOfficeGuaranteeType;
  guaranteed_millions: number;
  option_type: FrontOfficeContractOptionType;
}

export interface FrontOfficePlayerContract {
  id: string;
  player_id: number;
  team_id: number;
  signed_at: string;
  seasons: FrontOfficeContractSeason[];
  bird_rights_type: FrontOfficeRightsType;
  years_of_service: number;
  trade_eligible_at: string | null;
  recently_traded_until: string | null;
}

export interface FrontOfficePlayer {
  id: number;
  full_name: string;
  position: string;
  roster_slot: FrontOfficeRosterSlot;
  contract_id: string | null;
  rights_team_id: number | null;
}

export interface FrontOfficeFreeAgentRights {
  player_id: number;
  team_id: number;
  rights_type: FrontOfficeRightsType;
  cap_hold_millions: number;
  qualifying_offer_millions: number | null;
  offer_sheet_match_deadline: string | null;
}

export interface FrontOfficeExceptionLedgerEntry {
  id: string;
  team_id: number;
  type:
    | 'non_taxpayer_mle'
    | 'taxpayer_mle'
    | 'room_exception'
    | 'bi_annual'
    | 'trade_exception';
  amount_millions: number;
  remaining_millions: number;
  expires_at: string;
}

export interface FrontOfficeDraftProtection {
  year: number;
  protected_picks: number[];
  converts_to_asset_ids: string[];
}

export interface FrontOfficeDraftAsset {
  id: string;
  kind: FrontOfficeDraftAssetKind;
  year: number;
  round: FrontOfficeDraftPickRound;
  original_team_id: number;
  current_owner_team_id: number;
  encumbered: boolean;
  protections: FrontOfficeDraftProtection[];
  notes: string[];
}

export interface FrontOfficeTeamState {
  identity: FrontOfficeTeamIdentity;
  timeline: FrontOfficeTeamTimeline;
  apron_status: FrontOfficeApronStatus;
  hard_capped_at_first_apron: boolean;
  hard_capped_at_second_apron: boolean;
  tax_salary_millions: number;
  active_roster_player_ids: number[];
  two_way_player_ids: number[];
  rights_player_ids: number[];
  contract_ids: string[];
  exception_ids: string[];
  draft_asset_ids: string[];
  needs: string[];
}

export interface FrontOfficeLeagueDataset {
  schema_version: typeof FRONT_OFFICE_DATASET_SCHEMA_VERSION;
  dataset_version: string;
  season_year: number;
  generated_at: string;
  source_snapshot: string;
  patch_version: string;
  teams: FrontOfficeTeamState[];
  players: FrontOfficePlayer[];
  contracts: FrontOfficePlayerContract[];
  free_agent_rights: FrontOfficeFreeAgentRights[];
  exceptions: FrontOfficeExceptionLedgerEntry[];
  draft_assets: FrontOfficeDraftAsset[];
}
