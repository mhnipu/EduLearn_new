# ============================================
# Script to Combine All Migrations and Apply
# ============================================

$projectPath = "e:\Work\Personal Projects\EduLearn\EduLearn_new"
$migrationsPath = "$projectPath\supabase\migrations"
$outputFile = "$projectPath\ALL_MIGRATIONS_COMBINED.sql"

Write-Host "🔧 Combining all migration files..." -ForegroundColor Cyan

# Get all migration files in chronological order
$migrations = Get-ChildItem "$migrationsPath\*.sql" | Sort-Object Name

Write-Host "📋 Found $($migrations.Count) migration files" -ForegroundColor Yellow

# Create combined SQL file header
$combinedSQL = "-- ============================================" + [Environment]::NewLine
$combinedSQL += "-- ALL MIGRATIONS COMBINED - RUN IN SEQUENCE" + [Environment]::NewLine
$combinedSQL += "-- Project: alazrdburoobipmofypc" + [Environment]::NewLine
$combinedSQL += "-- URL: https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new" + [Environment]::NewLine
$combinedSQL += "-- ============================================" + [Environment]::NewLine
$combinedSQL += "-- This file contains ALL $($migrations.Count) migrations in chronological order" + [Environment]::NewLine
$combinedSQL += "-- Run this entire file in Supabase SQL Editor to apply all migrations at once" + [Environment]::NewLine
$combinedSQL += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" + [Environment]::NewLine
$combinedSQL += "-- ============================================" + [Environment]::NewLine + [Environment]::NewLine

$combinedSQL += "DO `$`$" + [Environment]::NewLine
$combinedSQL += "BEGIN" + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '🚀 Starting migration process - All $($migrations.Count) migrations will be applied in sequence...';" + [Environment]::NewLine
$combinedSQL += "END `$`$;" + [Environment]::NewLine + [Environment]::NewLine

$counter = 1
foreach ($migration in $migrations) {
    $migrationName = $migration.Name
    Write-Host "  [$counter/$($migrations.Count)] Processing: $migrationName" -ForegroundColor Gray
    
    $combinedSQL += "-- ============================================" + [Environment]::NewLine
    $combinedSQL += "-- MIGRATION $counter : $migrationName" + [Environment]::NewLine
    $combinedSQL += "-- ============================================" + [Environment]::NewLine
    $combinedSQL += "DO `$`$" + [Environment]::NewLine
    $combinedSQL += "BEGIN" + [Environment]::NewLine
    $combinedSQL += "  RAISE NOTICE '📝 Applying migration $counter/$($migrations.Count): $migrationName...';" + [Environment]::NewLine
    $combinedSQL += "END `$`$;" + [Environment]::NewLine + [Environment]::NewLine
    
    # Read migration file content
    $content = Get-Content $migration.FullName -Raw -Encoding UTF8
    
    # Add migration content
    $combinedSQL += $content + [Environment]::NewLine + [Environment]::NewLine
    
    $combinedSQL += "DO `$`$" + [Environment]::NewLine
    $combinedSQL += "BEGIN" + [Environment]::NewLine
    $combinedSQL += "  RAISE NOTICE '✅ Migration $counter/$($migrations.Count) completed: $migrationName';" + [Environment]::NewLine
    $combinedSQL += "END `$`$;" + [Environment]::NewLine + [Environment]::NewLine + [Environment]::NewLine
    
    $counter++
}

# Add final verification
$combinedSQL += "-- ============================================" + [Environment]::NewLine
$combinedSQL += "-- FINAL VERIFICATION" + [Environment]::NewLine
$combinedSQL += "-- ============================================" + [Environment]::NewLine
$combinedSQL += "DO `$`$" + [Environment]::NewLine
$combinedSQL += "DECLARE" + [Environment]::NewLine
$combinedSQL += "  phone_col_exists boolean;" + [Environment]::NewLine
$combinedSQL += "  view_exists boolean;" + [Environment]::NewLine
$combinedSQL += "  total_tables int;" + [Environment]::NewLine
$combinedSQL += "BEGIN" + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '🔍 Running final verification checks...';" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  -- Check if phone column exists" + [Environment]::NewLine
$combinedSQL += "  SELECT EXISTS (" + [Environment]::NewLine
$combinedSQL += "    SELECT 1 FROM information_schema.columns " + [Environment]::NewLine
$combinedSQL += "    WHERE table_name = 'profiles' " + [Environment]::NewLine
$combinedSQL += "    AND column_name = 'phone'" + [Environment]::NewLine
$combinedSQL += "    AND table_schema = 'public'" + [Environment]::NewLine
$combinedSQL += "  ) INTO phone_col_exists;" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  IF phone_col_exists THEN" + [Environment]::NewLine
$combinedSQL += "    RAISE NOTICE '✅ Phone column exists in profiles table';" + [Environment]::NewLine
$combinedSQL += "  ELSE" + [Environment]::NewLine
$combinedSQL += "    RAISE WARNING '❌ Phone column NOT found in profiles table!';" + [Environment]::NewLine
$combinedSQL += "  END IF;" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  -- Check if view exists" + [Environment]::NewLine
$combinedSQL += "  SELECT EXISTS (" + [Environment]::NewLine
$combinedSQL += "    SELECT 1 FROM pg_views " + [Environment]::NewLine
$combinedSQL += "    WHERE viewname = 'student_overview' " + [Environment]::NewLine
$combinedSQL += "    AND schemaname = 'public'" + [Environment]::NewLine
$combinedSQL += "  ) INTO view_exists;" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  IF view_exists THEN" + [Environment]::NewLine
$combinedSQL += "    RAISE NOTICE '✅ student_overview view exists';" + [Environment]::NewLine
$combinedSQL += "  ELSE" + [Environment]::NewLine
$combinedSQL += "    RAISE NOTICE 'ℹ️  student_overview view does not exist (this is OK if you dont need it)';" + [Environment]::NewLine
$combinedSQL += "  END IF;" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  -- Count total tables" + [Environment]::NewLine
$combinedSQL += "  SELECT COUNT(*) INTO total_tables" + [Environment]::NewLine
$combinedSQL += "  FROM information_schema.tables " + [Environment]::NewLine
$combinedSQL += "  WHERE table_schema = 'public' " + [Environment]::NewLine
$combinedSQL += "  AND table_type = 'BASE TABLE';" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '📊 Total tables in public schema: %', total_tables;" + [Environment]::NewLine
$combinedSQL += "  " + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '';" + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '============================================';" + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '🎉 All $($migrations.Count) migrations applied successfully!';" + [Environment]::NewLine
$combinedSQL += "  RAISE NOTICE '============================================';" + [Environment]::NewLine
$combinedSQL += "END `$`$;" + [Environment]::NewLine

# Write to file
[System.IO.File]::WriteAllText($outputFile, $combinedSQL, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "✅ Combined SQL file created: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open: https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new" -ForegroundColor Yellow
Write-Host "2. Open file: ALL_MIGRATIONS_COMBINED.sql" -ForegroundColor Yellow
Write-Host "3. Copy ALL content (Ctrl+A, Ctrl+C)" -ForegroundColor Yellow
Write-Host "4. Paste in SQL Editor and click RUN" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 All migrations will be applied in sequence automatically!" -ForegroundColor Green
