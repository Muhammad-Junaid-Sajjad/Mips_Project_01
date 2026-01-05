# Agent Configuration Guide

This document catalogs all specialized skills (agents) used for the Interactive Pipeline Simulator project and explains how they interact.

```
┌─────────────────────────────────────────────────────┐
│   User Input / Commands (/sp.*, /state, etc.)        │
└───────────────┬─────────────────────────────────────┘
                │
        ┌───────▼────────┐
        │ State Management│  (always consult first)
        │     Agent       │
        └───────┬────────┘
                │
   ┌────────────┼─────────────┬────────────┬────────────┐
   │            │             │            │            │
┌──▼───┐  ┌─────▼────┐  ┌─────▼────┐  ┌────▼──────┐  ┌──▼──────────┐
│Spec  │  │Architecture│ │Quality   │ │Task       │  │Documentation│
│Agent │  │Agent       │ │Gate Agent│ │Execution  │  │Agent        │
└──┬───┘  └────┬──────┘  └────┬─────┘  └────┬──────┘  └────┬────────┘
   │           │              │             │              │
   └───────────┼──────────────┼─────────────┼──────────────┘
               │              │             │
          ┌────▼──────────────▼─────────────┐
          │     MCP Integration Agent       │
          │ (handles external data via MCP) │
          └─────────────────────────────────┘
```

## State Management Agent
- **Location**: `.claude/skills/State Management/`
- **Config**: `config.json` with triggers, dependencies, responsibilities
- **State Log**: `.claude/skills/State Management/state.md`
- **Purpose**: Maintain hybrid project log (current workflow, decisions, progress)
- **Invocation**: After each PHR/ADR or major phase change; manual `/state` command
- **Key Rule**: Always read state.md before starting new work; update it after every milestone

## Spec Agent
- **Location**: `.claude/skills/Spec Agent/`
- **Workflow**: `/sp.specify`
- **Outputs**: `specs/<feature>/spec.md`, requirements checklist
- **Dependencies**: State Management Agent
- **Responsibilities**: Turn user requests into specs that satisfy governance, mark clarifications, and update state log after spec approval

## Architecture Agent
- **Location**: `.claude/skills/Architecture Agent/`
- **Workflow**: `/sp.plan`
- **Outputs**: plan.md, research.md, data-model.md, contracts/
- **Phases**: Phase 0 (Research), Phase 1 (Design)
- **Responsibilities**: Resolve unknowns, design architecture, suggest ADRs when needed

## Quality Gate Agent
- **Location**: `.claude/skills/Quality Gate Agent/`
- **Type**: Governance
- **Checkpoints**: After spec, after plan, before tasks, before implementation
- **Responsibilities**: Ensure constitutions gates/checklists pass, verify state log freshness before phase transitions

## Task Execution Agent
- **Location**: `.claude/skills/Task Execution Agent/`
- **Workflow**: `/sp.tasks`
- **Outputs**: tasks.md, implementation checklist
- **Responsibilities**: Decompose plan into setup/tests/core/integration/polish tasks with dependencies and test coverage

## Documentation Agent
- **Location**: `.claude/skills/Documentation Agent/`
- **Scope**: specs/specify.md, specs/plan.md, specs/tasks.md, specs/implement.md, CLAUDE.md, .claude/agent.md
- **Responsibilities**: Keep governance docs and guidance synchronized with skills and constitution

## MCP Integration Agent
- **Location**: `.claude/skills/MCP Integration Agent/`
- **Purpose**: Force all external fetches through MCP tools, cache references under history/external/
- **Policy**: No direct network calls; record source, timestamp, purpose

## Skill Files
Each skill directory may include:
- `config.json`: Metadata, responsibilities, dependencies, outputs
- `skills.md` or README: Capability notes, usage guidelines
- Additional assets (scripts, references) as needed

## Adding a New Skill
1. Create folder under `.claude/skills/Skill Name/`
2. Add `config.json` following existing schema
3. Document capabilities in `skills.md`
4. Update this file and CLAUDE.md to reference the new skill
5. Ensure state.md references the skill if it impacts workflow

## Troubleshooting
- **Skill not triggered**: Check config name/description and CLAUDE instructions.
- **State log stale**: Run `/state` workflow to refresh; Quality Gate will block progress otherwise.
- **External data need**: Invoke MCP Integration Agent to fetch via approved tools.

For full rules, see `CLAUDE.md`. For current project status, read `.claude/skills/State Management/state.md` or the root pointer `STATE.md`.
