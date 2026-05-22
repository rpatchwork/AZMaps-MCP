# AZMaps-MCP Stable Infrastructure Deployment
# This script deploys all stable infrastructure components

#Requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-azmaps-mcp-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipACR,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMaps,
    
    [Parameter(Mandatory=$false)]
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AZMaps-MCP Stable Infrastructure Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verify Azure CLI is installed
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Error "❌ Azure CLI not found. Please install from: https://learn.microsoft.com/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in
Write-Host "🔍 Checking Azure login status..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "❌ Not logged into Azure. Please run: az login"
    exit 1
}
Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray

# Ensure resource group exists
Write-Host ""
Write-Host "📦 Checking resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroupName --output tsv
if ($rgExists -eq "false") {
    Write-Host "   Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
    if (-not $WhatIf) {
        az group create --name $ResourceGroupName --location $Location --output none
        Write-Host "✅ Resource group created" -ForegroundColor Green
    } else {
        Write-Host "   [WhatIf] Would create resource group" -ForegroundColor Gray
    }
} else {
    Write-Host "✅ Resource group exists: $ResourceGroupName" -ForegroundColor Green
}

# Store the script's location
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraPath = Split-Path -Parent $scriptPath

# Track deployment results
$deploymentResults = @()

# ═══════════════════════════════════════════════════════════
# Deploy ACR
# ═══════════════════════════════════════════════════════════
if (-not $SkipACR) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  1. Azure Container Registry (ACR)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $acrPath = Join-Path $scriptPath "1-acr"
    Push-Location $acrPath
    
    try {
        Write-Host "📂 Directory: $acrPath" -ForegroundColor Gray
        Write-Host "🚀 Deploying ACR..." -ForegroundColor Yellow
        
        if (-not $WhatIf) {
            $acrDeployment = az deployment group create `
                --resource-group $ResourceGroupName `
                --template-file acr.bicep `
                --parameters acr.bicepparam `
                --name "acr-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
                --output json | ConvertFrom-Json
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ ACR deployed successfully" -ForegroundColor Green
                $acrLoginServer = $acrDeployment.properties.outputs.acrLoginServer.value
                Write-Host "   Login Server: $acrLoginServer" -ForegroundColor Gray
                
                $deploymentResults += @{
                    Component = "ACR"
                    Status = "Success"
                    LoginServer = $acrLoginServer
                }
            } else {
                Write-Warning "⚠️  ACR deployment failed"
                $deploymentResults += @{
                    Component = "ACR"
                    Status = "Failed"
                }
            }
        } else {
            Write-Host "   [WhatIf] Would deploy ACR" -ForegroundColor Gray
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️  Skipping ACR deployment" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════
# Deploy Azure Maps
# ═══════════════════════════════════════════════════════════
if (-not $SkipMaps) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  2. Azure Maps Gen2" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $mapsPath = Join-Path $scriptPath "2-maps"
    Push-Location $mapsPath
    
    try {
        Write-Host "📂 Directory: $mapsPath" -ForegroundColor Gray
        Write-Host "🚀 Deploying Azure Maps..." -ForegroundColor Yellow
        
        if (-not $WhatIf) {
            $mapsDeployment = az deployment group create `
                --resource-group $ResourceGroupName `
                --template-file azure-maps.bicep `
                --parameters azure-maps.bicepparam `
                --name "maps-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
                --output json | ConvertFrom-Json
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Azure Maps deployed successfully" -ForegroundColor Green
                $mapsEndpoint = $mapsDeployment.properties.outputs.mapsEndpoint.value
                $mapsAccountName = $mapsDeployment.properties.outputs.mapsAccountName.value
                Write-Host "   Account: $mapsAccountName" -ForegroundColor Gray
                Write-Host "   Endpoint: $mapsEndpoint" -ForegroundColor Gray
                Write-Host "   🔐 API Key: [Secure - Use az deployment show to retrieve]" -ForegroundColor Gray
                
                $deploymentResults += @{
                    Component = "Azure Maps"
                    Status = "Success"
                    AccountName = $mapsAccountName
                    Endpoint = $mapsEndpoint
                }
            } else {
                Write-Warning "⚠️  Azure Maps deployment failed"
                $deploymentResults += @{
                    Component = "Azure Maps"
                    Status = "Failed"
                }
            }
        } else {
            Write-Host "   [WhatIf] Would deploy Azure Maps" -ForegroundColor Gray
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️  Skipping Azure Maps deployment" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not $WhatIf) {
    foreach ($result in $deploymentResults) {
        $statusIcon = if ($result.Status -eq "Success") { "✅" } else { "❌" }
        Write-Host "$statusIcon $($result.Component): $($result.Status)" -ForegroundColor $(if ($result.Status -eq "Success") { "Green" } else { "Red" })
    }
    
    $successCount = ($deploymentResults | Where-Object { $_.Status -eq "Success" }).Count
    $totalCount = $deploymentResults.Count
    
    Write-Host ""
    Write-Host "📊 Result: $successCount/$totalCount deployments successful" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
    
    if ($successCount -eq $totalCount) {
        Write-Host ""
        Write-Host "🎉 All deployments completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Build and push Docker image to ACR" -ForegroundColor Gray
        Write-Host "  2. Retrieve Maps API key for configuration" -ForegroundColor Gray
        Write-Host "  3. Test MCP server locally with Azure Maps" -ForegroundColor Gray
    }
} else {
    Write-Host "[WhatIf] Deployment simulation complete" -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
