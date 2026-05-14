# Front-Office Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable foundation for the near-real front-office offseason simulator: shared domain types, versioned CBA constants/citations, and strict validated league datasets.

**Architecture:** This plan deliberately avoids UI, routes, transaction execution, and counterparty logic. It creates a typed domain model in `shared/`, then server-owned CBA data and a fail-closed dataset validator that later transaction/calendar/draft/free-agency engines can depend on. Validation returns structured issues with CBA citations so future UI panels can show exact rule references without duplicating rules client-side.

**Tech Stack:** TypeScript strict mode, shared package exports, Vitest, existing pnpm workspace scripts.

---

## Scope Check

The approved spec covers multiple independent subsystems: dataset ingestion, CBA validation, transaction graphs, calendar, draft, free agency, counterparty logic, and UI. This plan covers only the foundation subsystem that all other plans need:

- shared front-office domain types
- versioned 2026 CBA constants
- rule citation registry
- strict league dataset validation
- tests proving complete datasets pass and incomplete datasets fail closed

Follow-up plans should cover transaction graphs, calendar, draft, free agency/contracts, counterparty acceptance, and front-office UI.

## File Structure

- Create `shared/src/offseason/frontOffice/schema.ts`
  - Shared domain types for league state, teams, contracts, rights, draft assets, citations, validation issues, and datasets.
- Create `shared/src/offseason/frontOffice/index.ts`
  - Shared export barrel.
- Modify `shared/index.ts`
  - Export the new front-office shared module.
- Create `shared/src/offseason/frontOffice/schema.test.ts`
  - Type/runtime smoke tests for pure helper constants.
- Create `server/src/offseason/cba/constants/2026.ts`
  - Versioned CBA constants used by validators.
- Create `server/src/offseason/cba/citations/2026.ts`
  - Versioned citation registry with exact rule ids used by validation output.
- Create `server/src/offseason/cba/validationTypes.ts`
  - Server validation result helpers.
- Create `server/src/offseason/cba/validateLeagueDataset.ts`
  - Strict dataset validator.
- Create `server/src/offseason/cba/fixtures.ts`
  - Minimal complete 30-team dataset builder for tests.
- Create `server/src/offseason/cba/validateLeagueDataset.test.ts`
  - Tests for successful validation and fail-closed data errors.

## Task 1: Shared Front-Office Domain Types

**Files:**
- Create: `shared/src/offseason/frontOffice/schema.ts`
- Create: `shared/src/offseason/frontOffice/index.ts`
- Modify: `shared/index.ts`
- Test: `shared/src/offseason/frontOffice/schema.test.ts`

- [ ] **Step 1: Write the shared schema smoke test**

Create `shared/src/offseason/frontOffice/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FRONT_OFFICE_DATASET_SCHEMA_VERSION,
  FRONT_OFFICE_LEAGUE_TEAM_COUNT,
  FRONT_OFFICE_VALIDATION_STATUSES,
} from './schema';

describe('front office shared schema constants', () => {
  it('defines stable foundation constants', () => {
    expect(FRONT_OFFICE_DATASET_SCHEMA_VERSION).toBe(1);
    expect(FRONT_OFFICE_LEAGUE_TEAM_COUNT).toBe(30);
    expect(FRONT_OFFICE_VALIDATION_STATUSES).toEqual([
      'valid',
      'warning',
      'invalid',
    ]);
  });
});
```

- [ ] **Step 2: Run the failing shared test**

Run:

```bash
pnpm --filter @nba-draft-sim/shared test -- src/offseason/frontOffice/schema.test.ts --run
```

Expected: FAIL because `./schema` does not exist.

- [ ] **Step 3: Create the shared domain schema**

Create `shared/src/offseason/frontOffice/schema.ts`:

```ts
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
```

- [ ] **Step 4: Create the shared front-office export barrel**

Create `shared/src/offseason/frontOffice/index.ts`:

```ts
export * from './schema';
```

- [ ] **Step 5: Export the module from the shared package**

Modify `shared/index.ts` by adding this line after the existing offseason schema export:

```ts
export * from './src/offseason/frontOffice';
```

The final file should include:

```ts
export * from './types';
export * from './utils';
export * from './schemas';
export * from './src/config/featureFlags';
export * from './src/offseason/schema';
export * from './src/offseason/frontOffice';
```

- [ ] **Step 6: Run the shared test**

Run:

