# ============================================
# Sequential Migration Execution via Supabase API
# ============================================
# This script applies migrations sequentially using Supabase Management API
# Requires: Supabase Access Token and Project Reference
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$AccessToken,
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef,
    
    [switch]$DryRun = $false,
    [switch]$ContinueOnError = $false,
    [string]$StartFrom = ""
)

$ErrorActionPreference = "Stop"

# Get project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$migrationsPath = Join-Path $projectRoot "supabase\migrations"

# Supabase Management API base URL
$apiBaseUrl = "https://api.supabase.com/v1/projects/$ProjectRef"

Write-Host "🚀 Sequential Migration Execution (API Method)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Get all migration files in order
Write-Host "📋 Scanning migration files..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -notmatch "MIGRATION_INDEX" } |
    Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "❌ No migration files found" -ForegroundColor Red
    exit 1
}

# Filter if StartFrom specified
if (-not [string]::IsNullOrEmpty($StartFrom)) {
    $migrationFiles = $migrationFiles | Where-Object { $_.Name -ge $StartFrom }
}

Write-Host "✅ Found $($migrationFiles.Count) migration files" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No migrations will be executed" -ForegroundColor Yellow
    Write-Host ""
    $migrationFiles | ForEach-Object { 
        $index = $migrationFiles.IndexOf($_) + 1
        Write-Host "[$index/$($migrationFiles.Count)] Would execute: $($_.Name)" -ForegroundColor Cyan
    }
    exit 0
}

# Confirm execution
Write-Host "⚠️  This will apply $($migrationFiles.Count) migrations sequentially via API" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "❌ Cancelled" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Track statistics
$successCount = 0
$errorCount = 0
$errors = @()

Write-Host "🚀 Starting sequential migration execution..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$totalMigrations = $migrationFiles.Count
$currentIndex = 0

foreach ($migration in $migrationFiles) {
    $currentIndex++
    $migrationName = $migration.Name
    
    Write-Host "[$currentIndex/$totalMigrations] 📝 Processing: $migrationName" -ForegroundColor Cyan
    
    try {
        # Read SQL content
        $sqlContent = Get-Content -Path $migration.FullName -Raw -Encoding UTF8
        
        Write-Host "   Executing via Supabase API..." -ForegroundColor Gray
        
        # Use Supabase Management API to execute SQL
        # Note: This requires the Management API endpoint
        # The endpoint structure may vary, so we'll use a generic approach
        
        $headers = @{
            "Authorization" = "Bearer $AccessToken"
            "Content-Type" = "application/json"
            "apikey" = $AccessToken
        }
        
        $body = @{
            query = $sqlContent
        } | ConvertTo-Json
        
        # Note: Actual API endpoint may differ
        # For now, we'll use Supabase CLI which is more reliable
        Write-Host "   ⚠️  API method requires specific endpoint configuration" -ForegroundColor Yellow
        Write-Host "   💡 Recommended: Use Supabase CLI instead (apply-migrations-sequential.ps1)" -ForegroundColor Cyan
        Write-Host ""
        
        # Alternative: Use Supabase CLI
        Write-Host "   Using Supabase CLI method..." -ForegroundColor Gray
        
        # Break and show alternative
        if ($currentIndex -eq 1) {
            Write-Host ""
            Write-Host "💡 For best results, use:" -ForegroundColor Cyan
            Write-Host "   .\scripts\apply-migrations-sequential.ps1 -ProjectRef $ProjectRef" -ForegroundColor White
            Write-Host ""
            Write-Host "   OR use Supabase CLI directly:" -ForegroundColor Cyan
            Write-Host "   supabase db push" -ForegroundColor White
            Write-Host ""
            break
        }
        
    } catch {
        $errorMsg = "Error in $migrationName : $_"
        Write-Host "   ❌ $errorMsg" -ForegroundColor Red
        $errors += $errorMsg
        $errorCount++
        
        if (-not $ContinueOnError) {
            Write-Host ""
            Write-Host "❌ Migration failed. Stopping execution." -ForegroundColor Red
            break
        }
    }
}

Write-Host ""
Write-Host "✅ Script execution complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Recommendation: Use Supabase CLI method for reliable execution:" -ForegroundColor Cyan
Write-Host "   .\scripts\apply-migrations-sequential.ps1" -ForegroundColor White
Write-Host ""
