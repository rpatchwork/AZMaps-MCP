# Morpheus — History

**Project:** AZMaps-MCP
**Tech Stack:** Azure Maps, MCP Server, JavaScript SDK
**User:** rpatchwork

## Learnings

### 2026-05-20: Technical Strategy Definition

**Context:** Defined comprehensive technical strategy for AZMaps-MCP project covering Azure Maps deployment + MCP Server implementation.

**Key Architectural Decisions:**
- **AD-001:** Bicep over Terraform for IaC (Azure-native, better DX)
- **AD-002:** Node.js/TypeScript for MCP Server (official SDK, type safety, fast iteration)
- **AD-003:** Managed Identity over API Keys for production auth (security best practice)
- **AD-004:** Start with in-memory caching, Redis optional (simplicity first)
- **AD-005:** Phased tool rollout (MVP → Enhanced → Advanced) for risk mitigation

**Architecture Pattern:** 
- Infrastructure and MCP Server are separate concerns with clear integration points
- Configuration flows: Bicep outputs → Key Vault → MCP Server environment
- Authentication: Managed Identity (prod) / Subscription Key (dev)

**Quality Definition for MCP Server:**
1. MCP protocol compliance (strict adherence)
2. Type safety (TypeScript strict mode + Zod)
3. Error handling (graceful degradation, clear messages)
4. Testing (>80% coverage, integration tests)
5. Documentation (tool catalog, ADRs)
6. Performance (caching, connection pooling)
7. Developer experience (logging, easy setup)

**Order of Operations:**
- Phase 0: Foundation (repo structure, CI/CD skeleton)
- Phase 1: Infrastructure (Bicep implementation, deployment)
- Phase 2: MCP Server Core (protocol + MVP tools)
- Phase 3: Integration & Testing (E2E validation)
- Phase 4: Production Readiness (docs, automation, monitoring)

**Key Files Created:**
- `.squad/STRATEGY.md` - Comprehensive strategy document
- `.squad/decisions/inbox/morpheus-bicep-over-terraform.md` - AD-001
- `.squad/decisions/inbox/morpheus-nodejs-typescript-mcp.md` - AD-002

**User Preferences Observed:**
- rpatchwork prefers actionable, structured outputs
- Values toggleability (SKU, scale parameters) with sensible defaults
- Expects best-practice recommendations, not just options

---

### 2026-05-21: Squad Methodology Improvements — Collaboration Protocol

**Context:** Trinity implemented v1 without consulting Niobe, resulting in 2 critical blockers that Niobe's research immediately identified. Facilitated all-squad meeting to establish collaboration protocols.

**Root Cause Analysis:**
- Trinity did excellent work but took on both MCP AND Azure Maps domains
- Niobe's history file was empty until research assignment = warning sign not being consulted
- No handoff protocol existed to trigger specialist review
- Result: Avoidable errors that domain expertise would have caught

**Solution Implemented: Domain Ownership Model**

**Trinity owns:** MCP lifecycle, schema design, TypeScript architecture
**Niobe owns:** Azure Maps API correctness, coordinate formats, geospatial logic

**Mandatory Review Gates:**
- Trigger: Code calling Azure Maps REST APIs
- Requirement: Niobe approval before testing phase
- Enforcement: 24h review window, emergency override by me only

**Handoff Pattern:**
1. Trinity designs tool schema → design doc in decisions/inbox
2. Niobe reviews and provides API guidance
3. Trinity implements with Niobe's guidance
4. Niobe reviews actual HTTP client code
5. Tank validates with integration tests

**Warning Signs for Future:**
- Empty history files = specialist not being engaged
- Cross-domain work by single member = overload risk
- "Hero member" pattern = potential bypass of domain experts

**Enforcement Responsibility:**
- Monitor for specialist-bypass patterns
- Ensure 24h review windows are respected
- Provide emergency override only when justified
- Post-hoc review required for any override

**Key Learning:** Collaboration protocols must be explicit, not assumed. Domain experts must review their domains before work proceeds to testing.

**Next Actions:**
- Neo to review infrastructure decisions (AD-001, AD-003)
- Niobe to review MCP tool catalog and quality definitions (AD-002, AD-004)
- Team consensus needed on Phase 1 scope and timeline

