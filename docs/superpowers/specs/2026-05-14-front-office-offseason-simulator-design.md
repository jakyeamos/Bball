# Front-Office Offseason Simulator Design

## Status

Approved for planning.

## Source Baseline

The simulator targets the current NBA collective bargaining agreement cycle. The NBA and NBPA announced the signed long-form CBA with an effective term beginning July 1, 2023 and running through the 2029-30 season. NBA CBA 101 materials define the core system concepts this simulator must model, including salary cap, tax level, first apron, second apron, exceptions, moratorium timing, sign-and-trade effects, and trade restrictions.

Primary rule sources:

- NBPA CBA page: https://nbpa.com/cba
- NBA CBA signed release: https://www.nba.com/news/nba-collective-bargaining-agreement-signed
- NBA CBA 101 PDF: https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf

Implementation must verify exact section/page citations from the authoritative CBA PDF and NBA CBA 101 before encoding each rule. Citations are part of the product output, not only developer documentation.

## Goal

Replace the current simplified offseason simulator with a near-real NBA front-office offseason simulator for the upcoming offseason. The user controls one NBA team. The other 29 teams maintain complete league state and react to user proposals as rule-aware counterparties.

The simulator should be comprehensive enough that a user can make real front-office decisions: draft, trade, sign, renounce, extend, exercise options, manage exceptions, navigate aprons, and finish with a legally compliant roster.

## Product Shape

The offseason simulator becomes a full 30-team league-state product rather than a single-team phase wizard.

The user chooses one team to control. Every team has roster, contracts, free-agent rights, cap holds, exceptions, draft assets, apron status, tax status, hard-cap state, transaction history, and front-office priorities. Non-user teams do not run fully autonomous offseason plans in v1, but they use their state to accept, reject, or counter user-initiated proposals after legality passes.

The current flow of Team Context, Coaching Market, Scouting, Trade Market, Draft Night, Free Agency, and Recap is replaced by a front-office operating system organized around the real offseason calendar and legal transactions.

## Scope Decisions

- Target only the upcoming NBA offseason.
- Model all 30 teams.
- Require a complete validated league dataset before a run can start.
- Use live-ish public data ingestion plus mandatory patch files for missing or disputed CBA fields.
- Default to real post-lottery draft order once available, but support a pre-lottery start that simulates lottery odds.
- Include a full two-round draft where all 30 teams pick.
- Support real draft-pick rules: protections, swaps, conveyance, Stepien constraints, encumbrances, and trade eligibility.
- Include full free-agency contract tools: max contracts, minimums, exceptions, Bird/Early Bird/Non-Bird rights, rookie scale, restricted free agency, qualifying offers, offer sheets, matching, and sign-and-trades.
- Include full trade legality from v1: salary matching, first/second apron rules, hard-cap triggers, aggregation limits, recently signed/recently traded restrictions, cash, trade exceptions, draft-pick legality, sign-and-trade legality, and multi-team trades.
- Keep player agency minimal. Players primarily accept or reject based on offer strength and legality rather than rich personality preferences.
- Store CBA constants and rule citations in versioned code/JSON files. Do not add an admin rules editor yet.
- Replace the current offseason route when the new simulator reaches usable parity.

## Non-Goals

- Historical offseasons.
- Multi-year franchise continuity.
- Autonomous offseasons for the other 29 teams.
- Admin editing of CBA rules/constants.
- Perfect proprietary data coverage without manual patches.
- Hiding CBA complexity behind a simplified wizard.

## Domain Model

The core engine should be independent of UI pages and API handlers.

Key models:

- `LeagueOffseasonState`: season year, league date, league constants version, dataset version, all teams, draft order, transaction log, calendar state.
- `TeamState`: identity, roster, two-way slots, cap sheet, tax/apron status, hard-cap status, free-agent rights, cap holds, exceptions, draft assets, team needs, front-office priorities.
- `PlayerContract`: salary by year, guarantees, options, incentives, trade restrictions, Bird clock, years of service, signing date, trade eligibility dates.
- `FreeAgentRights`: rights type, RFA status, qualifying offer state, cap hold, offer sheet status, matching deadline.
- `DraftAssetLedger`: original team, current owner, year, round, protection terms, swap rights, obligations, encumbrance state, Stepien availability.
- `TransactionGraph`: two or more teams, outgoing/incoming players, picks, rights, cash, exceptions, generated exceptions, sign-and-trade contracts, and execution metadata.
- `RuleCitation`: rule id, rule name, source document, article/section/page when available, URL, short summary, and affected entities.