```bash
pnpm --filter @nba-draft-sim/shared test -- src/offseason/frontOffice/schema.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit shared domain types**

Run:

```bash
git add shared/index.ts shared/src/offseason/frontOffice/schema.ts shared/src/offseason/frontOffice/index.ts shared/src/offseason/frontOffice/schema.test.ts
git commit -m "Add front office shared domain types"
```

## Task 2: Versioned CBA Constants And Citations

**Files:**
- Create: `server/src/offseason/cba/constants/2026.ts`
- Create: `server/src/offseason/cba/citations/2026.ts`
- Test: `server/src/offseason/cba/constants.test.ts`

- [ ] **Step 1: Write the failing CBA constants test**

Create `server/src/offseason/cba/constants.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CBA_2026_CONSTANTS } from './constants/2026';
import { CBA_2026_CITATIONS, findCbaCitation } from './citations/2026';

describe('2026 CBA constants and citations', () => {
  it('exposes cap, tax, apron, roster, and cash constants', () => {
    expect(CBA_2026_CONSTANTS.season_year).toBe(2026);
    expect(CBA_2026_CONSTANTS.salary_cap_millions).toBeGreaterThan(0);
    expect(CBA_2026_CONSTANTS.luxury_tax_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.salary_cap_millions
    );
    expect(CBA_2026_CONSTANTS.first_apron_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.luxury_tax_millions
    );
    expect(CBA_2026_CONSTANTS.second_apron_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.first_apron_millions
    );
    expect(CBA_2026_CONSTANTS.standard_roster_limit).toBe(15);
    expect(CBA_2026_CONSTANTS.two_way_roster_limit).toBe(3);
    expect(CBA_2026_CONSTANTS.trade_cash_limit_millions).toBeGreaterThan(0);
  });

  it('can look up citations by rule id', () => {
    expect(CBA_2026_CITATIONS.length).toBeGreaterThanOrEqual(6);
    expect(findCbaCitation('league-dataset-completeness')?.title).toBe(
      'Complete league dataset required'
    );
    expect(findCbaCitation('salary-cap-system')?.url).toContain('nba.com');
  });
});
```

- [ ] **Step 2: Run the failing CBA constants test**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/constants.test.ts
```

Expected: FAIL because the constants and citations modules do not exist.

- [ ] **Step 3: Create 2026 CBA constants**

Create `server/src/offseason/cba/constants/2026.ts`:

```ts
export interface CbaSeasonConstants {
  season_year: number;
  rules_version: string;
  salary_cap_millions: number;
  luxury_tax_millions: number;
  first_apron_millions: number;
  second_apron_millions: number;
  standard_roster_limit: number;
  standard_roster_minimum: number;
  two_way_roster_limit: number;
  max_cash_received_millions: number;
  trade_cash_limit_millions: number;
}

export const CBA_2026_CONSTANTS: CbaSeasonConstants = {
  season_year: 2026,
  rules_version: '2026-upcoming-offseason-v1',
  salary_cap_millions: 154.6,
  luxury_tax_millions: 187.9,
  first_apron_millions: 195.9,
  second_apron_millions: 207.8,
  standard_roster_limit: 15,
  standard_roster_minimum: 14,
  two_way_roster_limit: 3,
  max_cash_received_millions: 7.6,
  trade_cash_limit_millions: 7.6,
};
```

- [ ] **Step 4: Create 2026 citation registry**

Create `server/src/offseason/cba/citations/2026.ts`:

```ts
import { FrontOfficeRuleCitation } from '@nba-draft-sim/shared';

export const CBA_2026_CITATIONS: FrontOfficeRuleCitation[] = [
  {
    rule_id: 'league-dataset-completeness',
    title: 'Complete league dataset required',
    source: 'nba_cba',
    locator: 'Implementation gate derived from CBA-dependent roster, salary, rights, and transaction rules',
    url: 'https://nbpa.com/cba',
    summary:
      'A near-real offseason simulator must know each team roster, contract, rights, exceptions, and draft obligations before issuing legal rulings.',
  },
  {
    rule_id: 'salary-cap-system',
    title: 'Salary cap and team salary system',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: Salary Cap and Tax Level overview',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Team transaction legality depends on salary cap, tax, apron, exceptions, and team salary calculations.',
  },
  {
    rule_id: 'roster-size',
    title: 'Standard and two-way roster limits',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: roster composition concepts',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Teams must maintain legal standard and two-way roster counts during offseason compliance checks.',
  },
  {
    rule_id: 'draft-pick-ledger',
    title: 'Draft pick ownership and trade restrictions',
    source: 'nba_cba',
    locator: 'CBA draft and trade rules; exact article/section to be attached when encoding pick validators',
    url: 'https://nbpa.com/cba',
    summary:
      'Draft assets require exact ownership, protection, swap, conveyance, and encumbrance data before pick trades can be validated.',
  },
  {
    rule_id: 'free-agent-rights',
    title: 'Free-agent rights and cap holds',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: free agency, exceptions, and cap holds',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Free-agent cap holds and rights affect team salary and contract tools.',
  },
  {
    rule_id: 'apron-system',
    title: 'First apron and second apron system',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: apron restrictions',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Teams above apron thresholds face transaction restrictions that validators must consider.',
  },
];

export function findCbaCitation(
  ruleId: string
): FrontOfficeRuleCitation | undefined {
  return CBA_2026_CITATIONS.find((citation) => citation.rule_id === ruleId);
}
```

