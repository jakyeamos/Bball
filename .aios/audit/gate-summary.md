# Gate Audit Summary

## Current run outcome

- Outcome: blocked

## Gate decisions

- Pre-CR block [error]: Pre-CR blocked the run: coverage result was unavailable.
- Pre-CR warn [warning]: Pre-CR warning only: No coverage report was found at the configured coverage paths.
- AIOS warn [warning]: AIOS warning only: test_quality failed: pnpm dependency:security failed: > nba-draft-sim@ dependency:security /Users/jakyeamos/projects/Bballedu. test_quality fixes must preserve or improve behavior coverage; delete tests only when they are proven obsolete, redundant with stronger coverage, or pure noise.
- Pre-CR block [error]: Pre-CR blocked the run: coverage result was unavailable.

## Repeated failure patterns

### Pattern: pre-cr did not produce a passing coverage result
- Seen: 2 times
- Gates: Pre-CR
- Category: process
- Common cause: Pre-CR could not complete its configured readiness workflow.
- Avoid by: Verify Pre-CR setup before relying on the readiness result.
- Example fix: Fix the Pre-CR setup or execution error, then rerun the gate.

## Agent learning lessons

- Verify Pre-CR setup before relying on the readiness result.
- Run focused tests with coverage before committing changed source lines.
- Run the AIOS allowlisted quality gate locally before committing.

## Commit-readiness status

- not ready to commit
