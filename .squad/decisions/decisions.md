# Squad Decisions

All architectural, technical, and operational decisions for the AZMaps-MCP project.

---

## Administrative Note — User Identity

**User:** rpatchwork (GitHub: rpatchwork/AZMaps-MCP)  
**"Brady" Persona:** Early sprint planning used "Brady" as a placeholder persona for UAT/validation role  
**Clarification:** rpatchwork IS the actual user, developer, and validator. All references to "Brady" in planning documents should be understood as rpatchwork performing those activities.

This note added 2026-05-22 to prevent confusion in squad documentation.

---

## 2026-05-21 — V1 Scope Review (Gen2 Compliance)

**Facilitator:** Morpheus (Lead)  
**Attendees:** Niobe (Azure Maps Gen2 Expert), Trinity (MCP Expert), Tank (Tester), Neo (Infrastructure)  
**Status:** 🔒 APPROVED — V1 scope locked, action items assigned

### Decision

**APPROVE V1 scope with current 7 primitives (no changes):**

1. `maps_search_address` (Single Geocode)
2. `maps_batch_geocode` (Batch Geocoding)
3. `maps_reverse_geocode` (Coordinates → Address)
4. `maps_search_nearby` (POI Search)
5. `maps_calculate_route` (Route Directions)
6. `maps_get_timezone` (Timezone Lookup)
7. `maps_render_static_map` (Static Map Image)

**All 7 primitives validated as Gen2-compliant by Niobe.**

### Rationale