- [ ] **Step 5: Run the CBA constants test**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/constants.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit CBA constants and citations**

Run:

```bash
git add server/src/offseason/cba/constants/2026.ts server/src/offseason/cba/citations/2026.ts server/src/offseason/cba/constants.test.ts
git commit -m "Add versioned CBA constants and citations"
```

## Task 3: Validation Result Helpers

**Files:**
- Create: `server/src/offseason/cba/validationTypes.ts`
- Test: `server/src/offseason/cba/validationTypes.test.ts`

- [ ] **Step 1: Write failing validation helper tests**

Create `server/src/offseason/cba/validationTypes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildInvalidIssue,
  buildValidationReport,
  validationStatusFromIssues,
} from './validationTypes';

describe('CBA validation result helpers', () => {
  it('returns valid when no issues exist', () => {
    expect(validationStatusFromIssues([])).toBe('valid');
    expect(buildValidationReport([], '2026-05-14T00:00:00.000Z')).toEqual({
      status: 'valid',
      issues: [],
      checked_at: '2026-05-14T00:00:00.000Z',
    });
  });

  it('returns invalid when an invalid issue exists', () => {
    const issue = buildInvalidIssue({
      id: 'missing-team',
      message: 'Team is missing.',
      rule_ids: ['league-dataset-completeness'],
      team_id: 1,
    });

    expect(validationStatusFromIssues([issue])).toBe('invalid');
    expect(issue.status).toBe('invalid');
    expect(issue.team_id).toBe(1);
  });
});
```

- [ ] **Step 2: Run failing validation helper tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/validationTypes.test.ts
```

Expected: FAIL because `validationTypes.ts` does not exist.

- [ ] **Step 3: Create validation helpers**

Create `server/src/offseason/cba/validationTypes.ts`:

```ts
import {
  FrontOfficeValidationIssue,
  FrontOfficeValidationReport,
  FrontOfficeValidationStatus,
} from '@nba-draft-sim/shared';

export type CbaValidationIssueInput = Omit<
  FrontOfficeValidationIssue,
  'status'
>;

export function buildInvalidIssue(
  input: CbaValidationIssueInput
): FrontOfficeValidationIssue {
  return {
    ...input,
    status: 'invalid',
  };
}

export function validationStatusFromIssues(
  issues: FrontOfficeValidationIssue[]
): FrontOfficeValidationStatus {
  if (issues.some((issue) => issue.status === 'invalid')) {
    return 'invalid';
  }

  if (issues.some((issue) => issue.status === 'warning')) {
    return 'warning';
  }

  return 'valid';
}

export function buildValidationReport(
  issues: FrontOfficeValidationIssue[],
  checkedAt: string
): FrontOfficeValidationReport {
  return {
    status: validationStatusFromIssues(issues),
    issues,
    checked_at: checkedAt,
  };
}
```

- [ ] **Step 4: Run validation helper tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/validationTypes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit validation helpers**

Run:

```bash
git add server/src/offseason/cba/validationTypes.ts server/src/offseason/cba/validationTypes.test.ts
git commit -m "Add CBA validation result helpers"
```

## Task 4: Complete Dataset Fixture Builder

**Files:**
- Create: `server/src/offseason/cba/fixtures.ts`
- Test: `server/src/offseason/cba/fixtures.test.ts`

- [ ] **Step 1: Write failing fixture tests**

Create `server/src/offseason/cba/fixtures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCompleteFrontOfficeDataset } from './fixtures';

describe('front office dataset fixtures', () => {
  it('builds a complete 30-team dataset for validator tests', () => {
    const dataset = buildCompleteFrontOfficeDataset();

    expect(dataset.teams).toHaveLength(30);
    expect(dataset.players).toHaveLength(30);
    expect(dataset.contracts).toHaveLength(30);
    expect(dataset.free_agent_rights).toHaveLength(30);
    expect(dataset.exceptions).toHaveLength(30);
    expect(dataset.draft_assets).toHaveLength(60);
    expect(new Set(dataset.teams.map((team) => team.identity.id)).size).toBe(30);
  });
});
```

- [ ] **Step 2: Run failing fixture tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/fixtures.test.ts
```

Expected: FAIL because `fixtures.ts` does not exist.

- [ ] **Step 3: Create complete dataset fixture builder**

Create `server/src/offseason/cba/fixtures.ts`:

