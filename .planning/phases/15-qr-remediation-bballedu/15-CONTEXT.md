# Phase 15: QR remediation: bballedu - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning
**Source:** PRD Express Path (/Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/bballedu.md)

<domain>
## Phase Boundary

Plan the remediation work for bballedu from Quality Runner run qr-fleet-continue-20260704-bballedu.
This phase is planning-only until execute-phase runs. Quality Runner remains advisory-only: it identifies findings, remediation clusters, and verification suggestions, but all source changes happen in /Users/jakyeamos/projects/Bballedu.

Findings: 24
Severity: `observation` 9, `warning` 15
Categories: `structural:deduplicate` 1, `structural:harden` 5, `structural:ponytail` 5, `structural:simplify` 3, `structural:speed` 2, `structural:ui_structural` 8
Fleet phase candidate: Phase 5 - Large Structural Apps
Requirement: QR-BBALLEDU

</domain>

<decisions>
## Implementation Decisions

### D-01 - QR summary is the planning source
- Use /Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/bballedu.md and the artifacts under /Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu as the source of truth for this remediation phase.

### D-02 - Cluster-oriented remediation
- Plan and execute coherent remediation batches by QR cluster, not one isolated edit per finding row.

### D-03 - Behavior preservation
- Prefer behavior-preserving refactors, hardening, and simplification. Do not change product behavior unless a QR hardening cluster explicitly requires safer behavior.

### D-04 - Existing project conventions first
- Read the target files and local manifests before editing. Follow existing package-manager, formatter, test, and architecture conventions. Use pnpm for JavaScript package scripts.

### D-05 - Evidence-backed closure
- A cluster is done only when focused repo verification passes and a post-remediation QR run shows the fingerprints cleared or are dispositioned with evidence.

### Claude's Discretion
- Choose exact helper extraction boundaries, naming, and task order when the QR document identifies the finding but not the implementation shape.
- If a cluster turns out to require product, API, or design decisions, stop that cluster and capture the question instead of guessing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quality Runner Inputs
- `/Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/bballedu.md` - Per-repo QR summary used as this phase PRD.
- `/Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu/quality-audit.json` - Quality audit report.
- `/Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu/remediation-plan.json` - QR remediation plan.
- `/Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu/code-quality-scan.json` - Code-quality scan fingerprints.
- `/Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu/resolution-ledger.md` - Resolution ledger for closure evidence.
- `/Users/jakyeamos/projects/Bballedu/.quality-runner/runs/qr-fleet-continue-20260704-bballedu/agent-handoff.md` - QR agent handoff.

</canonical_refs>

<specifics>
## Top Findings

