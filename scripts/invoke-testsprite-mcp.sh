#!/bin/bash
# Testsprite MCP Invocation Script
# This script helps invoke Testsprite MCP for automated testing

echo "=========================================="
echo "Testsprite MCP Test Execution"
echo "=========================================="
echo ""

# Check if server is running
echo "1. Checking development server..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "   ✅ Server is running on port 8080"
else
    echo "   ❌ Server is not running!"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

echo ""
echo "2. Validating configuration files..."
if [ -f "testsprite.config.json" ]; then
    echo "   ✅ testsprite.config.json found"
else
    echo "   ❌ testsprite.config.json not found"
    exit 1
fi

if [ -f "PRD.md" ]; then
    echo "   ✅ PRD.md found"
else
    echo "   ❌ PRD.md not found"
    exit 1
fi

echo ""
echo "3. Project Information:"
echo "   - Project: EDulearn - SmartLearn MVP"
echo "   - Framework: React + TypeScript"
echo "   - Base URL: http://localhost:8080"
echo "   - Test Tool: Testsprite MCP"

echo ""
echo "=========================================="
echo "Ready for Testsprite MCP Execution"
echo "=========================================="
echo ""
echo "To execute tests with Testsprite MCP in Cursor:"
echo ""
echo "  Option 1: Use Cursor Chat"
echo "  Prompt: 'Run Testsprite tests on http://localhost:8080'"
echo ""
echo "  Option 2: Direct MCP Invocation"
echo "  If Testsprite MCP is configured, it will automatically:"
echo "  - Analyze codebase using PRD.md"
echo "  - Generate test plans"
echo "  - Execute tests"
echo "  - Generate reports"
echo ""
echo "Configuration files ready:"
echo "  - testsprite.config.json"
echo "  - PRD.md"
echo "  - testsprite-test-execution.md"
echo ""
echo "Test execution summary:"
echo "  - Routes: 6 major routes configured"
echo "  - Components: 40+ components to test"
echo "  - Scenarios: 5 test scenarios defined"
echo ""

