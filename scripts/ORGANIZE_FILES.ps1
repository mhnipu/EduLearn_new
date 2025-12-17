# ============================================
# Organize All Files - Clean Codebase
# ============================================

$projectPath = "e:\Work\Personal Projects\EduLearn\EduLearn_new"
Set-Location $projectPath

Write-Host "🧹 Organizing codebase..." -ForegroundColor Cyan

# ============================================
# Step 1: Rename Migration Files with Sequence
# ============================================
Write-Host "`n📋 Step 1: Renaming migration files with sequence numbers..." -ForegroundColor Yellow

$migrationsPath = "$projectPath\supabase\migrations"
$migrations = Get-ChildItem "$migrationsPath\*.sql" | Sort-Object Name

# Create mapping of old names to new names with descriptions
$migrationMap = @{
    "20251201043306_7f2762a4-83a5-430f-b11b-8fe38374aaf4.sql" = "001_initial_schema.sql"
    "20251201045320_82084b2b-9190-4851-be7e-3cd929608763.sql" = "002_schema_updates.sql"
    "20251201045345_88ff8d90-fd4d-4567-8df5-630dfda8a93b.sql" = "003_additional_tables.sql"
    "20251202051805_37b3ceea-505e-4093-800f-10d15614049e.sql" = "004_schema_changes.sql"
    "20251202151719_407949a7-ffd9-4cfc-ac7c-f1771959e142.sql" = "005_updates.sql"
    "20251202153512_cd8f7d59-5b7e-4492-99e2-88e6302860fa.sql" = "006_schema_updates.sql"
    "20251202165719_f463c1f5-c769-442f-82f5-894da9415d0d.sql" = "007_updates.sql"
    "20251202171614_3d5abe74-7784-4306-9043-6e72ba420a8f.sql" = "008_updates.sql"
    "20251202173109_97e5c8b4-07ca-4053-91cb-1e092ef79c55.sql" = "009_updates.sql"
    "20251202174404_7ad4d883-e31f-4bf0-86b2-3fa78634d07c.sql" = "010_updates.sql"
    "20251202191706_34eb9875-76d5-4730-8273-2a66bcc4510b.sql" = "011_updates.sql"
    "20251203040604_7b09963f-50e8-4072-a256-07411efec7b8.sql" = "012_updates.sql"
    "20251203044913_40bddb5e-cbd3-49fe-a8d1-fbee1660ffb3.sql" = "013_updates.sql"
    "20251203084231_create_custom_roles_table.sql" = "014_create_custom_roles_table.sql"
    "20251212_admin_enroll_function.sql" = "015_admin_enroll_function.sql"
    "20251212_fix_enrollment_rls.sql" = "016_fix_enrollment_rls.sql"
    "20251212_teacher_course_assignments.sql" = "017_teacher_course_assignments.sql"
    "20251212191752_fix_security_definer_view.sql" = "018_fix_security_definer_view.sql"
    "20251212194644_add_phone_authentication.sql" = "019_add_phone_authentication.sql"
    "FINAL_FIX_ENROLLMENT.sql" = "020_final_fix_enrollment.sql"
}

$counter = 1
foreach ($migration in $migrations) {
    $oldName = $migration.Name
    if ($migrationMap.ContainsKey($oldName)) {
        $newName = $migrationMap[$oldName]
        $newPath = Join-Path $migrationsPath $newName
        
        if (-not (Test-Path $newPath)) {
            Rename-Item -Path $migration.FullName -NewName $newName
            Write-Host "  ✅ [$counter/20] Renamed: $oldName -> $newName" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  [$counter/20] Skipped: $newName already exists" -ForegroundColor Yellow
        }
    } else {
        # Auto-generate name if not in map
        $newName = "{0:D3}_{1}" -f $counter, ($oldName -replace '^\d+_', '')
        $newPath = Join-Path $migrationsPath $newName
        if (-not (Test-Path $newPath)) {
            Rename-Item -Path $migration.FullName -NewName $newName
            Write-Host "  ✅ [$counter/20] Renamed: $oldName -> $newName" -ForegroundColor Green
        }
    }
    $counter++
}

