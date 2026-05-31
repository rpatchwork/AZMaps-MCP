# Deployment Verification Report

- Date: 2026-05-31
- Requested by: rpatchwork
- Operator: Neo (Cloud Engineer)
- Workspace: `c:\temp\AZMaps-MCP`

## Mission Outcome

Container runtime is in working state for integration verification via Azure Container Apps endpoint.

## 5) Immutable Verified Deployment (2026-05-31)

This section supersedes the earlier blocked remediation attempt for runtime provenance.

### Deployment Intent
- Deploy the verified labeled-pin fix code from current repository commit to the active Azure Container App using immutable image identity.

### Build + Artifact Provenance
- Source commit (full): `619c4ec1122601784f750ca24a33dfaf5ec84c50`
- Source commit (short): `619c4ec11226`
- Commit-linked tag pushed to ACR: `azmapsmcp.azurecr.io/azmaps-mcp:commit-619c4ec11226`
- Immutable digest: `sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`
- Immutable image reference deployed: `azmapsmcp.azurecr.io/azmaps-mcp@sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`

### Runtime Deployment Result
- Azure Container App: `ca-azmaps-mcp-dev`
- Active revision after deploy: `ca-azmaps-mcp-dev--0000007`
- Active image on template: `azmapsmcp.azurecr.io/azmaps-mcp@sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`
- Revision provisioning state: `Provisioned`
- Revision health state: `Healthy`

### Endpoint Verification
- Endpoint: `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- `GET /healthz`: `200`, service=`azmaps-mcp-server`, version=`1.0.0`
- `POST /message` labeled-pin smoke (`maps_render_static_map` with labels `Hotel & Spa #2` and `Stop 1`):
  - `success: true`
  - `sizeBytes: 361730`

### Required Output Snapshot
- Azure deploy succeeded: **YES**
- Endpoint tested: **YES**
- Deployed image ref: `azmapsmcp.azurecr.io/azmaps-mcp:commit-619c4ec11226` and `azmapsmcp.azurecr.io/azmaps-mcp@sha256:023a7a67bb5a165fe4a6266875b12bda9246e63140e4eca2a21cc4b2b5b8d710`
- Active revision: `ca-azmaps-mcp-dev--0000007`
- Blocker: **NONE (for this deployment run)**

## 1) Azure Remediation Attempt (Required First)

### Live Azure Context Check
- Subscription: `a235bb1a-6ca9-4949-91f0-c82ac40a4576`
- Resource Group: `rg-azmaps-mcp-dev`
- Container Apps found:
  - `azmapsmcp-mcp-dev`
  - `ca-azmaps-mcp-dev`

### Remediation Deployment Attempt
Attempted:

```powershell
az deployment group create \
  -g rg-azmaps-mcp-dev \
  --template-file infra/archive/deploy-3-container-apps-FAILED/container-apps.bicep \
  --parameters infra/archive/deploy-3-container-apps-FAILED/container-apps.bicepparam \
  --parameters containerImage="azmapsmcp.azurecr.io/azmaps-mcp:latest" \
  --parameters acrLoginServer="azmapsmcp.azurecr.io" \
  --parameters mapsEndpoint="https://atlas.microsoft.com/" \
  --parameters mapsApiKey="<redacted>" \
  --name containerapp-remediation-20260531-005753
```

Result: **FAILED**
- Error code: `ContainerAppOperationInProgress`
- Error detail: Cannot modify `azmapsmcp-mcp-dev` because an active provisioning operation is in progress.
- Operation ID: `ed1e4390-9a16-487b-a9f0-e7c24d668877`

## 2) Azure Runtime Verification (Reachable Endpoint)

Authoritative runtime endpoint:
- `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`

Health check:
- `GET /healthz` => `200 OK`
- Response body included:
  - `status: healthy`
  - `service: azmaps-mcp-server`
  - `version: 1.0.0`

MCP smoke checks:
- `POST /message` with `tools/list` => success (`toolCount=8`)
- `POST /message` with `maps_get_timezone` for Seattle coords => success (`America/Los_Angeles`)

Non-authoritative legacy endpoint status:
- `https://azmapsmcp-mcp-dev.agreeablepond-17747d7c.eastus.azurecontainerapps.io`
- `/healthz` and `/message` returned HTTP 404 during verification

## 3) Local Docker Fallback Attempt

Triggered because remediation deployment was blocked by environment constraint.

Attempted fallback flow:
1. Build local image from `.scratch/Dockerfile.local-fallback`
2. Run container on localhost:3000 with equivalent env vars:
   - `AZURE_MAPS_ENDPOINT=https://atlas.microsoft.com/`
   - `AZURE_MAPS_API_KEY=<redacted>`
3. Run health/smoke checks against `http://localhost:3000`

