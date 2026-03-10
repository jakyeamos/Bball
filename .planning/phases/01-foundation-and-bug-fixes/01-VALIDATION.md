---
phase: 1
slug: foundation-and-bug-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed in shared workspace) |
| **Config file** | `shared/package.json` `"test": "vitest"` — no separate config file |
| **Quick run command** | `npm test --workspace=shared` |
| **Full suite command** | `npm test --workspace=shared` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=shared`
- **After every plan wave:** Run `npm test --workspace=shared` + manual browser smoke of affected pages
- **Before `/gsd:verify-work`:** Full suite must be green + all 5 success criteria manually verified
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FOUND-03 | unit | `npm test --workspace=shared` | ❌ Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-03 | unit | `npm test --workspace=shared` | ❌ Wave 0 | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-04 | manual | Manual browser socket inspection | ❌ Wave 0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-01 | smoke | `grep -r "NBA Draft Sim" client/src/` returns 0 | Partial | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-02 | smoke | Manual browser check of color tokens | ❌ Wave 0 | ⬜ pending |
| 1-03-01 | 03 | 2 | FOUND-05 | smoke | Manual browser check of homepage | ❌ Wave 0 | ⬜ pending |
| 1-03-02 | 03 | 2 | FOUND-06 | smoke | Manual browser check of nav flow | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `shared/simulation.test.ts` — regression test for FOUND-03 (stub vs real TeamAggregation outcomes)
- [ ] `server/vitest.config.ts` — if simulation test moves to server workspace
- [ ] Manual WebSocket smoke test checklist document for FOUND-04

*Existing `shared/utils.test.ts` covers only `calculateWinPercentage` — does not cover simulation engine behavior.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER advance quarter without hang | FOUND-04 | Requires live WebSocket session; no test harness for Socket.io integration in Phase 1 | Open browser dev tools → Network → WS tab. Start quarter coaching game, submit decisions, confirm socket messages are sent/received and quarter advances |
| Court Vision branding visible in browser tab and headings | FOUND-01 | String grep catches source, browser test verifies rendering | Load app in browser, check tab title = "Court Vision", check H1 headings, check meta description |
| Color tokens render correctly in components | FOUND-02 | Visual verification of design tokens cannot be automated without screenshot diffing | Load app in browser, inspect elements using Tailwind cv- color classes |
| Homepage three role lanes visible on first load | FOUND-05 | Requires visual render verification | Navigate to `/`, verify Player IQ, Coach IQ, GM IQ lanes are all visible without scrolling or navigation |
| Navigation between all role lenses is fluid | FOUND-06 | Requires interactive testing of navigation flow | From each role lens section, verify navigating to the other two works without getting stuck |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