1. **Gen2 compliance validated:** All 7 tools use Gen2 APIs correctly (Niobe's assessment)
2. **Travel agent fit validated:** All core scenarios covered (Niobe's use case analysis)
3. **MCP design validated:** Tool schemas follow best practices (Trinity's research)
4. **Testing validated:** Blockers are trivial, performance targets met (Tank's validation)

### Key Findings

- **2 blockers identified:** Both are 1-line fixes (route endpoint path, static map pin format)
- **Timezone promoted to P0:** Cross-timezone trip handling is CRITICAL, not nice-to-have
- **73 integration tests:** 53 passing, 20 failing (13 from trivial blockers, 7 are expected behavior)
- **Performance targets met:** All APIs within latency requirements (AD-003)

### Action Items

- **AI-001:** Fix Route API endpoint (add `/json` suffix) — Trinity, 30 min
- **AI-002:** Fix Static Map pin format (space-separated coordinates) — Trinity, 30 min
- **AI-003:** Validate all tests pass (expect 73/73) — Tank, 1 hour
- **AI-004:** Production deployment readiness checklist — Neo

### Gen2 Capabilities NOT in V1 (Deferred)

- Traffic incidents API
- Weather overlays
- Isochrone API (travel time polygons)
- Route matrix (many-to-many calculations)

**Niobe's assessment:** Current 7 primitives are the RIGHT Gen2 capabilities for travel agent MVP.

---

## 2026-05-21 — Azure Maps Gen2 Deployment Verification

**Verified by:** Neo (Infrastructure Specialist)  
**Status:** ✅ CONFIRMED Gen2 Compliant

### Verification Summary

Azure Maps account `azmapsmcp-maps-dev` deployed as **Gen2 (SKU G2)** with no Gen1 references.

### Deployed Configuration

```json
{
  "kind": "Gen2",
  "name": "azmapsmcp-maps-dev",
  "sku": {
    "name": "G2",
    "tier": "Standard"
  },
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

### Infrastructure Code Audit

**File:** `infra/modules/azure-maps.bicep`

- ✅ `@allowed(['G2'])` decorator prevents Gen1 SKU deployment
- ✅ `kind: 'Gen2'` explicitly set
- ✅ No S0/S1 SKU references anywhere in codebase
- ✅ Workspace-wide scan for Gen1 patterns: **zero matches**

### Compliance Statement

The AZMaps-MCP infrastructure is **fully Gen2 compliant:**

1. ✅ Deployed Azure Maps account uses Gen2 (SKU G2)
2. ✅ Infrastructure as Code explicitly restricts to Gen2 (G2 SKU only)
3. ✅ No Gen1 references (S0, S1) found in any infrastructure files
4. ✅ Safety enforced via Bicep @allowed decorator

**No remediation required.**

---

## 2026-05-21 — Charter Update: Niobe Gen2 Enforcement Role

**Proposed by:** Niobe (Azure Maps Specialist)  
**Authority:** Brady directive — "Azure Maps Gen2 only is a rule that gets followed everywhere"  
**Status:** Approved

### New Responsibility: Gen2 Compliance Gatekeeper

Niobe is the Gen2 compliance enforcer for Azure Maps. NO ONE on the squad may reference, deploy, or document Gen1 patterns without Niobe's explicit rejection.

### Enforcement Actions

- **Review all Azure Maps infrastructure** — Reject any Bicep/Terraform referencing S0 or S1 SKUs
- **Audit API documentation** — Verify all endpoint guidance is Gen2-compatible
- **Challenge Gen1 references** — Immediately correct any team member mentioning Gen1
- **Maintain Gen2 knowledge base** — History file must be Gen1-free
- **Pre-deployment verification** — Before Neo deploys Maps resources, verify SKU is G2

### Red Flags to Reject

- Infrastructure mentioning "S0" or "S1" SKUs
- Documentation suggesting "Gen1 vs Gen2" migration paths
- API guidance for deprecated Gen1-only endpoints
- Team members asking "which tier should we use?" (Answer: G2, always)

### Collaboration Model

- **Neo:** Verify Bicep modules only allow G2 SKU
- **Trinity:** Ensure MCP tools don't encode Gen1 assumptions
- **Tank:** Test cases must validate Gen2 deployment success
- **Scribe:** Documentation uses "Gen2 (G2 SKU)" consistently

### Implementation

1. Niobe audits and remediates Gen1 references in own history file
2. Niobe creates Gen2 compliance checklist for squad
3. Before next deployment: Niobe reviews Neo's infrastructure for G2-only enforcement
4. Ongoing: Niobe challenges any Gen1 mentions in squad communication

---

## 2026-05-21 — Gen2 Compliance Checklist

**Authority:** Brady directive — Gen1 (S0/S1 SKUs) is deprecated, Gen2 (G2 SKU) required  
**Enforced by:** Niobe (Azure Maps Specialist)

### Compliance Rules

**✅ ALWAYS Use Gen2 (G2 SKU):**
- Azure Maps account SKU: G2 (only valid option)
- Account kind: "Gen2" (explicitly set in infrastructure)
- API authentication: Subscription key or Managed Identity
- Documentation references: "Gen2 account" or "G2 SKU"

**❌ NEVER Use Gen1 (Deprecated):**
- Forbidden SKUs: S0, S1 (cannot be provisioned for new accounts)
- Forbidden kind: "Gen1" (deprecated)
- No migration guidance: Do not document Gen1→Gen2 migration
- No ambiguous comparisons: If mentioning Gen1, must state "DEPRECATED — NEVER USE"

### Pre-Flight Checks by Role

**Neo (Infrastructure):**
- [ ] Bicep/Terraform SKU parameter restricted to `['G2']` only
- [ ] Resource definition includes `kind: 'Gen2'`
- [ ] No S0 or S1 references in any parameter files
- [ ] Workspace-wide search for `S0|S1|Gen1` returns zero matches
- [ ] **Niobe approval:** "Infrastructure reviewed — Gen2 compliant"

**Trinity (MCP Implementation):**
- [ ] Endpoint URLs use Gen2-compatible API versions
- [ ] Authentication method works with Gen2 accounts
- [ ] No hardcoded assumptions about Gen1 SKU behavior
- [ ] Error handling doesn't reference Gen1 quotas or limits
- [ ] **Niobe approval:** "API integration reviewed — Gen2 compatible"

**Tank (Testing):**
- [ ] Test fixtures assume Gen2 account (G2 SKU)
- [ ] Test cases validate Gen2 deployment success
- [ ] No test scenarios for Gen1 SKU fallback
- [ ] Integration tests verify Gen2 API responses
- [ ] **Niobe approval:** "Test plan reviewed — Gen2 assumptions validated"

**Scribe (Documentation):**
- [ ] All references say "Gen2 account (G2 SKU)"
- [ ] No Gen1 comparison tables without "Gen1 = DEPRECATED" warnings
- [ ] Setup instructions specify Gen2 deployment only
- [ ] Troubleshooting docs don't reference Gen1 SKU issues
- [ ] **Niobe approval:** "Documentation reviewed — Gen2 terminology correct"

### Niobe's Review Gates (Mandatory)

| Stage | Deliverable | Approval Signal |
|-------|-------------|----------------|
| Infrastructure Design | Bicep modules for Azure Maps | "Infrastructure reviewed — Gen2 compliant" |
| API Integration | TypeScript HTTP client code | "API integration reviewed — Gen2 compatible" |
| Test Plan | Test cases for Maps features | "Test plan reviewed — Gen2 assumptions validated" |
| Documentation | User-facing docs and READMEs | "Documentation reviewed — Gen2 terminology correct" |

### Red Flags (Report to Niobe Immediately)

🚨 Alert Niobe if you see:
- "Should we use S0 or G2 tier?"
- Infrastructure code with `@allowed(['S0', 'S1', 'G2'])`
- Documentation section titled "Gen1 vs Gen2"
- Team discussion about "migrating from Gen1"

**Authority:** Brady has mandated Gen2-only compliance. Niobe is the enforcement mechanism.

---

## 2026-05-22 — Project Reboot: Research-Driven V1 Strategy

**Facilitator:** Brady (rpatchwork)  
**Context:** After deployment failures and implementation instability, pivot from fixing issues to research-first approach  
**Status:** 🔄 IN PROGRESS — Research phase active

### Decision

**HALT implementation work. LAUNCH three parallel research tasks:**

1. **Ralph + Neo:** Package stable infrastructure (ACR + Azure Maps Gen2 verified working)
2. **Trinity + Neo:** Research "MCP servers in Azure" hosting patterns and Azure-native MCP deployment strategies
3. **Niobe + Trinity:** Analyze Azure Maps Gen2 API specifications from official GitHub source code

### Rationale

**Symptoms of implementation-first approach:**
- Multiple deployment failures despite "fixes"
- Specification mismatches discovered post-implementation
- 7+ iteration debugging cycles without clear resolution
- Working features breaking in subsequent fixes
- Implementation quality high, but specification quality inconsistent

**Research-first approach advantages:**
- Specifications grounded in authoritative sources (GitHub source, not docs alone)
- Infrastructure patterns validated before code written
- Hosting strategy determined before deployment attempts
- Reduces rework cycles by validating assumptions early

### Research Tasks

#### Task 1: Stable Infrastructure Packaging (Ralph + Neo)

**Deliverable:** Deployment-ready infrastructure with verified working components

**Components to Package:**
- ✅ Azure Container Registry (azmapsmcp.azurecr.io)
- ✅ Azure Maps Gen2 account (azmapsmcp-maps-dev, SKU G2)
- ✅ Verified Docker image build process
- ✅ ACR push/pull authentication

**Success Criteria:**
- Infrastructure deployed and stable
- Gen2 compliance verified
- Docker image successfully pushed to ACR
- Authentication working end-to-end

**Status:** Infrastructure already deployed and verified. Packaging for reuse.

#### Task 2: MCP in Azure Hosting Patterns (Trinity + Neo)

**Deliverable:** Recommended Azure hosting strategy for MCP servers

**Research Questions:**
1. What are the proven patterns for hosting MCP servers in Azure?
2. Container Apps vs. App Service vs. Functions for MCP hosting?
3. Authentication/authorization patterns for MCP endpoints
4. Cold start mitigation strategies
5. Scaling and reliability considerations
6. Cost optimization approaches

**Sources:**
- Microsoft MCP documentation
- Azure architecture patterns
- Community implementations (GitHub)
- Model Context Protocol specification

**Success Criteria:**
- Documented hosting pattern recommendation
- Trade-offs analysis (Container Apps vs alternatives)
- Authentication strategy defined
- Deployment checklist created

#### Task 3: Azure Maps API Specification Analysis (Niobe + Trinity)

**Deliverable:** Authoritative Azure Maps Gen2 API specifications from source

**Research Questions:**
1. What is the canonical API version for Route API? (conflicting info: 1.0 vs 2025-01-01)
2. What is the exact Static Map path parameter syntax?
3. What encoding requirements exist for geographic parameters?
4. Are there Azure Maps SDK examples we can reference?

**Sources:**
- ✅ Azure Maps GitHub repository (official source code)
- ✅ REST API reference documentation
- ✅ JavaScript SDK documentation
- ✅ Migration guides (Bing Maps, Google Maps)
- ✅ Live API validation against deployed instance

**Success Criteria:**
- API specifications validated against source code
- Ambiguities resolved via authoritative sources
- Wire-level examples documented
- Encoding requirements cataloged

### Squad Coordination

**Meeting After Research:**
- All three tasks complete their research
- Squad reconvenes to discuss findings
- New V1 plan formulated based on research insights
- Sprint planning follows with validated specifications

**Sprint Planning (Post-Research):**
- Implementation work resumes with validated specifications
- Deployment strategy determined by hosting pattern research
- API integrations use source-verified specifications
- Infrastructure reused from packaged stable components

### Exit Criteria for Research Phase

**Research phase complete when:**
1. ✅ Infrastructure packaged and documented
2. ✅ Hosting pattern recommendation documented
3. ✅ Azure Maps API specifications validated from source
4. ✅ Squad meeting held to review findings
5. ✅ V1 plan updated based on research

**Expected Timeline:** 2-4 hours for research completion

### Process Improvement

**Lesson from V1 Iteration Cycles:**
- Implementation without validated specifications = rework
- "Research during implementation" = context switching costs
- Fixing implementation issues without root cause research = whack-a-mole
- 7+ debugging iterations = signal to stop and research

**New Pattern: Research → Plan → Implement → Validate**
- Research: Validate assumptions against authoritative sources
- Plan: Document specifications and architecture decisions
- Implement: Code to validated specifications
- Validate: Test against plan (not against assumptions)

**Authority:** Brady initiated project reboot via pivot decision

---