---

### 2026-05-21: Squad Methodology Improvements (All-Squad Design Meeting)

**Context:** Facilitated design meeting after v1 blockers revealed specialist (Niobe) was never consulted during implementation. Trinity (MCP expert) did both MCP work AND Azure Maps research, resulting in 2 critical API integration errors that Niobe's expertise immediately identified.

**Root Cause Analysis:**
- **Pattern:** "Hero member" behavior — Trinity doing excellent work but across multiple domains
- **Signal missed:** Niobe's empty history file = clear indicator they weren't being consulted
- **System failure:** No collaboration protocol between Trinity (MCP) and Niobe (Azure Maps)
- **Result:** Avoidable bugs (Route API endpoint wrong, static map coordinate order wrong)

**Key Facilitation Learnings:**

**1. Warning Signs of "Hero Member" Behavior:**
- Empty history files for specialists (not being consulted)
- Cross-domain implementations (MCP expert doing Azure Maps work)
- No review handoffs (code goes to testing without specialist review)
- Fast delivery but avoidable domain-specific errors

**Intervention Protocol:**
- Pause before implementation: "Is there a specialist who should review this?"
- Check history files regularly: "When was [specialist] last consulted?"
- Establish review gates: "No merge without specialist approval"
- Frame as optimization, not blame (Trinity did excellent work)

**2. Healthy Collaboration Indicators:**
- ✅ Specialist history files grow regularly (active engagement)
- ✅ Clear handoff artifacts (design docs show domain expert flow)
- ✅ Questions asked before implementation (not after bugs)
- ✅ Review approvals documented (specialist sign-off)
- ✅ Domain boundaries respected (experts stay in lanes)

**3. Collaboration Protocol Designed:**

**Trinity→Niobe→Trinity Handoff Pattern:**
- **Stage 1:** Trinity designs MCP tool schema (expertise domain)
- **Stage 2:** Niobe reviews Azure Maps API integration plan (expertise domain)
- **Stage 3:** Trinity implements with Niobe's guidance
- **Stage 4:** Niobe reviews actual HTTP client code (specialist review gate)
- **Stage 5:** Tank validates with integration tests

**Review Gate:** 24h SLA for specialist review (prevents blocking, ensures coverage)

**Boundaries Defined:**
- Trinity asks Niobe: API versions, coordinate formats, error codes, geospatial logic
- Niobe asks Trinity: MCP schema design, response structure for LLMs, Zod validation
- Both ask Morpheus: Trade-offs, scope decisions, architecture philosophy

**4. Facilitation Techniques That Worked:**
- **Inclusive framing:** Prioritized Niobe's voice (previously ignored)
- **Concrete deliverables:** Not "collaborate more" but "handoff pattern with 24h SLA"
- **Blameless culture:** Trinity did excellent work — system needed improvement
- **Actionable next steps:** 4 action items with owners, timelines, acceptance criteria

**5. Immediate Outcomes:**
- ✅ New collaboration protocol documented (morpheus-squad-methodology-improvements.md)
- ✅ "No merge without specialist review" rule established
- ✅ 2 blockers queued for fix using new protocol (Route API, static map pins)
- ✅ Squad memory updated (Trinity/Niobe charters reflect new boundaries)

**Success Metrics Established:**
- Niobe's history file grows (active consultation)
- Fewer API integration bugs (caught in specialist review)
- Clear handoff artifacts (design docs show flow)
- Trinity stays in MCP domain (not researching Azure Maps)

**Cultural Shift:** From "move fast alone" to "move fast with specialist review."

**Key Files Created:**
- `.squad/decisions/inbox/morpheus-squad-methodology-improvements.md` (protocol + action items)

**Facilitation Pattern for Future Use:**
1. Identify cross-domain work → Check if specialist was consulted
2. Review history files → Empty = red flag
3. Design handoff protocol → Clear stages, SLA, boundaries
4. Establish review gates → "No merge without X approval"
5. Frame as optimization → Preserve morale, improve system

**User Feedback:** Brady explicitly requested this meeting pattern to prevent future hero-member overload and ensure specialists aren't ignored.