# ============================================
# Step 2: Create Organized Folder Structure
# ============================================
Write-Host "`n📁 Step 2: Creating organized folder structure..." -ForegroundColor Yellow

$folders = @(
    "docs\migrations",
    "docs\setup",
    "docs\troubleshooting",
    "docs\guides",
    "supabase\scripts\quick-fixes"
)

foreach ($folder in $folders) {
    $fullPath = Join-Path $projectPath $folder
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  ✅ Created: $folder" -ForegroundColor Gray
    }
}

# ============================================
# Step 3: Move MD Files to Organized Locations
# ============================================
Write-Host "`n📄 Step 3: Organizing MD files..." -ForegroundColor Yellow

$mdFiles = @{
    # Migration guides
    "APPLY_ALL_MIGRATIONS.md" = "docs\migrations\APPLY_ALL_MIGRATIONS.md"
    "RUN_IN_SUPABASE_DASHBOARD.md" = "docs\migrations\RUN_IN_SUPABASE_DASHBOARD.md"
    "APPLY_SECURITY_FIX.md" = "docs\migrations\APPLY_SECURITY_FIX.md"
    "SECURITY_FIX_FINAL.md" = "docs\migrations\SECURITY_FIX_FINAL.md"
    "QUICK_FIX_SECURITY.md" = "docs\migrations\QUICK_FIX_SECURITY.md"
    
    # Setup guides
    "EXTERNAL_SUPABASE_SETUP.md" = "docs\setup\EXTERNAL_SUPABASE_SETUP.md"
    "GET_SUPABASE_KEYS.md" = "docs\setup\GET_SUPABASE_KEYS.md"
    "INSTALL_SUPABASE_CLI.md" = "docs\setup\INSTALL_SUPABASE_CLI.md"
    "QUICK_CLI_INSTALL.md" = "docs\setup\QUICK_CLI_INSTALL.md"
    "verify-supabase-connection.md" = "docs\setup\VERIFY_SUPABASE_CONNECTION.md"
    
    # Troubleshooting
    "TROUBLESHOOT_EMAIL_ERROR.md" = "docs\troubleshooting\TROUBLESHOOT_EMAIL_ERROR.md"
    
    # Auth guides
    "AUTH_ENHANCEMENT_SUMMARY.md" = "docs\guides\AUTH_ENHANCEMENT_SUMMARY.md"
    "EXTERNAL_SUPABASE_AUTH_GUIDE.md" = "docs\guides\EXTERNAL_SUPABASE_AUTH_GUIDE.md"
}

foreach ($file in $mdFiles.GetEnumerator()) {
    $source = Join-Path $projectPath $file.Key
    $destination = Join-Path $projectPath $file.Value
    
    if (Test-Path $source) {
        $destDir = Split-Path $destination -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if (-not (Test-Path $destination)) {
            Move-Item -Path $source -Destination $destination -Force
            Write-Host "  ✅ Moved: $($file.Key) -> $($file.Value)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Skipped: $($file.Value) already exists" -ForegroundColor Yellow
        }
    }
}

# ============================================
# Step 4: Move SQL Files to Organized Locations
# ============================================
Write-Host "`n💾 Step 4: Organizing SQL files..." -ForegroundColor Yellow

$sqlFiles = @{
    "COPY_PASTE_TO_SUPABASE.sql" = "supabase\scripts\quick-fixes\COPY_PASTE_TO_SUPABASE.sql"
    "ALL_MIGRATIONS_COMBINED.sql" = "supabase\scripts\ALL_MIGRATIONS_COMBINED.sql"
}

foreach ($file in $sqlFiles.GetEnumerator()) {
    $source = Join-Path $projectPath $file.Key
    $destination = Join-Path $projectPath $file.Value
    
    if (Test-Path $source) {
        $destDir = Split-Path $destination -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if (-not (Test-Path $destination)) {
            Move-Item -Path $source -Destination $destination -Force
            Write-Host "  ✅ Moved: $($file.Key) -> $($file.Value)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Skipped: $($file.Value) already exists" -ForegroundColor Yellow
        }
    }
}

# ============================================
# Step 5: Create Migration Index File
# ============================================
Write-Host "`n📝 Step 5: Creating migration index..." -ForegroundColor Yellow