Shared TypeScript contracts belong in `shared/`. Server-side rule implementation belongs in focused CBA/offseason modules. UI consumes validation output, not duplicated CBA logic.

## Rules Engine

The rules engine is the foundation of the product. It must fail closed: if required data is missing, the transaction or run is invalid.

Suggested module structure:

- `shared/src/offseason/frontOffice/` for shared state and payload types.
- `server/src/offseason/cba/constants/2026.ts` for cap, tax, apron, exception, rookie scale, minimum, max, and moratorium constants.
- `server/src/offseason/cba/citations/*.json` for source references.
- `server/src/offseason/cba/rules/*.ts` for validators.
- `server/src/offseason/cba/validateLeagueState.ts` for start-dataset validation.
- `server/src/offseason/cba/validateTransaction.ts` for transaction validation.
- `server/src/offseason/cba/executeTransaction.ts` for applying validated transactions.

Every validation result returns:

- `status`: `valid`, `warning`, or `invalid`
- affected teams/assets
- computed cap, tax, apron, roster, exception, and pick deltas
- blocking reasons
- rule citations
- deterministic suggested fixes when possible

Legality and strategy are separate. A transaction can be legal but strategically poor. Counterparty acceptance only runs after legality passes.

## Dataset Pipeline

The simulator uses live-ish public data ingestion plus mandatory patch files.

Pipeline:

1. Ingest identity, roster, basic player, draft order, lottery odds, and stat context through the existing NBA data pipeline where possible.
2. Ingest salary, contract, option, rights, exception, pick obligation, and cap/apron data from public sources where practical.
3. Normalize into a canonical `LeagueDataset`.
4. Apply manually maintained patch files for missing or disputed fields.
5. Validate the complete dataset.
6. Mark the dataset usable only if validation passes.

Dataset validation requires:

- all 30 teams present
- no duplicate player, contract, team, or pick ownership
- every player has either a contract or a free-agent rights state
- every contract has salary, guarantee, option, restriction, signing, and eligibility metadata
- every team has cap holds, exceptions, apron/tax/hard-cap state, roster counts, and rights
- every first- and second-round draft asset has owner, original team, protections, swaps, obligations, and tradeability state
- lottery mode is either simulated from odds or locked to real results
- every CBA-critical field is sourced or explicitly patched

Datasets include `datasetVersion`, `seasonYear`, `generatedAt`, `sourceSnapshot`, `patchVersion`, and validation report metadata. Runs reference the dataset version so they are reproducible.

## Calendar Flow

The simulator runs on a real offseason calendar. Available actions are gated by date and league state.

Calendar phases:

- draft lottery setup/result
- pre-draft evaluation and pick-trade window
- NBA Draft, full two rounds
- team/player option decisions
- qualifying offers
- moratorium
- free-agency negotiation/signing window
- trade window
- extensions
- final roster cutdown and compliance audit

Some actions may be built before they can be executed. Some agreements can be held as pending and finalized when the calendar allows. Some actions trigger hard-cap or apron restrictions immediately.

## Trade System

Trades use a transaction graph, not a Team A to Team B form.

Requirements:

- support 2+ teams
- each team can send and receive players, picks, rights, cash, exceptions, and sign-and-trade contracts
- live validation as the user builds
- per-team and whole-transaction legality
- salary matching by team status
- first-apron and second-apron restrictions
- hard-cap triggers
- aggregation restrictions
- recently signed and recently traded restrictions
- generated and consumed trade exceptions
- cash limits
- Stepien, protections, swaps, conveyance, frozen-pick, and pick-trade eligibility
- sign-and-trade restrictions
- exact invalid reasons with rule citations

The user manually builds trades. The app does not auto-generate constructions in v1. It should, however, provide live invalid-state feedback and deterministic suggestions when obvious.

## Free Agency And Contracts

The free-agency module is a contract-rights engine.

Requirements:

- cap room offers
- max contracts
- minimum contracts
- non-taxpayer MLE, taxpayer MLE, room exception, bi-annual exception, and any other required exception state
- Bird, Early Bird, and Non-Bird rights
- cap holds and renouncements
- qualifying offers
- restricted free agency
- offer sheets and matching windows
- rookie scale contracts and options
- player/team options
- extensions where calendar-eligible
- sign-and-trades as transaction graphs
- hard-cap and apron consequences
- roster count and two-way constraints

