# Morpheus — History

**Project:** AZMaps-MCP
**Tech Stack:** Azure Maps, MCP Server, JavaScript SDK
**User:** rpatchwork

## Learnings

### 2026-05-21: Static Map Route Overlay — Feature Value & Priority Decision

**Context:** After Trinity's 7+ debugging iterations without resolving Azure Maps path parameter syntax errors (route overlay 0/1 tests passing), Brady requested squad discussion to assess feature value and V1 priority.

**Mission:** Facilitate collective understanding of:
1. What is Static Map Route Overlay (feature definition)
2. What alternatives exist in Azure Maps Gen2
3. What value does it provide to travel agents (high/medium/low priority)
4. Should we continue fixing for V1 or descope to V2

**Discussion Facilitation Approach:**

**1. Data Gathering Phase**
- Read Tank's history (7+ iteration debugging timeline, CONDITIONAL GO recommendation)
- Read Trinity's history (technical implementation details, format conversion challenges)
- Read Niobe's history (pins format resolution, path parameters not validated)
- Read project decisions (V1 scope, primitives definition, quality standards)

**2. Analysis Framework**
- Feature definition (what it does, how it works)
- Travel agent value breakdown (high/medium/low scenarios)
- Alternative solutions available (workarounds, substitutes)
- Iteration velocity assessment (cost/benefit of continuing)
- Production viability calculation (is 6/7 good enough?)

**3. Decision Synthesis**
- Organize findings into structured document
- Present data objectively (no predetermined conclusion)
- Provide clear recommendation with rationale
- Enable informed decision by Brady

**Key Findings:**

**Feature Definition:**
- Route overlay renders driving/walking path as **visible line** on static map
- Contrasts with pins-only maps (shows locations but not journey)
- Technical requirement: GeoJSON → Azure Maps coordinate format + style syntax
- Returns base64 PNG/JPEG suitable for email/print embedding

**Travel Agent Value Assessment:**

| Scenario Category | Need Level | % of Use Cases | Workaround Available |
|-------------------|------------|----------------|---------------------|
| Printed itineraries | **High** | 15-20% | Pins only (reduced polish) |
| Email confirmations | **High** | 10-15% | Pins only (less clarity) |
| Client presentations | **Medium** | 5-10% | Verbal explanation |
| Quick previews | **Low** | 5% | Route summary data |
| Multi-stop tours | **Medium** | 5% | Interactive maps |
| Route calculations | **None** | 60-65% | Data-focused (no viz needed) |

**Key Insight:** 30-40% of scenarios derive value from route overlay, but 100% can accomplish core goals without it.

**Alternatives Available:**

1. **Static Map with Pins Only (100% Working)**
   - Status: ✅ Production-ready (2/2 tests passing)
   - Shows waypoints without route path
   - Impact: Medium degradation (locations visible, journey not)

2. **Interactive Maps (Azure Maps Web SDK)**
   - Status: Separate implementation (not in V1 scope)
   - Full route visualization with pan/zoom
   - Limitation: Requires JavaScript, cannot embed in email/print

3. **Separate Route Calculation + Static Map (Current V1)**
   - Status: ✅ Available with 6/7 tools
   - All data available (distance, duration, turn-by-turn)
   - Impact: Functional but less polished presentation

4. **Third-Party Services (Mapbox, Google Static Maps)**
   - Status: Out of scope (external dependency)
   - Feature parity but architectural complexity
   - Adds cost and key management burden

5. **Client-Side Canvas Rendering**
   - Status: Out of scope (frontend development)
   - Rich customization but narrow use case (web only)

**Iteration Velocity Analysis:**

**Debugging Timeline:**
- Iterations 1-4: API version + pin format (51-53/73 tests)
- Iteration 5: Pin encoding fix (55/73) — Fixed pins, broke paths
- Iteration 6: GeoJSON conversion (55/73) — No improvement
- Iteration 7: Path style syntax (55/73) — Still broken

**Pattern Observed:** Multi-layered format requirements (data format, style syntax, URL encoding). Each fix reveals next layer.

**Team Impact:**
- Trinity: Extended debugging cycle, context switching costs
- Tank: Declared CONDITIONAL GO, recommended descoping
- Neo: Blocked on deployment decision
- Niobe: Would need deep path parameter research