- `structural-simplify-deep-nesting` warning structural:simplify: 223 deep-nesting structural findings in simplification and shrink pass. Fix: 223 findings, aggregate score 1338: Flatten guard clauses, extract decision helpers, or split rendering branches. Evidence: UI-Refresh/Basketball IQ Training Platform/src/app/components/ui/sidebar.tsx:99: deep-nesting; UI-Refresh/Basketball IQ Training Platform/vite.config.ts:11: deep-nesting; client/src/App.tsx:57: deep-nesting
- `structural-harden-explicit-any` warning structural:harden: 71 explicit-any structural findings in API hardening and type safety. Fix: 71 findings, aggregate score 639: Replace `any` with a narrow local type, generic constraint, or existing contract. Evidence: client/src/components/lesson/FilmBreakdown.tsx:5: explicit-any; client/src/components/lesson/FilmBreakdown.tsx:46: explicit-any; client/src/components/lesson/FilmBreakdown.tsx:89: explicit-any
- `structural-simplify-large-source-file` warning structural:simplify: 13 large-source-file structural findings in simplification and shrink pass. Fix: 13 findings, aggregate score 117: Split mixed responsibilities into focused modules. Evidence: UI-Refresh/Basketball IQ Training Platform/src/app/components/ui/sidebar.tsx:1: large-source-file; client/src/pages/CoachingDecisionsPage.tsx:1: large-source-file; client/src/services/api.ts:1: large-source-file
- `structural-simplify-nested-ternary` warning structural:simplify: 9 nested-ternary structural findings in simplification and shrink pass. Fix: 9 findings, aggregate score 81: Replace nested ternaries with named branches or helpers. Evidence: UI-Refresh/Basketball IQ Training Platform/src/app/components/Cards.tsx:102: nested-ternary; UI-Refresh/Basketball IQ Training Platform/src/app/pages/LearningTrack.tsx:182: nested-ternary; client/src/pages/DraftPage.tsx:274: nested-ternary
- `structural-harden-env-non-null-assertion` warning structural:harden: 8 env-non-null-assertion structural findings in API hardening and type safety. Fix: 8 findings, aggregate score 72: Route required env access through validation or fail closed. Evidence: server/src/lib/supabaseAdmin.ts:66: env-non-null-assertion; server/src/lib/supabaseAdmin.ts:67: env-non-null-assertion; server/src/routes/internal/accountUpgrade.ts:63: env-non-null-assertion
- `structural-harden-api-route-missing-boundary-validation` warning structural:harden: 10 api-route-missing-boundary-validation structural findings in API hardening and boundary validation. Fix: 10 findings, aggregate score 60: Validate external input at the route or procedure boundary. Evidence: server/scripts/smokeSupabaseAccountUpgrade.ts:177: api-route-missing-boundary-validation; server/services/calibrationHarness.ts:1090: api-route-missing-boundary-validation; server/src/lib/requestIdentity.ts:9: api-route-missing-boundary-validation
- `structural-deduplicate-near-duplicate-function` warning structural:deduplicate: 9 near-duplicate-function structural findings in duplicate consolidation and helper extraction. Fix: 9 findings, aggregate score 54: Extract a shared helper only when the call sites share domain semantics. Evidence: scripts/scraper.ts:127: near-duplicate-function; server/managers/leagueManager.ts:270: near-duplicate-function; server/services/aggregation.ts:64: near-duplicate-function
- `structural-ui_structural-removed-focus-outline` warning structural:ui_structural: 9 removed-focus-outline structural findings in UI accessibility and structural quality. Fix: 9 findings, aggregate score 54: Preserve a visible focus style with focus-visible or equivalent. Evidence: UI-Refresh/Basketball IQ Training Platform/src/app/components/ui/navigation-menu.tsx:94: removed-focus-outline; UI-Refresh/Basketball IQ Training Platform/src/app/pages/LearningLibrary.tsx:120: removed-focus-outline; client/src/components/Button.tsx:23: removed-focus-outline

## Remediation Clusters

1. remediate-structural-shared-src-offseason-schema-ts (medium, score 303) - Remediate structural cluster in shared/src/offseason/schema.ts
2. remediate-structural-server-services-handlers-v2-ts (medium, score 218) - Remediate structural cluster in server/services/handlers-v2.ts
3. remediate-structural-client-src-context-appcontext-tsx (medium, score 179) - Remediate structural cluster in client/src/context/AppContext.tsx
4. remediate-structural-server-managers-socketmanager-ts (medium, score 173) - Remediate structural cluster in server/managers/socketManager.ts
5. remediate-structural-server-services-handlers-ts (medium, score 144) - Remediate structural cluster in server/services/handlers.ts
6. remediate-structural-server-src-offseason-cba-validatetransactiongraph-ts (medium, score 87) - Remediate structural cluster in server/src/offseason/cba/validateTransactionGraph.ts

</specifics>

<deferred>
## Deferred Ideas

- Broad rewrites outside the QR clusters.
- Running Quality Runner as an executor or letting QR mutate source code.
- Remediating repos outside bballedu; each repo gets its own GSD phase.

</deferred>

---

*Phase: 15*
*Context gathered: 2026-07-04 via QR per-repo PRD*
