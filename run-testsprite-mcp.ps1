# Wrapper script to ensure Node v22 is used for Testsprite MCP
# Set PATH to prioritize Node v22
$env:PATH = "C:\nvm4w\nodejs;$env:PATH"

# Verify Node version (should be v22.11.0)
$nodeVersion = & "C:\nvm4w\nodejs\node.exe" --version
if (-not $nodeVersion -match "v22") {
    Write-Error "Expected Node v22, but found $nodeVersion"
    exit 1
}

# Run Testsprite MCP with Node v22
& "C:\nvm4w\nodejs\npx.cmd" -y @testsprite/testsprite-mcp@latest $args