Result: **BLOCKED**
- Docker daemon unavailable in this environment:
  - `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
- Therefore local Docker fallback container could not be started.

## Deliverables Summary

- Azure deploy remediation succeeded: **NO**
  - Why: `ContainerAppOperationInProgress` blocked updates to `azmapsmcp-mcp-dev`.
- Fallback used: **Attempted but blocked by local Docker daemon availability**
  - Local container command attempted: `docker build ...` then `docker run ... -p 3000:3000 ...`
  - Local endpoint availability: **NO** (`localhost:3000` not reachable)
- Reachable runtime endpoint delivered: **YES (Azure)**
  - `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io`
- Verification evidence paths:
  - `infra/stable/DEPLOYMENT_MANIFEST.md`
  - `.squad/reports/deployment-verification.md`
- Remaining blockers:
  - Azure legacy app update blocked by in-progress operation (`azmapsmcp-mcp-dev`)
  - Local Docker daemon not running/available in current host environment

## 4) Tank MCP Integration Validation (2026-05-31)

- Requested by: `rpatchwork`
- Tester: Tank
- Endpoint source: This report (`Section 2: Azure Runtime Verification`)
- Endpoint used:
  - `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message`

### Commands Run

```powershell
Set-Location 'c:\temp\AZMaps-MCP'; .\.scratch\tank-mcp-integration-check.ps1
```

```powershell
Set-Location 'c:\temp\AZMaps-MCP'; $endpoint='https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message'; $body=@{jsonrpc='2.0';id=203;method='tools/call';params=@{name='maps_render_static_map';arguments=@{center=@{latitude=47.6134;longitude=-122.3407};zoom=13;width=800;height=600;format='png';pins=@(@{latitude=47.6062;longitude=-122.3321;label='Hotel & Spa #2'},@{latitude=47.6205;longitude=-122.3493;label='Stop 1'})}}} | ConvertTo-Json -Depth 20 -Compress; $r=Invoke-RestMethod -Uri $endpoint -Method POST -ContentType 'application/json' -Body $body; $r.result.content[0].text
```

```powershell
Set-Location 'c:\temp\AZMaps-MCP'; $endpoint='https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message'; $body=@{jsonrpc='2.0';id=205;method='tools/call';params=@{name='maps_render_static_map';arguments=@{center=@{latitude=47.6134;longitude=-122.3407};zoom=13;width=800;height=600;format='png';pins=@(@{latitude=47.6062;longitude=-122.3321;label='Stop1'},@{latitude=47.6205;longitude=-122.3493;label='Stop2'})}}} | ConvertTo-Json -Depth 20 -Compress; $r=Invoke-RestMethod -Uri $endpoint -Method POST -ContentType 'application/json' -Body $body; $r.result.content[0].text
```

### Scenario Results

- Run timestamp: `2026-05-31 01:01:48-05:00`
- `tools/list`: **PASS**
  - Evidence: `toolCount=8`
- `maps_render_static_map` with labeled pins: **FAIL**
  - Evidence: `{"success":false,"error":{"code":"INVALID_INPUT",...}}`
  - Observed errors:
    - `{"pins":["Invalid format for location value ''Hotel '."]}`
    - `{"pins":["Invalid format for location value ''Stop1' -122.3321 47.6062' in longitude..."]}`
- Additional tool (`maps_get_timezone`): **PASS**
  - Evidence: `timezoneId=America/Los_Angeles; utcOffset=-08:00`

### Tank Verdict For Client Retest

- Overall status: **NO-GO**
- Reason: Required labeled-pin static map MCP scenario is failing on the verified live container endpoint, despite other MCP scenarios passing.

## 5) Tank Live Retest After Deploy (2026-05-31)

- Requested by: `rpatchwork`
- Tester: Tank
- Endpoint source: This report (`Section 2: Azure Runtime Verification`)
- Endpoint used:
  - `https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message`

### Commands Run

```powershell
Set-Location 'c:\temp\AZMaps-MCP';
$endpoint='https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message';
# POST tools/list
$body=@{jsonrpc='2.0';id=301;method='tools/list';params=@{}}|ConvertTo-Json -Depth 20 -Compress;
Invoke-RestMethod -Uri $endpoint -Method POST -ContentType 'application/json' -Body $body
```

```powershell
Set-Location 'c:\temp\AZMaps-MCP';
$endpoint='https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message';
# POST tools/call maps_render_static_map (numeric labels)
# POST tools/call maps_render_static_map (text labels)
# POST tools/call maps_render_static_map (routeGeometry + labels)
# POST tools/call maps_render_static_map (mixed labeled/unlabeled)
# POST tools/call maps_get_timezone
```

Command intents captured from run output:

- `tools/call maps_render_static_map with pins labels 1 and 2`
- `tools/call maps_render_static_map with text labels Hotel Lobby and Gate A`
- `tools/call maps_render_static_map with routeGeometry + labeled pins`
- `tools/call maps_render_static_map with mixed labeled/unlabeled pins`
- `tools/call maps_get_timezone latitude=47.6205 longitude=-122.3493`

### Per-Case Results

- Run timestamp: `2026-05-31 01:18:56-05:00`
- `tools/list`: **PASS**
  - Evidence: `toolCount=8`
- `maps_render_static_map` labeled pins (numeric): **PASS**
  - Evidence: `sizeBytes=218613; contentType=image/png`
- `maps_render_static_map` labeled pins (text): **PASS**
  - Evidence: `sizeBytes=218921; contentType=image/png`
- `maps_render_static_map` labeled pins with `routeGeometry`: **PASS**
  - Evidence: `sizeBytes=220508; contentType=image/png`
- `maps_render_static_map` mixed labeled/unlabeled pins: **PASS**
  - Evidence: `sizeBytes=218516; contentType=image/png`
- Additional maps tool `maps_get_timezone`: **PASS**
  - Evidence: `timezoneId=America/Los_Angeles; utcOffset=-08:00`

### Tank Verdict For Client Retest (After Deploy)

- Overall status: **GO**
- Reason: All required live endpoint checks passed, including labeled-pin static-map variants (numeric, text, routeGeometry, mixed) and additional maps tool validation.