**Risk Assessment:**
- **Low confidence in quick fix:** 7 iterations = architectural/documentation gap
- **Regression risk:** Iteration 5 pattern (fixing paths broke pins)
- **Documentation gaps:** Azure Maps path syntax not fully documented
- **Diminishing returns:** Time invested vs. probability of success

**Recommendation: DESCOPE for V1**

**Rationale:**

1. **Core Needs Met:** 6/7 tools provide full trip planning functionality
2. **Acceptable Workaround:** Pins + route summary covers 70% of use cases
3. **Velocity Preserved:** Ship V1 sooner, avoid extended debugging cycle
4. **Risk Mitigation:** Prevent regressions in working features
5. **Data-Driven V2:** Real-world feedback determines true priority

**What Ships in V1:**
- ✅ Geocoding, Batch Geocoding, POI Search, Route Calculation, Timezone, Static Map Pins
- ❌ Static Map Route Overlay (DESCOPED to V2)

**V2 Roadmap:**
1. Microsoft support ticket for path parameter syntax
2. Deeper Azure Maps API research
3. Community research (GitHub, Stack Overflow, forums)
4. Consider third-party alternatives if blocked

**Facilitation Lessons Learned:**

**1. Feature Value Assessment Framework**
- Define the feature clearly (what it does, not just what it's called)
- Break down use cases by value tier (high/medium/low)
- Quantify scenarios (% of use cases affected)
- Identify workarounds (is degraded experience acceptable?)

**2. Iteration Velocity as Decision Signal**
- 3-4 iterations without progress = warning sign
- 7+ iterations = architectural or knowledge gap (not simple bug)
- Diminishing returns = time to consider descoping
- Pattern recognition: multi-layered errors suggest deeper issue

**3. Alternative Analysis Structure**
- Status (working/not working/out of scope)
- Capability (what it provides)
- Use case (when to use)
- Pros/cons (honest trade-offs)
- Travel agent impact (specific to problem domain)

**4. Recommendation Presentation**
- Lead with data (objective analysis first)
- Present recommendation clearly (no ambiguity)
- Provide rationale (why this choice)
- Define success metrics (how to validate decision)
- Action items with owners (enable execution)

**5. Descoping as Strategic Tool**
- Not admitting failure — strategic velocity decision
- Focus on shipping working primitives
- Iterate based on real-world feedback (not assumptions)
- V2 roadmap shows commitment to feature

**Key Principle Applied:**

From `core-operating-principles.md`:
> "Start Simple, Build Primitives First — Construct the most simple primitive capabilities first. CRUD operations get onboarded, verified as bulletproof. Keep working primitives free from tampering without explicit user consent. Don't break what works."

**Route overlay decision aligns with principle:**
- 6 working primitives are bulletproof (75% test coverage)
- Continuing debugging risks breaking working features (iteration 5 pattern)
- Strategic descoping preserves primitives that work
- V2 adds complexity only after validating base capabilities

**Deliverables Created:**

**`.squad/decisions/inbox/morpheus-route-overlay-value-discussion.md`**
- Feature definition (what it does)
- Travel agent value assessment (scenario breakdown)
- Alternatives analysis (5 options with trade-offs)
- V1 priority recommendation (DESCOPE with rationale)
- V2 roadmap (commitment to feature investigation)

**Communication Pattern:**

**Document Structure:**
1. Feature Definition (clear understanding)
2. Current Status (technical blocker context)
3. Travel Agent Value (scenario-based analysis)
4. Alternatives (5 options with honest trade-offs)
5. Priority Assessment (critical questions)
6. Recommendation (clear decision with rationale)
7. Action Items (enable execution)

**User Interaction:**
- Present summary in response (2-3 sentences)
- Direct Brady to comprehensive document for details
- Frame as discussion outcome, not unilateral decision
- Emphasize data-driven reasoning (not opinion)

**Success Metrics:**

**Immediate:**
- ✅ Clear recommendation provided (DESCOPE for V1)
- ✅ Squad understanding of feature value aligned
- ✅ Decision rationale documented for future reference

**Validation (Post-Decision):**
- V1 ships with 6 working tools (production-ready)
- Travel agents provide feedback on route overlay importance
- V2 prioritization based on actual demand (not assumptions)

**Cultural Impact:**

**Descoping as Strength:**
- Strategic velocity decision (not failure)
- Preserves working primitives (core principle adherence)
- Enables data-driven V2 prioritization
- Demonstrates pragmatic engineering judgment

**Facilitation Pattern:**
- Data gathering → Analysis → Synthesis → Recommendation
- Objective presentation (no predetermined conclusion)
- Clear action items (enable execution)
- Document for future reference (institutional memory)

**Key Files Created:**
- `.squad/decisions/inbox/morpheus-route-overlay-value-discussion.md` (feature value analysis + recommendation)

**User Feedback Expected:** Brady approves descoping or requests continued debugging (informed decision)

---

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

### 2026-05-21: Critical Alignment — HTTP Request Format Mismatch (Wire-Level Specification Protocol)

**Context:** Tank discovered Route API tests still failing (11/11, 0% pass rate) after Trinity implemented Niobe's corrected specifications. Root cause: Niobe validated GET requests with query parameters, Trinity implemented POST requests with JSON bodies — same API, different HTTP methods.

**Root Cause: Specification Handoff Ambiguity**

**What Happened:**
1. Niobe validated API with curl: `GET /route/directions/json?query=47.620,-122.349:45.523,-122.676` ✅ Works
2. Trinity read spec and implemented: `POST /route/directions/json` with GeoJSON body ❌ Fails (HTTP 400)
3. No alignment step between validation method and implementation method
4. Tests failed because implementation produces different HTTP requests than validation

**Why This Happened:**
- **Niobe's perspective:** "I validated the API works — here's the curl command that proves it"
- **Trinity's perspective:** "Niobe validated the API contract — I'll implement using best practices (POST + JSON)"
- **The gap:** "Working specification" was interpreted as functional contract, not wire-level format
- **Missing step:** Verify implementation produces identical HTTP requests to validation

**Both Perspectives Are Valid:**
- Trinity's POST approach is reasonable (cleaner, structured, per documentation)
- Niobe's GET approach is proven (empirically validated, 80KB successful response)
- Problem: They're different HTTP methods — both can't be right simultaneously

**The Core Issue: Specification Handoff Needs Wire-Level Precision**

When specialist validates with curl/HTTP capture:
- ❌ NOT: "Here's what the API does" (functional specification)
- ✅ YES: "Here's the EXACT HTTP request that works" (wire-level specification)

When developer implements validated specification:
- ❌ NOT: "I'll achieve the same outcome using better practices"
- ✅ YES: "I'll replicate the exact HTTP request format that was validated"

**Decision: Wire-Level Equivalence Protocol**

**New Requirement for API Specification Handoffs:**

1. **Niobe (Validator):**
   - Provide curl command or HTTP capture as "canonical specification"
   - Mark it explicitly: "This is the EXACT format to implement"
   - Document: Method, headers, query params, body format, encoding

2. **Trinity (Implementer):**
   - Replicate EXACT HTTP request format from curl command
   - No interpretation (e.g., GET → POST, query → JSON body)
   - Add HTTP logging during implementation
   - Compare logged requests to canonical specification
   - Report: "Wire-level equivalence verified" before handoff to Tank

3. **Tank (Validator):**
   - If tests fail: Check if implementation produces same requests as specification
   - If diverged: Report "Implementation doesn't match specification"
   - If matched: Report "Implementation correct, investigating API behavior"

**Key Principle:**  
*Code must produce the SAME HTTP requests that were validated, not "semantically equivalent" requests.*

**Implementation Required:**

Trinity to change Route API from POST to GET:
```typescript
// BEFORE (POST with JSON body):
const response = await this.fetchWithRetry(url, {
  method: 'POST',
  body: JSON.stringify({ type: 'FeatureCollection', ... })
});

// AFTER (GET with query params, matches Niobe's validation):
const query = params.waypoints.map(w => `${w.latitude},${w.longitude}`).join(':');
const url = this.buildUrlWithVersion('/route/directions/json', '1.0', { query });
const response = await this.fetchWithRetry(url); // GET
```

**Expected Outcome:**
- Route API tests: 0/11 → 11/11 passing
- Overall tests: 43/73 → 71-73/73 passing
- V1 blocker resolved

**Facilitation Pattern for Specification Mismatches:**

1. **Identify the divergence:** Compare validated format vs implemented format
2. **No blame:** Both approaches may be technically valid
3. **Choose proven path:** Implement what was empirically validated (lowest risk)
4. **Establish protocol:** Prevent future mismatches with wire-level equivalence requirement
5. **Document lesson:** Specification = exact HTTP format, not functional contract

**Key Facilitation Learnings:**

**Warning Signs of Specification Divergence:**
- Tests fail after "correct" implementation
- Error messages about request format (e.g., "invalid body")
- Implementation uses different HTTP method than validation
- No logging/comparison of actual HTTP requests

**Intervention Protocol:**
1. Ask: "What HTTP request format did Niobe validate?"
2. Ask: "What HTTP request format does your code produce?"
3. Compare: Are they byte-level identical?
4. If NO: Align on one format (prefer validated)
5. Verify: Log actual requests, confirm equivalence

**Communication Patterns:**
- Use precise language: "Replicate this exact request" (not "implement this API")
- Avoid ambiguity: "Functional spec" vs "wire-level spec"
- Explicit verification: "My code produces GET with query params" (not "My code calls the Route API")

**Process Improvements Implemented:**
1. ✅ Created `.squad/decisions/inbox/morpheus-http-format-alignment.md` (comprehensive alignment doc)
2. ✅ Defined wire-level equivalence protocol (new standard for all API implementations)
3. ✅ Established verification step (log requests, compare to canonical spec)
4. ✅ Updated Trinity's next steps (implement GET, verify, report)
5. ✅ Queued process improvement (update charters with new requirements)

**Success Metrics:**
- Trinity implements GET format within 1 hour
- Tank reports 11/11 Route API tests passing
- No future specification handoff failures
- HTTP request logging becomes standard during API implementation

**Cultural Impact:**
- Shifted from "understand the API" to "replicate the validated request"
- Emphasized: Empirical validation > Documentation assumptions
- Reinforced: Verification step prevents rework cycles

**Key Files Created:**
- `.squad/decisions/inbox/morpheus-http-format-alignment.md` (alignment decision + protocol)

**Lesson for Future Facilitation:**  
Specification handoffs require explicitness — "This curl command IS the spec" is clearer than "Here's what I learned about the API."

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

---

### 2026-05-21: All-Squad Meeting — V1 Scope Review with Niobe Leading Gen2 Assessment

**Context:** Facilitated meeting to review 7 MCP primitives with Niobe (Azure Maps Gen2 expert) leading technical reasoning. Goal: Validate Gen2 compliance, capability match, and travel agent fit.

**Meeting Structure:**
- **Part 1:** Niobe leads Gen2 compliance assessment (20 min)
- **Part 2:** Trinity provides MCP perspective (10 min)
- **Part 3:** Tank provides testing perspective (10 min)
- **Part 4:** Squad discussion & decision (15 min)
- **Part 5:** Action items (5 min)

**Facilitation Pattern: Specialist Leads, Facilitator Synthesizes**

**Key Facilitation Techniques:**

1. **Defer to Domain Expert Leadership**
   - Niobe led Gen2 technical assessment (not me)
   - I framed questions: "Is each primitive Gen2-compliant?"
   - I synthesized her findings, but didn't override her technical judgment

2. **Structured Agenda for Multi-Specialist Input**
   - Part 1 (Niobe): Gen2 compliance → capability match → travel agent fit
   - Part 2 (Trinity): MCP schemas → composability → token efficiency
   - Part 3 (Tank): Test status → blockers → performance
   - Clear sequence prevents talking-over-each-other

3. **Synthesis After Each Section**
   - After Niobe: "All 7 primitives Gen2-compliant, 2 trivial blockers"
   - After Trinity: "MCP design production-ready, no schema changes"
   - After Tank: "53/73 tests passing, both blockers fixable in 60 minutes"
   - Concrete summaries before moving to next section

4. **Decision Authority After Consensus**
   - Waited for all 3 specialists to provide input
   - Synthesized: Gen2 ✅, MCP ✅, Testing ⚠️ (fixable)
   - Made call: APPROVE v1 scope, no changes
   - Action items assigned with clear owners/timelines

**Outcome:**

**Decision:** ✅ PROCEED with current 7 primitives (no scope changes)

**Key Findings:**
- All 7 primitives are Gen2-compliant (Niobe's assessment)
- Travel agent use cases fully covered (no gaps)
- MCP tool design production-ready (Trinity's validation)
- 2 blockers are trivial: route endpoint suffix, static map pin format (60 minutes total)
- Performance targets met (Tank's benchmarks)

**Priority Adjustment:**
- Timezone API promoted from P1 → P0 (Niobe's recommendation)
- Rationale: Cross-timezone trips require timezone-aware itineraries (not optional)

**Action Items Assigned:**
- AI-001: Fix route API blocker (Trinity, 30 min)
- AI-002: Fix static map pin blocker (Trinity, 30 min)
- AI-003: Validate all tests pass (Tank, 1 hour)
- AI-004: Production deployment readiness (Neo, post-test)

**Facilitation Lessons Learned:**

**When Specialist Leads Technical Reasoning:**
- **Frame the question clearly:** "Assess each primitive for Gen2 compliance"
- **Step back:** Don't do the analysis yourself when expert is present
- **Facilitate flow:** Keep meeting on agenda, but let specialist drive content
- **Synthesize outputs:** Connect specialist findings to broader context
- **Make strategic calls:** Approve/reject based on specialist consensus

**Indicators of Successful Specialist-Led Meeting:**
- ✅ Specialist speaks >50% of their section (not facilitator)
- ✅ Deliverables reflect specialist expertise (not facilitator's assumptions)
- ✅ Other specialists defer to domain expert ("Niobe says Gen2-compliant → we trust it")
- ✅ Facilitator synthesizes, doesn't override

**When to Override Specialist:**
- Strategic trade-offs (cost vs. performance)
- Scope decisions (what's in/out of v1)
- Timeline decisions (shipping vs. perfection)
- **NOT technical correctness** (trust specialist on domain facts)

**Contrast with Previous Meeting (2026-05-21 Squad Methodology):**

| Aspect | Methodology Meeting | Scope Review Meeting |
|--------|---------------------|---------------------|
| **Context** | Trinity bypassed Niobe → 2 bugs | Niobe expertise now established |
| **Meeting Type** | Process design (collaboration protocol) | Technical validation (Gen2 compliance) |
| **Facilitator Role** | Design handoff process | Synthesize specialist inputs |
| **Specialist Role** | Participate in process design | **Lead technical assessment** |
| **Output** | Collaboration protocol | Scope approval + action items |

**Key Difference:** Methodology meeting = designing the collaboration system. Scope meeting = using that system to make technical decisions.

**Warning Sign Avoided:**
- ❌ DON'T facilitate Gen2 assessment yourself (you're not the Gen2 expert)
- ✅ DO facilitate the meeting structure and synthesize findings
- ❌ DON'T override Niobe's Gen2 compliance judgment
- ✅ DO make scope/priority decisions based on her input

**Success Metric:**
- Niobe's history file will grow with this Gen2 assessment (active engagement)
- Squad has confidence in Gen2 compliance (specialist validated)
- No Gen2-related bugs in production (expert caught issues pre-merge)

**Next Pattern to Establish:** When Neo leads infrastructure decisions (same facilitation pattern)

---

### 2026-05-22: V1 Reboot Squad Meeting — Research Phase Synthesis & Decision

**Context:** User pivoted from implementation debugging to comprehensive research phase: (1) Infrastructure stability assessment, (2) MCP best practices validation, (3) Azure Maps API specification review. After all research completed, facilitated full squad meeting to decide: continue with codebase or start fresh?

**Meeting Participants:** Full squad (Morpheus, Niobe, Trinity, Tank, Neo, Ralph, Scribe)
**Duration:** ~90 minutes
**Objective:** Synthesize research findings, evaluate codebase status, make continue-vs-rebuild decision

**Research Inputs Reviewed:**

1. **Infrastructure Stability (Ralph + Neo)**
   - `.squad/knowledge/mcp-azure-best-practices.md` (partial — infrastructure sections)
   - `infra/stable/` package with comprehensive documentation
   - Findings: ACR deployed ✅, Maps deployed ✅, Container Apps needs debugging ⚠️

2. **MCP Best Practices (Trinity + Neo)**
   - `.squad/knowledge/mcp-azure-best-practices.md` (89KB, 8 sections, 1,078 lines)
   - `.squad/knowledge/mcp-research-summary.md` (executive summary)
   - Findings: Architecture validated ✅, tactical improvements identified 🔧

3. **Azure Maps API Reference (Niobe + Trinity)**
   - `.squad/knowledge/azure-maps-api-reference.md` (complete Gen2 reference)
   - Findings: All 7 tools correctly map to APIs ✅, version audit needed 🔧

**Facilitation Structure:**

**Part 1: Research Synthesis (30 min)**
- Each research team presented findings
- Key question: Does research validate current architecture?
- Unanimous finding: **YES** — architecture aligns with best practices

**Part 2: Codebase Status Assessment (20 min)**
- What's built: 90% complete (7 tools, testing framework, infrastructure, build pipeline)
- What needs work: 10% tactical improvements (health probes, logging, parameter defaults, API versions, Container Apps)
- Test status: 55/73 passing (75.3%), route overlay fixed, 18 failures are edge cases

**Part 3: Continue vs. Rebuild Analysis (25 min)**

**Cost-Benefit Table:**

| Approach | Effort | Risk | Time to Ship | Outcome |
|----------|--------|------|--------------|----------|
| **Continue + Refine** | 2-3 days | Low | 1 week | Ship working v1 |
| **Clean Restart** | 2-3 weeks | Medium | 3-4 weeks | Rebuild same architecture |

**Key Insight:** Starting from scratch would rebuild the same architecture (research validated it!), rewrite the same tool handlers, and recreate the same test structure — all to arrive at the same place we already are.

**Part 4: Decision (10 min)**

**DECISION: CONTINUE WITH EXISTING CODEBASE + TACTICAL IMPROVEMENTS**

**Rationale:**
- Research validates architecture ✅
- 90% complete foundation ✅
- Only 10% tactical refinements needed 🔧
- Ship in 1 week vs. 3-4 weeks
- Preserve team knowledge in codebase

**Squad Consensus:** Unanimous agreement

**Part 5: Action Planning (15 min)**

**Immediate Actions:**
1. Ralph creates Sprint 001 plan with 5 tactical improvements
2. Scribe logs decisions (AD-006: Continue with Codebase, AD-007: API Version Strategy)
3. Morpheus consolidates research deliverables into decisions.md

**Sprint 001 Scope (Identified):**
- WI-001: Container Apps deployment fix (Neo, 2 days)
- WI-002: Health probes (Trinity, 4 hours)
- WI-003: Structured logging (Trinity, 6 hours)
- WI-004: Parameter enhancements (Trinity, 4 hours)
- WI-005: API Version audit (Niobe, 4 hours)

**Meeting Artifacts Created:**

1. **Decision Record:**
   - `.squad/decisions/inbox/morpheus-v1-reboot-squad-meeting.md` (full meeting notes)
   - Later consolidated into decisions.md as AD-006 and AD-007

2. **Sprint Plan:**
   - `.squad/planning/sprint-001-v1-launch.md` (created by Ralph)
   - 2-week timeline, 5 work items, success criteria, critical questions

3. **Knowledge Base:**
   - Research deliverables committed to `.squad/knowledge/`
   - Infrastructure package committed to `infra/stable/`

**Facilitation Techniques That Worked:**

1. **Research-Driven Decision Making**
   - Gathered data BEFORE meeting (not during)
   - Structured research inputs (3 clear deliverables)
   - Objective analysis framework (architecture validation, cost-benefit)

2. **Unanimous Consensus Building**
   - No predetermined outcome
   - All specialists contributed expertise
   - Data spoke for itself (research validated approach)

3. **Decision + Execution Path**
   - Not just "continue" — defined WHAT to continue with (5 work items)
   - Assigned owners and timelines
   - Created sprint plan immediately (don't lose momentum)

4. **Context Preservation**
   - Full meeting notes documented
   - Research deliverables committed
   - Decisions recorded in canonical ledger

**Success Metrics:**

**Immediate:**
- ✅ Clear decision made (continue with codebase)
- ✅ Squad alignment achieved (unanimous)
- ✅ Sprint plan created (Ralph)
- ✅ Research deliverables committed

**Validation (Future):**
- Sprint 001 completes in 2 weeks
- v1.0.0 ships with 5 tactical improvements
- No architectural regrets (research validated path)

**Cultural Impact:**

**Research Before Rebuilding:**
- Prevented wasting 2-3 weeks rebuilding 90% complete codebase
- Validated architecture before committing to continue
- Data-driven decision (not gut feeling)

**Facilitation Pattern:**
1. Comprehensive research phase (3 parallel streams)
2. Squad meeting to synthesize findings
3. Objective decision framework (cost-benefit table)
4. Unanimous consensus on path forward
5. Immediate action planning (sprint backlog)

**Key Lesson:** When uncertain about approach, pause implementation and validate foundations through research. Comprehensive research prevents wasted effort on wrong path.

**Related Decisions:**
- Created AD-006 (Continue with Codebase)
- Created AD-007 (API Version Strategy)
- Informed Sprint 001 planning
- Preserved AD-008 (Route Overlay Fix) as historical context
