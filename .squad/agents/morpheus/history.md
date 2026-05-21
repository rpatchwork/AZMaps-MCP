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

**Next Actions:**
- Neo to review infrastructure decisions (AD-001, AD-003)
- Niobe to review MCP tool catalog and quality definitions (AD-002, AD-004)
- Team consensus needed on Phase 1 scope and timeline
