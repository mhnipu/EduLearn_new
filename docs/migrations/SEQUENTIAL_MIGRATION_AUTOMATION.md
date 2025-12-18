# 🚀 Sequential Migration Automation Guide

This guide explains how to use the automated scripts to apply migrations sequentially one by one in Supabase.

---

## 📋 Overview

The automation scripts execute all database migrations in sequential order automatically, providing:
- ✅ Sequential execution (one by one)
- ✅ Progress tracking
- ✅ Error handling
- ✅ Summary reports
- ✅ Multiple platform support (Windows, Linux, Mac)

---

## 🎯 Quick Start

### Option 1: PowerShell Script (Windows) - Recommended

```powershell
# Basic usage
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF

# With options
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -SkipConfirm -Verbose
```

### Option 2: Bash Script (Linux/Mac)

```bash
# Make executable (first time)
chmod +x scripts/apply-migrations-sequential.sh

# Execute
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF
```

### Option 3: Node.js Script (Cross-platform)

```bash
# Using npm
npm run migrate -- --project-ref YOUR_PROJECT_REF

# Direct execution
node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF
```

---

## 📝 Detailed Usage

### PowerShell Script

**Location**: `scripts/apply-migrations-sequential.ps1`

**Parameters**:
- `-ProjectRef <string>`: Your Supabase project reference ID (required if not linked)
- `-SkipConfirm`: Skip confirmation prompt
- `-Verbose`: Show detailed output
- `-StartFrom <filename>`: Start from specific migration file

**Examples**:
```powershell
# Basic execution
.\scripts\apply-migrations-sequential.ps1 -ProjectRef abc123xyz

# Skip confirmation
.\scripts\apply-migrations-sequential.ps1 -ProjectRef abc123xyz -SkipConfirm

# Start from specific migration
.\scripts\apply-migrations-sequential.ps1 -ProjectRef abc123xyz -StartFrom "020_final_fix_enrollment.sql"

# Verbose mode
.\scripts\apply-migrations-sequential.ps1 -ProjectRef abc123xyz -Verbose
```

**What it does**:
1. Checks if Supabase CLI is installed
2. Verifies project link (links if needed)
3. Scans migration files in order
4. Executes `supabase db push` (applies all migrations sequentially)
5. Shows summary and verification steps

---

### Bash Script

**Location**: `scripts/apply-migrations-sequential.sh`

**Parameters**:
- `--project-ref <id>`: Your Supabase project reference ID (required if not linked)
- `--skip-confirm`: Skip confirmation prompt
- `--verbose`: Show detailed output
- `--start-from <filename>`: Start from specific migration file

**Examples**:
```bash
# Make executable (first time)
chmod +x scripts/apply-migrations-sequential.sh

# Basic execution
./scripts/apply-migrations-sequential.sh --project-ref abc123xyz

# Skip confirmation
./scripts/apply-migrations-sequential.sh --project-ref abc123xyz --skip-confirm

# Start from specific migration
./scripts/apply-migrations-sequential.sh --project-ref abc123xyz --start-from "020_final_fix_enrollment.sql"
```

---

### Node.js Script

**Location**: `scripts/apply-migrations-sequential.js`

**Parameters**:
- `--project-ref <id>`: Your Supabase project reference ID
- `--skip-confirm`: Skip confirmation prompt
- `--continue-on-error`: Continue even if a migration fails
- `--dry-run`: Show what would be executed without running
- `--start-from <filename>`: Start from specific migration file

**Examples**:
```bash
# Using npm script
npm run migrate -- --project-ref abc123xyz

# Direct execution
node scripts/apply-migrations-sequential.js --project-ref abc123xyz

# Dry run (test without executing)
node scripts/apply-migrations-sequential.js --project-ref abc123xyz --dry-run

# Continue on error
node scripts/apply-migrations-sequential.js --project-ref abc123xyz --continue-on-error
```

---

## 🔧 Prerequisites

### 1. Supabase CLI Installation

**Windows (PowerShell)**:
```powershell
npm install -g supabase
```

**Linux/Mac**:
```bash
npm install -g supabase
# OR
brew install supabase/tap/supabase
```

**Verify Installation**:
```bash
supabase --version
```

📚 **Full Guide**: [`docs/setup/INSTALL_SUPABASE_CLI.md`](../setup/INSTALL_SUPABASE_CLI.md)

### 2. Get Your Project Reference ID

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **General**
4. Copy the **Reference ID** (e.g., `abc123xyz`)

---

## 🔄 How It Works

### Sequential Execution Process

```
1. Check Supabase CLI → ✅ Installed
2. Check Project Link → ✅ Linked (or link now)
3. Scan Migration Files → Found 50 files
4. Sort by Name → 001, 002, 003... 050
5. Execute via CLI → supabase db push
   ├─ Migration 001 ✅
   ├─ Migration 002 ✅
   ├─ Migration 003 ✅
   └─ ... (all migrations executed sequentially)
6. Show Summary → ✅ All successful
```

### What `supabase db push` Does

