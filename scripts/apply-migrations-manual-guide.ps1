# ============================================
# Manual Sequential Migration Guide Generator
# ============================================
# This script generates a step-by-step guide for manually applying migrations
# one by one in Supabase SQL Editor
# ============================================

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$migrationsPath = Join-Path $projectRoot "supabase\migrations"
$outputFile = Join-Path $projectRoot "MIGRATION_EXECUTION_GUIDE.md"

Write-Host "📝 Generating Manual Migration Execution Guide..." -ForegroundColor Cyan
Write-Host ""

# Get all migration files in order
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { $_.Name -notmatch "MIGRATION_INDEX" -and $_.Name -match "^\d{3}_" } |
    Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "❌ No migration files found" -ForegroundColor Red
    exit 1
}

# Generate markdown guide
$guide = @"
# 📋 Manual Sequential Migration Execution Guide

This guide provides step-by-step instructions to manually apply migrations one by one in Supabase SQL Editor.

**Total Migrations:** $($migrationFiles.Count)

---

## 🚀 Quick Start

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Follow the steps below for each migration

---

## 📝 Migration Execution Steps

"@

$index = 1
foreach ($migration in $migrationFiles) {
    $migrationName = $migration.Name
    $migrationPath = $migration.FullName
    
    $guide += @"

### Step $index : $migrationName

**File:** \`$migrationName\`

**Instructions:**
1. Open the file: \`supabase/migrations/$migrationName\`
2. Copy **ALL** content from the file (Ctrl+A, Ctrl+C)
3. In Supabase SQL Editor, paste the content (Ctrl+V)
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message
6. Verify no errors in the output

**Expected Result:** ✅ Success message

**If Error Occurs:**
- Check the error message
- Verify previous migrations were applied
- Review migration file for syntax errors
- Some migrations use \`IF NOT EXISTS\` so safe to rerun

---

"@
    $index++
}

$guide += @"

## ✅ Verification

After completing all migrations, verify:

### Check Tables
\`\`\`sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
\`\`\`
**Expected:** ~37 tables

### Check Functions
\`\`\`sql
SELECT COUNT(*) as function_count
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;
\`\`\`
**Expected:** ~30+ functions

### Check RLS Policies
\`\`\`sql
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';
\`\`\`
**Expected:** Multiple policies (varies by table)

---

## 🎯 Quick Links

- **Supabase SQL Editor:** [app.supabase.com](https://app.supabase.com) → Your Project → SQL Editor
- **Migration Files:** \`supabase/migrations/\`
- **Migration Index:** \`supabase/migrations/MIGRATION_INDEX.md\`

---

## 💡 Tips

1. **Execute in Order:** Always execute migrations in numerical order (001, 002, 003...)
2. **Check Each Step:** Verify success before moving to next migration
3. **Backup First:** Supabase auto-backups, but you can create manual backup in Dashboard
4. **Error Handling:** Most migrations are idempotent (safe to rerun)
5. **Take Breaks:** If many migrations, you can pause and resume later

---

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Total Migrations:** $($migrationFiles.Count)

"@

# Write guide to file
$guide | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ Guide generated successfully!" -ForegroundColor Green
Write-Host "   Location: $outputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Yellow
Write-Host "   Total migrations: $($migrationFiles.Count)" -ForegroundColor White
Write-Host "   Guide file: MIGRATION_EXECUTION_GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open MIGRATION_EXECUTION_GUIDE.md" -ForegroundColor Gray
Write-Host "   2. Follow the step-by-step instructions" -ForegroundColor Gray
Write-Host "   3. Execute each migration in Supabase SQL Editor" -ForegroundColor Gray
Write-Host ""
