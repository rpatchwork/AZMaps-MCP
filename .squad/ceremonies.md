# Ceremonies

> Team meetings that happen before or after work. Each squad configures their own.

## Design Review

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before |
| **Condition** | multi-agent task involving 2+ agents modifying shared systems |
| **Facilitator** | lead |
| **Participants** | all-relevant |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Review the task and requirements
2. Agree on interfaces and contracts between components
3. Identify risks and edge cases
4. Assign action items

---

## Retrospective

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | after |
| **Condition** | build failure, test failure, or reviewer rejection |
| **Facilitator** | lead |
| **Participants** | all-involved |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. What happened? (facts only)
2. Root cause analysis
3. What should change?
4. Action items for next iteration


---

## Retrospective with Enforcement

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | weekly |
| **Condition** | No *retrospective* log in .squad/log/ within the last 7 days |
| **Facilitator** | lead |
| **Participants** | all |
| **Time budget** | focused |
| **Enabled** | yes |
| **Enforcement skill** | retro-enforcement |

**Agenda:**
1. What shipped this week? (closed issues, merged PRs)
2. What did not ship? (open issues, blockers)
3. Root cause on any failures
4. Action items -- each MUST become a GitHub Issue labeled retro-action

**Coordinator integration:**
At round start, call Test-RetroOverdue (see skill retro-enforcement). If overdue, run this ceremony before the work queue.

**Why GitHub Issues, not markdown:**
Production data: 0% completion across 6 retros using markdown checklists, 100% after switching to GitHub Issues.

---

## Session Start Board Check

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | session-start |
| **Condition** | Every session start — first user message of the session |
| **Facilitator** | ralph |
| **Participants** | ralph |
| **Time budget** | quick (one work-check cycle) |
| **Enabled** | ✅ yes |

**Agenda:**
1. Ralph scans GitHub board: open issues (with squad labels), open PRs, CI/review status
2. Ralph evaluates deployment gates on any PR that is in review or merge-ready state
3. Ralph presents board in standard board format
4. Coordinator proceeds with user's request AFTER Ralph's board report

**Coordinator integration:**
On every session start, BEFORE answering the user's first request, the coordinator activates Ralph's work-check cycle (one round). Ralph presents the board. Only then does the coordinator address the user's question. The coordinator does NOT summarize WIP status — that is Ralph's job.

**Why:** Ralph is the work monitor. The coordinator doing board summaries is a role violation. Ralph owns the board; the coordinator owns routing.
