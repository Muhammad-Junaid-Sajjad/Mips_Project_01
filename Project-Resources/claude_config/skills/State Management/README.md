# State Management Agent

The State Management agent maintains the canonical project status log at `.claude/skills/State Management/state.md`. It summarizes milestones, tracks active workflows, and links to detailed Prompt History Records (PHRs) or ADRs so Claude can retrieve context without rereading the entire history.

## Responsibilities
- Update `state.md` after every major milestone (PHR, ADR, phase transition).
- Ensure Decision Log entries point to the relevant files.
- Keep Progress Tracker accurate so contributors can see what’s done vs. pending.
- Enforce constitution principles by highlighting blockers and referencing governance docs.

## When to Invoke
- After completing workflows (e.g., `/sp.specify`, `/sp.plan`, `/sp.tasks`, `/sp.implement`).
- After creating a PHR or ADR.
- When a new blocker appears or a milestone completes.
- Before starting new work, read `state.md` to understand current phase, decisions, and references.

## Update Checklist
1. Refresh **Last Updated** timestamp.
2. Describe current workflow/phase.
3. Append Decision Log entry with links to PHR/ADR.
4. Adjust Progress Tracker statuses.
5. Confirm History References remain accurate.
6. Save file and (if applicable) mention update in latest PHR.