Player agency is intentionally minimal. Offer acceptance should mostly use legality, contract value, role opportunity, and team competitiveness, without detailed player personality simulation.

## Draft System

The draft is a full two-round league event.

Requirements:

- configurable pre-lottery or post-lottery start
- real draft order once available
- all 30 teams pick
- user controls selected team's picks
- other teams draft from need/value boards
- pick trades before/during draft use the same pick ledger and CBA validation
- rookie-scale contract/cap-hold effects are created from draft results

## Counterparty Logic

Non-user teams are reactive counterparties.

Acceptance should consider:

- legality first
- team timeline
- roster needs
- positional surplus/deficit
- cap/apron/tax impact
- exception impact
- pick value and future obligations
- contract burden
- asset balance

The acceptance engine must explain rejections. A legal trade can still fail because a counterparty does not like the basketball or cap economics.

## Front-Office UI

The UI should feel like a dense front-office workstation, not a guided learning wizard.

Primary layout:

- left rail: Calendar, League, My Team, Trade Desk, Draft, Free Agency, Cap Sheet, Transaction Log
- main workspace: tables, ledgers, builders
- right panel: validation, rule citations, counterparty status, computed deltas

Core screens:

- League Calendar
- My Team Cap Sheet
- Roster Ledger
- Draft Asset Ledger
- Trade Desk
- Free Agency Desk
- Draft Room
- Transaction Log
- Final Compliance Audit

Invalid actions are visible as invalid, not hidden. The UI must distinguish illegal, legal-but-warning, and strategically poor states.

## API And Persistence

The server owns league state, validation, execution, and counterparty acceptance. The client sends draft action and transaction payloads and receives validation/preview results.

Core endpoints should be shaped around:

- create run from validated dataset
- load league state
- preview transaction graph
- execute transaction graph
- advance calendar date/phase
- submit draft pick
- submit option/QO/renouncement/offer/extension action
- fetch validation report
- fetch transaction log

All state transitions write transaction records. Execution must be rollback-safe: if any team-level application fails, the league state remains unchanged.

## Testing Strategy

Required tests:

- CBA rule unit tests for each validator
- fixture tests for known edge cases
- dataset validation tests
- transaction graph preview tests
- transaction execution tests
- rollback tests
- draft pick ledger tests
- sign-and-trade tests
- free-agency rights tests
- calendar gating tests
- counterparty acceptance tests
- full-offseason smoke test
- UI tests for live invalid trade feedback

The rules engine should have high coverage before UI replacement begins.

## Implementation Strategy

Build rules-engine first.

Sequence:

1. Add shared front-office domain types.
2. Add CBA constants and citation infrastructure.
3. Add strict league dataset schema and validation.
4. Build transaction graph validation.
5. Build execution and transaction logging.
6. Build calendar engine.
7. Build draft system.
8. Build free-agency and contract-rights engine.
9. Build counterparty acceptance.
10. Build front-office UI.
11. Route-replace the current offseason simulator after a complete offseason run is possible.

The current simplified simulator should remain functional while the new system is developed. Once the new engine reaches parity, `/offseason/*` should point to the front-office simulator and the simplified phase flow should be archived or removed.

## Open Risks

- Public data may not reliably expose every salary/CBA field. Manual patch discipline is mandatory.
- The CBA rule surface is large; incomplete citations would undermine trust.
- Full multi-team trade validation is complex and should be isolated before UI work.
- Route replacement should wait until a complete run can be performed without illegal state.
- The current product uses local-first persistence; the new league-state payloads may require more careful storage and migration boundaries.

## Approval Record

The following decisions were approved in conversation:

- near-real CBA fidelity
- all 30 teams modeled
- non-user teams react to user proposals
- minimal player agency
- real offseason calendar
- live-ish data ingestion plus manual patches
- complete validated dataset required
- upcoming offseason only
- configurable pre/post-lottery start
- full two-round draft
- real draft-pick rules
- full free-agency contract menu
- full salary-matching and apron trade logic
- multi-team trades
- manual trade construction with live checks
- front-office UI style
- actual rule references in validation output
- versioned rules/constants for now
- replace current offseason route when ready
