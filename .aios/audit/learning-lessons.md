# Gate Learning Lessons

## Active repeated failure patterns

### Pattern: pre-cr did not produce a passing coverage result
- Seen: 2 times
- Gates: Pre-CR
- Category: process
- Common cause: Pre-CR could not complete its configured readiness workflow.
- Avoid by: Verify Pre-CR setup before relying on the readiness result.
- Example fix: Fix the Pre-CR setup or execution error, then rerun the gate.

## Current repo-specific rules learned from gate history

- Verify Pre-CR setup before relying on the readiness result.
- Run focused tests with coverage before committing changed source lines.
- Run the AIOS allowlisted quality gate locally before committing.

## High-priority agent reminders

- Verify Pre-CR setup before relying on the readiness result.