```ts
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
      rights_player_ids: [playerId + 500000],
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
      return [
        {
          id: playerId,
          full_name: `Player ${abbreviation}`,
          position: 'SF',
          roster_slot: 'standard',
          contract_id: `${abbreviation}-contract-${playerId}`,
          rights_team_id: null,
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
```

- [ ] **Step 4: Run fixture tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/fixtures.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit fixture builder**

Run:

```bash
git add server/src/offseason/cba/fixtures.ts server/src/offseason/cba/fixtures.test.ts
git commit -m "Add front office dataset fixtures"
```

## Task 5: Strict League Dataset Validator

**Files:**
- Create: `server/src/offseason/cba/validateLeagueDataset.ts`
- Test: `server/src/offseason/cba/validateLeagueDataset.test.ts`

- [ ] **Step 1: Write failing validator tests**

Create `server/src/offseason/cba/validateLeagueDataset.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCompleteFrontOfficeDataset } from './fixtures';
import { validateLeagueDataset } from './validateLeagueDataset';

describe('validateLeagueDataset', () => {
  it('passes a complete 30-team fixture dataset', () => {
    const report = validateLeagueDataset(
      buildCompleteFrontOfficeDataset(),
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('valid');
    expect(report.issues).toEqual([]);
  });

  it('fails closed when the league does not include all 30 teams', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams = dataset.teams.slice(0, 29);

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'league-team-count',
        message: 'League dataset must include exactly 30 teams.',
        rule_ids: ['league-dataset-completeness'],
      })
    );
  });

  it('fails when a roster player references a missing contract', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.players[0] = {
      ...dataset.players[0],
      contract_id: 'missing-contract',
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'player-contract-reference',
        player_id: dataset.players[0].id,
        rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
      })
    );
  });

  it('fails when a team references a missing draft asset', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams[0] = {
      ...dataset.teams[0],
      draft_asset_ids: ['missing-pick'],
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'team-draft-asset-reference',
        team_id: dataset.teams[0].identity.id,
        asset_id: 'missing-pick',
        rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
      })
    );
  });

  it('fails when duplicate player ids exist', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.players[1] = {
      ...dataset.players[1],
      id: dataset.players[0].id,
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'duplicate-player-id',
        player_id: dataset.players[0].id,
        rule_ids: ['league-dataset-completeness'],
      })
    );
  });
});
```

- [ ] **Step 2: Run failing validator tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/validateLeagueDataset.test.ts
```

Expected: FAIL because `validateLeagueDataset.ts` does not exist.

- [ ] **Step 3: Create strict dataset validator**

Create `server/src/offseason/cba/validateLeagueDataset.ts`:

```ts
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
```

- [ ] **Step 4: Run validator tests**

Run:

```bash
pnpm --filter nba-draft-sim-server test -- cba/validateLeagueDataset.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit dataset validator**

Run:

```bash
git add server/src/offseason/cba/validateLeagueDataset.ts server/src/offseason/cba/validateLeagueDataset.test.ts
git commit -m "Add strict front office dataset validator"
```

## Task 6: Foundation Quality Gate

**Files:**
- Modify: none unless checks reveal a compile error in files from Tasks 1-5.

- [ ] **Step 1: Run focused front-office tests**

Run:

```bash
pnpm --filter @nba-draft-sim/shared test -- src/offseason/frontOffice/schema.test.ts --run
pnpm --filter nba-draft-sim-server test -- cba
```

Expected: PASS for shared schema and all CBA foundation tests.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS. The existing Vite chunk-size warning is acceptable if no new build errors appear.

- [ ] **Step 4: Update project truth file**

Modify `.tracker/PROJECT_TRUTH.md` so it records the foundation state. Set `nextStep` to:

```yaml
nextStep: "Implement the front-office transaction graph after the shared domain, CBA constants, citations, and strict dataset validator foundation."
```

Add this sentence to the end of `## Quality Ladder Notes`:

```md
On 2026-05-14, the first front-office simulator foundation slice added shared domain types, versioned CBA constants/citations, a strict league dataset validator, and focused Vitest coverage; `pnpm typecheck` and `pnpm build` passed.
```

- [ ] **Step 5: Commit truth file update**

Run:

```bash
git add .tracker/PROJECT_TRUTH.md
git commit -m "Update project truth for front office foundation"
```

## Plan Self-Review

- Spec coverage: This plan covers the foundation subset of the approved spec: shared domain model, CBA constants/citations, fail-closed dataset validation, and tests. Transaction graph, calendar, draft, free agency, counterparty logic, and UI are intentionally separate follow-up plans.
- Placeholder scan: No placeholder task text is present.
- Type consistency: File paths, exported names, and imports are consistent across tasks.
