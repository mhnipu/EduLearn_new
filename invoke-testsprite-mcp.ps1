# Testsprite MCP Invocation Script (PowerShell)
# This script helps invoke Testsprite MCP for automated testing

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testsprite MCP Test Execution" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1. Checking development server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Server is running on port 8080" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Server is not running!" -ForegroundColor Red
    Write-Host "   Please start the server with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Validating configuration files..." -ForegroundColor Yellow

if (Test-Path "testsprite.config.json") {
    Write-Host "   ✅ testsprite.config.json found" -ForegroundColor Green
} else {
    Write-Host "   ❌ testsprite.config.json not found" -ForegroundColor Red
    exit 1
}

if (Test-Path "PRD.md") {
    Write-Host "   ✅ PRD.md found" -ForegroundColor Green
} else {
    Write-Host "   ❌ PRD.md not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Project Information:" -ForegroundColor Yellow
Write-Host "   - Project: EDulearn - SmartLearn MVP" -ForegroundColor Gray
Write-Host "   - Framework: React + TypeScript" -ForegroundColor Gray
Write-Host "   - Base URL: http://localhost:8080" -ForegroundColor Gray
Write-Host "   - Test Tool: Testsprite MCP" -ForegroundColor Gray

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Ready for Testsprite MCP Execution" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To execute tests with Testsprite MCP in Cursor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Option 1: Use Cursor Chat" -ForegroundColor White
Write-Host "  Prompt: 'Run Testsprite tests on http://localhost:8080'" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option 2: Direct MCP Invocation" -ForegroundColor White
Write-Host "  If Testsprite MCP is configured, it will automatically:" -ForegroundColor Gray
Write-Host "  - Analyze codebase using PRD.md" -ForegroundColor Gray
Write-Host "  - Generate test plans" -ForegroundColor Gray
Write-Host "  - Execute tests" -ForegroundColor Gray
Write-Host "  - Generate reports" -ForegroundColor Gray
Write-Host ""
Write-Host "Configuration files ready:" -ForegroundColor Yellow
Write-Host "  - testsprite.config.json" -ForegroundColor Gray
Write-Host "  - PRD.md" -ForegroundColor Gray
Write-Host "  - testsprite-test-execution.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Test execution summary:" -ForegroundColor Yellow
Write-Host "  - Routes: 6 major routes configured" -ForegroundColor Gray
Write-Host "  - Components: 40+ components to test" -ForegroundColor Gray
Write-Host "  - Scenarios: 5 test scenarios defined" -ForegroundColor Gray
Write-Host ""

