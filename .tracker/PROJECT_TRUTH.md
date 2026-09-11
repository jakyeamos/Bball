# Bounded guest-entry verification — 2026-09-11

Canonical product direction remains in `.planning/PROJECT.md`, `README.md`, and
`.project-compass/contract.json`; this note does not replace their scope or maturity.

The dedicated guest-entry browser test uses its own strict-port Vite server,
blank Supabase configuration, a disposable browser context, and blocked nonowned
HTTP requests. It checks guest identity creation and persistence across reload,
visible account-unavailable fallback, and home/library entry without an account.
It does not prove lesson content, the complete learn/apply/reflect loop, configured
Supabase failures, account upgrade, second-device continuity, or admin operations.

The Compass source association retains the original broader assurance behavior
unbound and links only its existing unconfigured-entry scenario to the accepted
learning outcome. Exact reviewed auth/config/test paths establish ownership;
conservative client source/public and shared file dependencies establish freshness
only. They do not establish accepted ownership or semantic proof of those inputs.
Future input additions require reconciliation against the full tracked inventory.
Lesson, server, shared-payload and broader outcome assurance remain open.

No repository change-surface matrix was found in the tracked inventory. This
additive test and source association change no product purpose, runtime API,
provider routing or enforcement enrollment. README records the direct command;
Knip includes the test/config and this required status note preserves the limits.

Pre-CR previously counted all seven changed metadata/test files as production
coverage (287 uncovered lines). The reviewed correction excludes only these exact
nonproduction paths and `.pre-cr.json` itself from production line coverage, while
requiring the dedicated browser test after the unchanged coverage command. The
80% threshold, security/checklist checks and runtime coverage remain unchanged.
The required chain runs through the package script `test:guest-coverage` because
Pre-CR parses testCommand as argv. `package.json` is also an exact reviewed policy
metadata exclusion; all original test and production coverage checks are retained.
