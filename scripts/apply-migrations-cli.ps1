# ============================================
# Sequential Migration Execution using Supabase CLI
# ============================================
# This script uses Supabase CLI to apply all migrations sequentially
# Supabase CLI automatically handles sequential execution
# ============================================

param(
    [string]$ProjectRef = "",
    [switch]$SkipConfirm = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Get project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$migrationsPath = Join-Path $projectRoot "supabase\migrations"

Write-Host "🚀 Sequential Migration Execution via Supabase CLI" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "📋 Checking Supabase CLI installation..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI not found"
    }
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation options:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    Write-Host "  OR" -ForegroundColor Cyan
    Write-Host "  brew install supabase/tap/supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "See: docs/setup/INSTALL_SUPABASE_CLI.md" -ForegroundColor Yellow
    exit 1
}

# Check project link
Write-Host ""
Write-Host "📋 Checking project link status..." -ForegroundColor Yellow
try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -ne 0 -or $status -match "not linked") {
        throw "Not linked"
    }
    Write-Host "✅ Project already linked" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Project not linked to Supabase" -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($ProjectRef)) {
        Write-Host ""
        Write-Host "Please provide your Supabase project reference ID:" -ForegroundColor Yellow
        Write-Host "  Usage: .\scripts\apply-migrations-cli.ps1 -ProjectRef YOUR_PROJECT_REF" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To get your project reference ID:" -ForegroundColor Yellow
        Write-Host "  1. Go to Supabase Dashboard → Settings → General" -ForegroundColor Cyan
        Write-Host "  2. Copy the 'Reference ID'" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }
    
    Write-Host "🔗 Linking to Supabase project: $ProjectRef" -ForegroundColor Cyan
    try {
        supabase link --project-ref $ProjectRef
        if ($LASTEXITCODE -ne 0) {
            throw "Link failed"
        }
        Write-Host "✅ Project linked successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to link project" -ForegroundColor Red
        Write-Host "Make sure you have the correct project reference ID" -ForegroundColor Yellow
        exit 1
    }
}

# Count migration files
Write-Host ""
Write-Host "📋 Scanning migration files..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -notmatch "MIGRATION_INDEX" } |
    Sort-Object Name

$totalMigrations = $migrationFiles.Count
if ($totalMigrations -eq 0) {
    Write-Host "❌ No migration files found in: $migrationsPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found $totalMigrations migration files" -ForegroundColor Green
Write-Host ""

# Show migration list
if ($Verbose) {
    Write-Host "Migration files to be executed:" -ForegroundColor Cyan
    $migrationFiles | ForEach-Object { 
        $index = $migrationFiles.IndexOf($_) + 1
        Write-Host "  $index. $($_.Name)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Confirm execution
if (-not $SkipConfirm) {
    Write-Host "⚠️  This will apply $totalMigrations migrations sequentially" -ForegroundColor Yellow
    Write-Host "   Supabase CLI will execute them in order automatically" -ForegroundColor Gray
    Write-Host ""
    $confirm = Read-Host "Continue? (Y/N)"
    if ($confirm -ne "Y" -and $confirm -ne "y") {
        Write-Host "❌ Cancelled by user" -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# Change to project root
Push-Location $projectRoot

try {
    Write-Host "🚀 Executing migrations via Supabase CLI..." -ForegroundColor Cyan
    Write-Host "   (Migrations will be applied sequentially in order)" -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Execute supabase db push
    # This automatically applies all migrations in sequential order
    if ($Verbose) {
        supabase db push
    } else {
        # Capture output but show progress
        $output = supabase db push 2>&1
        $output | ForEach-Object {
            if ($_ -match "Applying migration|migration.*applied|Success|Error|error") {
                Write-Host $_ -ForegroundColor $(if ($_ -match "Success|applied") { "Green" } elseif ($_ -match "Error|error") { "Red" } else { "Cyan" })
            } else {
                Write-Host $_ -ForegroundColor Gray
            }
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "✅ All migrations applied successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   Total migrations: $totalMigrations" -ForegroundColor White
        Write-Host "   ✅ All executed successfully" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "💡 Verify in Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host "   - Table Editor: Check for 37+ tables" -ForegroundColor Gray
        Write-Host "   - Database → Functions: Check for 30+ functions" -ForegroundColor Gray
        Write-Host "   - Authentication → Policies: Check for RLS policies" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Migration execution failed" -ForegroundColor Red
        Write-Host "   Check the error messages above" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Troubleshooting:" -ForegroundColor Cyan
        Write-Host "   - Verify project is linked correctly" -ForegroundColor Gray
        Write-Host "   - Check Supabase project is active" -ForegroundColor Gray
        Write-Host "   - Review error messages for specific issues" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
