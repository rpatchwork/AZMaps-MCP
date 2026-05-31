# AZMaps-MCP Client Test Script
# 
# This PowerShell script demonstrates how to call the AZMaps-MCP service
# using JSON-RPC 2.0 over HTTP. Use this as a reference for integrating
# with Clawpilot or other MCP clients.

$ServiceUrl = "https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message"

function Invoke-MCPRequest {
    param(
        [string]$Method,
        [hashtable]$Params = @{}
    )
    
    $request = @{
        jsonrpc = "2.0"
        method = $Method
        params = $Params
        id = (Get-Date).Ticks
    } | ConvertTo-Json -Depth 10 -Compress
    
    Write-Host "`n📤 Request: $Method" -ForegroundColor Cyan
    Write-Host $request -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $ServiceUrl `
            -Method POST `
            -ContentType "application/json" `
            -Body $request
        
        Write-Host "📥 Response: SUCCESS" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

function Test-ListTools {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "TEST 1: List All Tools" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    
    $result = Invoke-MCPRequest -Method "tools/list"
    $tools = $result.result.tools
    
    Write-Host "`n✅ Found $($tools.Count) tools:" -ForegroundColor Green
    foreach ($tool in $tools) {
        $desc = $tool.description.Substring(0, [Math]::Min(60, $tool.description.Length))
        Write-Host "  • $($tool.name): $desc..." -ForegroundColor White
    }
}

function Test-Geocode {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "TEST 2: Geocode Address" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    
    $result = Invoke-MCPRequest -Method "tools/call" -Params @{
        name = "maps_search_address"
        arguments = @{
            address = "1 Microsoft Way, Redmond, WA"
        }
    }
    
    $content = $result.result.content[0].text | ConvertFrom-Json
    $location = $content.data
    
    Write-Host "`n✅ Geocoded: $($location.formattedAddress)" -ForegroundColor Green
    Write-Host "   Coordinates: $($location.coordinates.latitude), $($location.coordinates.longitude)" -ForegroundColor White
    Write-Host "   Confidence: $($location.confidence)" -ForegroundColor White
}

function Test-Route {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "TEST 3: Calculate Route" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    
    $result = Invoke-MCPRequest -Method "tools/call" -Params @{
        name = "maps_calculate_route"
        arguments = @{
            waypoints = @(
                @{ latitude = 47.6205; longitude = -122.3493 }  # Space Needle
                @{ latitude = 47.6062; longitude = -122.3321 }  # Pike Place Market
            )
        }
    }
    
    $content = $result.result.content[0].text | ConvertFrom-Json
    $route = $content.data
    
    Write-Host "`n✅ Route calculated:" -ForegroundColor Green
    Write-Host "   Distance: $([Math]::Round($route.distanceMeters / 1000, 2)) km" -ForegroundColor White
    Write-Host "   Duration: $([Math]::Round($route.durationSeconds / 60)) minutes" -ForegroundColor White
}

function Test-Timezone {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "TEST 4: Get Timezone" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    
    $result = Invoke-MCPRequest -Method "tools/call" -Params @{
        name = "maps_get_timezone"
        arguments = @{
            latitude = 47.6205
            longitude = -122.3493
        }
    }
    
    $content = $result.result.content[0].text | ConvertFrom-Json
    $tz = $content.data
    
    Write-Host "`n✅ Timezone: $($tz.timezoneId)" -ForegroundColor Green
    Write-Host "   UTC Offset: $($tz.utcOffset)" -ForegroundColor White
    Write-Host "   DST Active: $($tz.dstActive)" -ForegroundColor White
}

# Main execution
Write-Host "`n🚀 AZMaps-MCP Client Test Suite" -ForegroundColor Cyan
Write-Host "Service: $ServiceUrl" -ForegroundColor Gray

try {
    Test-ListTools
    Test-Geocode
    Test-Route
    Test-Timezone
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