The `supabase db push` command:
- ✅ Reads all migration files from `supabase/migrations/`
- ✅ Sorts them by filename (alphabetical/numerical order)
- ✅ Executes each migration sequentially
- ✅ Tracks which migrations have been applied
- ✅ Skips already-applied migrations
- ✅ Shows progress for each migration

---

## 📊 Output Example

```
🚀 Sequential Migration Execution Script
========================================

📋 Checking Supabase CLI installation...
✅ Supabase CLI found: supabase/1.200.3

📋 Checking project link status...
✅ Project already linked

📋 Scanning migration files...
✅ Found 50 migration files

Migration files to be executed (in order):
  1. 001_initial_schema.sql
  2. 002_schema_updates.sql
  3. 003_additional_tables.sql
  ...

⚠️  This will apply 50 migrations sequentially
   Supabase CLI will execute them in order automatically

Continue? (Y/N): Y

🚀 Executing migrations sequentially...
==========================================

💡 Note: Supabase CLI applies migrations in sequential order automatically
   All 50 migrations will be executed one by one

Executing: supabase db push

Applying migration: 001_initial_schema.sql
✅ Migration 001 applied successfully
Applying migration: 002_schema_updates.sql
✅ Migration 002 applied successfully
...

==========================================
✅ All migrations applied successfully!
==========================================

📊 Execution Summary:
   Total migrations: 50
   ✅ All executed successfully in sequential order

💡 Verify migrations in Supabase Dashboard:
   1. Go to Table Editor - Check for 37+ tables
   2. Go to Database → Functions - Check for 30+ functions
   3. Go to Authentication → Policies - Check for RLS policies

✅ Migration execution complete!
```

---

## ✅ Verification

After executing migrations, verify in Supabase Dashboard:

### 1. Check Tables
- Go to **Table Editor**
- Should see 37+ tables including:
  - `profiles`
  - `courses`
  - `user_roles`
  - `assignments`
  - etc.

### 2. Check Functions
- Go to **Database** → **Functions**
- Should see 30+ functions including:
  - `has_role`
  - `has_module_permission`
  - `is_user_enrolled_in_course`
  - etc.

### 3. Check RLS Policies
- Go to **Authentication** → **Policies**
- Should see policies on multiple tables

### SQL Verification Queries

```sql
-- Count tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
-- Expected: ~37

-- Count functions
SELECT COUNT(*) as function_count
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;
-- Expected: ~30+

-- Count policies
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';
-- Expected: Multiple policies
```

---

## 🔍 Troubleshooting

### Error: "Supabase CLI not installed"

**Solution**:
```bash
npm install -g supabase
```

### Error: "Project not linked"

**Solution**:
- Provide project reference ID: `-ProjectRef YOUR_REF_ID`
- Or link manually: `supabase link --project-ref YOUR_REF_ID`

### Error: "Migration failed"

**Solutions**:
1. Check error message for specific issue
2. Verify previous migrations were applied
3. Check migration file for syntax errors
4. Try executing failed migration manually in SQL Editor
5. Some migrations use `IF NOT EXISTS` so safe to rerun

### Error: "Port already in use" (if using local Supabase)

**Solution**:
- Stop local Supabase: `supabase stop`
- Or use remote project: `supabase link --project-ref YOUR_REF_ID`

---

## 🎯 Alternative: Manual Execution Guide

If you prefer manual execution or need more control:

### Generate Manual Guide

```powershell
# PowerShell
.\scripts\apply-migrations-manual-guide.ps1
```

This creates `MIGRATION_EXECUTION_GUIDE.md` with step-by-step instructions for each migration.

### Manual Execution Steps

1. Go to Supabase Dashboard → SQL Editor
2. Open migration file: `supabase/migrations/001_initial_schema.sql`
3. Copy all content
4. Paste in SQL Editor
5. Click Run
6. Repeat for next migration (002, 003, ...)

---

## 💡 Best Practices

1. **Backup First**: Supabase auto-backups, but create manual backup if needed
2. **Test Locally**: Test migrations on development project first
3. **Review Migrations**: Check migration files before executing
4. **Verify After**: Always verify migrations were applied correctly
5. **One by One**: If errors occur, fix and continue from that point
6. **Use Automation**: Automated scripts reduce human error

---

## 📚 Related Documentation

- **Migration Index**: [`supabase/migrations/MIGRATION_INDEX.md`](../../supabase/migrations/MIGRATION_INDEX.md)
- **CLI Installation**: [`docs/setup/INSTALL_SUPABASE_CLI.md`](../setup/INSTALL_SUPABASE_CLI.md)
- **Database Management**: [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](../supabase/SUPABASE_DATABASE_MANAGEMENT.md)
- **Quick Setup**: [`docs/setup/QUICK_SETUP.md`](../setup/QUICK_SETUP.md)

---

## 🎉 Summary

The automation scripts provide an easy way to execute all migrations sequentially:

✅ **Automated**: No manual copying/pasting  
✅ **Sequential**: Migrations execute in order automatically  
✅ **Progress**: See which migrations are being applied  
✅ **Error Handling**: Clear error messages  
✅ **Cross-Platform**: Works on Windows, Linux, Mac  

**Recommended Method**: Use `apply-migrations-sequential.ps1` or `.sh` scripts for automated sequential execution.
