# Project Context

- **Project:** AZMaps-MCP
- **Created:** 2026-05-21

## Core Context

Agent Scribe initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-05-21

## Learnings

### 2026-05-24: WI-004 Documentation (Part 1 of 2) — README, LIMITATIONS, ROADMAP

**Mission:** Create production-ready documentation for V1.0 launch

**Documentation Created:**
1. **README.md Update:** V1.0 status, 7 tools, Quick Start examples, architecture, deployment info, test coverage
2. **LIMITATIONS.md:** Known issues (18 edge cases, logging, health probes, `:latest` caching), deferred features, out-of-scope items
3. **ROADMAP.md:** V1.0 shipped, V1.1 (June 2026), V1.2 (Q3 2026), V2.0 (Q4 2026), feature request process

**Key Lessons:**

**1. Honest Documentation Builds Trust**
- Documented 18 route overlay edge case failures explicitly
- Explained rationale for limitations (not just listing them)
- Stated what will NEVER be implemented (traffic incidents, weather, isochrone, route matrix)
- Result: Sets realistic expectations, prevents surprise, shows quality consciousness

**2. Quick Start Examples Are Critical**
- README shows working cURL commands BEFORE architecture explanations
- Two examples: `tools/list` and `tools/call` with real endpoint
- Developers want "how do I use this" before "how does it work"

**3. Cross-Referencing Improves Discoverability**
- README links to LIMITATIONS.md and ROADMAP.md
- ROADMAP references LIMITATIONS for context
- LIMITATIONS points back to ROADMAP for "when will this be fixed"
- Creates web of documentation, not isolated files

**4. Timelines with Flexibility**
- V1.1 target: June 2026 (with "estimates subject to change" caveat)
- Gives users planning visibility without hard commitments
- Quarterly roadmap reviews keep it current

**5. Context Numbers Matter**
- "55/73 integration tests passing" needs context: "18 failures are edge cases"
- Without context, looks like failure. With context, shows conscious trade-offs.
- Always explain what metrics mean, don't just report them

**6. "Not in Scope" Is Valuable**
- Explicitly stating what WON'T be implemented prevents wasted feature requests
- Clarifies product vision: we're building primitives, not everything
- Saves time on both sides (users don't ask, we don't have to decline)

**Quality Standards Applied:**
- No jargon without explanation
- Examples where helpful (cURL commands, PowerShell snippets)
- Links to code and other docs
- All facts verified from source (no guessing)

**Metrics:**
- Files created: 2 (LIMITATIONS.md, ROADMAP.md)
- Files updated: 1 (README.md)
- Total: ~4800 words of documentation
- Time: 45 minutes

**Next for Trinity:** Part 2 of WI-004 (API reference, error codes, MCP protocol guide)

Initial setup complete.
