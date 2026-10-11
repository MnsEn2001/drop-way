# .ai/tasks/README.md

This directory is for structured task briefs that help AI agents resume work with a clear scope and baseline.

## How to use this directory
- Create one task brief per clearly bounded unit of work.
- Name the brief so it is easy to identify later, for example:
  - `.ai/tasks/active/my-task-brief.md`
- Before starting work, copy the relevant baseline SHA and scope into the brief.
- After the task is done, either close the brief or leave a final note pointing to the result.

## What belongs in a task brief
- Objective
- Repository baseline SHA
- Scope
- Files to inspect
- Constraints
- Acceptance criteria
- Verification steps
- Stop conditions
- Final report

Use `.ai/tasks/TASK_TEMPLATE.md` as the starting structure.

## What does not belong here
- Random notes
- Fake progress
- Duplicated copies of project docs that should live in `.ai/PROJECT_CONTEXT.md` or `.ai/ARCHITECTURE.md`

## Active tasks
- The `active/` folder is available for current work.
- Do not invent active tasks. Only create one when there is real work to continue.
