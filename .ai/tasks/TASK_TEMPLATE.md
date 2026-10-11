# .ai/tasks/TASK_TEMPLATE.md

Use this template for a bounded task brief that an AI agent can resume later.

## Objective
Write one or two sentences that state what success looks like.

## Repository baseline SHA
- Remote URL:
- Default branch:
- Latest verified `origin/main` SHA:
- Local `HEAD` SHA:
- Working tree status at baseline:

## Scope
State clearly:
- What is in scope
- What is out of scope
- What files or systems may be touched
- What may not be changed

## Files to inspect before planning
List the files or areas to read first. Include only what is actually relevant.

## Constraints
List any hard constraints, for example:
- No new dependencies unless explicitly justified
- No changes to authentication or authorization unless the task requires it
- No changes to database schemas unless the task requires it
- No secrets in documentation or code
- No invented features, routes, tables, columns, or APIs
- Preserve existing architecture and naming conventions

## Acceptance criteria
State concrete, verifiable outcomes, for example:
- A specific file exists
- A specific route behaves a certain way
- A specific command succeeds
- A specific documentation section is accurate

## Verification
List the commands or checks to run, such as:
- `git status`
- `git diff`
- `bunx tsc -b --noEmit`
- `bun run lint`
- browser/manual checks if applicable

If a check cannot run, say so and explain why.

## Stop conditions
State when to stop, for example:
- When the task is complete and verified
- When a blocker prevents progress
- When the requested change would require scope creep or risky assumptions

## Final report
After finishing, record:
- What was done
- What files changed
- What evidence was checked
- What did not run
- Any remaining issues
- The resulting commit SHA only if a commit was actually made
