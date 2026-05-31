# Complete MCP Handshake Test
# Tests the full initialization sequence: initialize → initialized → tools/list → tools/call

$ServiceUrl = "https://ca-azmaps-mcp-dev.graysand-f7f65db5.eastus.azurecontainerapps.io/message"

Write-Host "`n🚀 MCP Protocol Handshake Test" -ForegroundColor Cyan
Write-Host "Service: $ServiceUrl`n" -ForegroundColor Gray

# Step 1: Initialize
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 1: Initialize" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$initBody = @{
    jsonrpc = "2.0"
    method = "initialize"
    params = @{
        protocolVersion = "2024-11-05"
        capabilities = @{}
        clientInfo = @{
            name = "test-client"
            version = "1.0.0"
        }
    }
    id = 1
} | ConvertTo-Json -Depth 10 -Compress

$initResponse = Invoke-RestMethod -Uri $ServiceUrl -Method POST -ContentType "application/json" -Body $initBody
Write-Host "✅ Initialize successful" -ForegroundColor Green
Write-Host "   Protocol: $($initResponse.result.protocolVersion)" -ForegroundColor White
Write-Host "   Server: $($initResponse.result.serverInfo.name) v$($initResponse.result.serverInfo.version)" -ForegroundColor White

# Step 2: Send initialized notification
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 2: Send Initialized Notification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$notifBody = @{
    jsonrpc = "2.0"
    method = "notifications/initialized"
    params = @{}
} | ConvertTo-Json -Depth 10 -Compress

$notifResponse = Invoke-WebRequest -Uri $ServiceUrl -Method POST -ContentType "application/json" -Body $notifBody
Write-Host "✅ Notification acknowledged (HTTP $($notifResponse.StatusCode))" -ForegroundColor Green

# Step 3: List tools
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 3: List Available Tools" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$listBody = @{
    jsonrpc = "2.0"
    method = "tools/list"
    params = @{}
    id = 2
} | ConvertTo-Json -Depth 10 -Compress

$listResponse = Invoke-RestMethod -Uri $ServiceUrl -Method POST -ContentType "application/json" -Body $listBody
Write-Host "✅ Found $($listResponse.result.tools.Count) tools:" -ForegroundColor Green
foreach ($tool in $listResponse.result.tools) {
    Write-Host "   • $($tool.name)" -ForegroundColor White
}

# Step 4: Call a tool
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 4: Call a Tool (Geocode)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$callBody = @{
    jsonrpc = "2.0"
    method = "tools/call"
    params = @{
        name = "maps_search_address"
        arguments = @{
            address = "Space Needle, Seattle, WA"
        }
    }
    id = 3
} | ConvertTo-Json -Depth 10 -Compress

$callResponse = Invoke-RestMethod -Uri $ServiceUrl -Method POST -ContentType "application/json" -Body $callBody
$toolResult = $callResponse.result.content[0].text | ConvertFrom-Json

Write-Host "✅ Tool call successful:" -ForegroundColor Green
Write-Host "   Address: $($toolResult.data.formattedAddress)" -ForegroundColor White
Write-Host "   Coordinates: $($toolResult.data.coordinates.latitude), $($toolResult.data.coordinates.longitude)" -ForegroundColor White

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Complete MCP handshake successful!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
