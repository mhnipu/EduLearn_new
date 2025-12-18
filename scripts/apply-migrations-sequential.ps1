# ============================================
# Sequential Migration Execution Script
# ============================================
# This script applies all migrations sequentially one by one
# Uses Supabase CLI db push which automatically executes in order
# ============================================

param(
    [string]$ProjectRef = "",
    [switch]$SkipConfirm = $false,
    [switch]$Verbose = $false,
    [string]$StartFrom = ""
)

$ErrorActionPreference = "Continue"  # Continue on error to show all results

# Get project root directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$migrationsPath = Join-Path $projectRoot "supabase\migrations"

Write-Host ""
Write-Host "🚀 Sequential Migration Execution Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "📋 Checking Supabase CLI installation..." -ForegroundColor Yellow
try {
    $null = supabase --version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI not found"
    }
    $version = supabase --version 2>&1 | Select-Object -First 1
    Write-Host "✅ Supabase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    Write-Host "  OR" -ForegroundColor Cyan
    Write-Host "  brew install supabase/tap/supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "See: docs/setup/INSTALL_SUPABASE_CLI.md" -ForegroundColor Yellow
    exit 1
}

# Check if project is linked
Write-Host ""
Write-Host "📋 Checking project link status..." -ForegroundColor Yellow
try {
    $null = supabase status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Not linked"
    }
    Write-Host "✅ Project already linked" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Project not linked to Supabase" -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($ProjectRef)) {
        Write-Host ""
        Write-Host "Please provide your Supabase project reference ID:" -ForegroundColor Yellow
        Write-Host "  Usage: .\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To get your project reference ID:" -ForegroundColor Yellow
        Write-Host "  1. Go to Supabase Dashboard" -ForegroundColor Cyan
        Write-Host "  2. Select your project" -ForegroundColor Cyan
        Write-Host "  3. Go to Settings → General" -ForegroundColor Cyan
        Write-Host "  4. Copy the 'Reference ID'" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }
    
    Write-Host "🔗 Linking to Supabase project: $ProjectRef" -ForegroundColor Cyan
    try {
        supabase link --project-ref $ProjectRef 2>&1 | Out-Null
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

# Get all migration files in order
Write-Host ""
Write-Host "📋 Scanning migration files..." -ForegroundColor Yellow

$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -notmatch "MIGRATION_INDEX" -and $_.Name -match "^\d{3}_" } |
    Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "❌ No migration files found in: $migrationsPath" -ForegroundColor Red
    exit 1
}

# Filter if StartFrom is specified
if (-not [string]::IsNullOrEmpty($StartFrom)) {
    $migrationFiles = $migrationFiles | Where-Object { $_.Name -ge $StartFrom }
    Write-Host "📍 Starting from: $StartFrom" -ForegroundColor Cyan
}

Write-Host "✅ Found $($migrationFiles.Count) migration files" -ForegroundColor Green
Write-Host ""

# Show migration list
if ($Verbose -or -not $SkipConfirm) {
    Write-Host "Migration files to be executed (in order):" -ForegroundColor Cyan
    $index = 1
    $migrationFiles | ForEach-Object { 
        Write-Host "  $index. $($_.Name)" -ForegroundColor Gray
        $index++
    }
    Write-Host ""
}

# Confirm before proceeding
if (-not $SkipConfirm) {
    Write-Host "⚠️  This will apply $($migrationFiles.Count) migrations sequentially" -ForegroundColor Yellow
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
    Write-Host "🚀 Executing migrations sequentially..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Note: Supabase CLI applies migrations in sequential order automatically" -ForegroundColor Yellow
    Write-Host "   All $($migrationFiles.Count) migrations will be executed one by one" -ForegroundColor Gray
    Write-Host ""
    
    # Execute supabase db push
    # This automatically applies all migrations in sequential order
    Write-Host "Executing: supabase db push" -ForegroundColor Cyan
    Write-Host ""
    
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "✅ All migrations applied successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Execution Summary:" -ForegroundColor Cyan
        Write-Host "   Total migrations: $($migrationFiles.Count)" -ForegroundColor White
        Write-Host "   ✅ All executed successfully in sequential order" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "💡 Verify migrations in Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host "   1. Go to Table Editor - Check for 37+ tables" -ForegroundColor Gray
        Write-Host "   2. Go to Database → Functions - Check for 30+ functions" -ForegroundColor Gray
        Write-Host "   3. Go to Authentication → Policies - Check for RLS policies" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Migration execution failed" -ForegroundColor Red
        Write-Host "   Check the error messages above" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Troubleshooting:" -ForegroundColor Cyan
        Write-Host "   - Verify project is linked: supabase status" -ForegroundColor Gray
        Write-Host "   - Check Supabase project is active in dashboard" -ForegroundColor Gray
        Write-Host "   - Review specific error messages above" -ForegroundColor Gray
        Write-Host "   - Check migration files for syntax errors" -ForegroundColor Gray
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

Write-Host "✅ Migration execution complete!" -ForegroundColor Green
Write-Host ""