$migrationIndex = @'
# Migration Files - Execution Order

## Migration Sequence

Run these migrations in numerical order (001, 002, 003...) in Supabase SQL Editor:

1. 001_initial_schema.sql - Initial database schema (profiles, courses, etc.)
2. 002_schema_updates.sql - Schema updates
3. 003_additional_tables.sql - Additional tables
4. 004_schema_changes.sql - Schema changes
5. 005_updates.sql - Updates
6. 006_schema_updates.sql - Schema updates
7. 007_updates.sql - Updates
8. 008_updates.sql - Updates
9. 009_updates.sql - Updates
10. 010_updates.sql - Updates
11. 011_updates.sql - Updates
12. 012_updates.sql - Updates
13. 013_updates.sql - Updates
14. 014_create_custom_roles_table.sql - Custom roles table
15. 015_admin_enroll_function.sql - Admin enrollment function
16. 016_fix_enrollment_rls.sql - Fix enrollment RLS
17. 017_teacher_course_assignments.sql - Teacher course assignments
18. 018_fix_security_definer_view.sql - CRITICAL: Security fix
19. 019_add_phone_authentication.sql - CRITICAL: Phone authentication
20. 020_final_fix_enrollment.sql - Final enrollment fixes

## Quick Apply

### Option 1: All at Once (Recommended)
Use the combined file:
supabase/scripts/ALL_MIGRATIONS_COMBINED.sql

### Option 2: One by One
Run each file in sequence (001, 002, 003...) in Supabase SQL Editor.

## Location
All migration files are in: supabase/migrations/

## Important Notes
- Run migrations in numerical order (001 -> 002 -> 003...)
- Most migrations use IF NOT EXISTS so safe to rerun
- Critical migrations: 018 (security) and 019 (phone auth)
'@

$indexPath = Join-Path $migrationsPath "MIGRATION_INDEX.md"
$migrationIndex | Out-File -FilePath $indexPath -Encoding UTF8
Write-Host "  ✅ Created: supabase/migrations/MIGRATION_INDEX.md" -ForegroundColor Green

# ============================================
# Step 6: Create Root README Update
# ============================================
Write-Host "`n📖 Step 6: Updating documentation structure..." -ForegroundColor Yellow

$docsStructure = @'
# Documentation Structure

## Organized Folders

### Migrations
- docs/migrations/ - Migration guides and instructions
- supabase/migrations/ - SQL migration files (numbered 001-020)

### Setup
- docs/setup/ - Setup guides and configuration

### Troubleshooting
- docs/troubleshooting/ - Troubleshooting guides

### Guides
- docs/guides/ - Feature guides and documentation

### SQL Scripts
- supabase/scripts/ - Utility SQL scripts
- supabase/scripts/quick-fixes/ - Quick fix SQL files

## Quick Links

### Migrations
- Migration Index: supabase/migrations/MIGRATION_INDEX.md
- Apply All Migrations: docs/migrations/RUN_IN_SUPABASE_DASHBOARD.md

### Setup
- External Supabase Setup: docs/setup/EXTERNAL_SUPABASE_SETUP.md
- Get Supabase Keys: docs/setup/GET_SUPABASE_KEYS.md

### Troubleshooting
- Email Error Fix: docs/troubleshooting/TROUBLESHOOT_EMAIL_ERROR.md
'@

$docsReadmePath = Join-Path $projectPath "docs\README.md"
if (-not (Test-Path $docsReadmePath)) {
    $docsStructure | Out-File -FilePath $docsReadmePath -Encoding UTF8
    Write-Host "  ✅ Created: docs/README.md" -ForegroundColor Green
}

Write-Host "`n" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ Codebase organization completed!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Migration files renamed with sequence numbers (001-020)" -ForegroundColor White
Write-Host "  MD files organized into docs/ folders" -ForegroundColor White
Write-Host "  SQL files organized into supabase/scripts/" -ForegroundColor White
Write-Host "  Migration index created" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check: supabase/migrations/MIGRATION_INDEX.md" -ForegroundColor White
Write-Host "  2. Run migrations in order: 001, 002, 003..." -ForegroundColor White
Write-Host "  3. Or use combined file in supabase/scripts/" -ForegroundColor White
