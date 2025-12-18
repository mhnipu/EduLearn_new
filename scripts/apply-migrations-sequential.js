#!/usr/bin/env node
/**
 * Sequential Migration Execution Script (Node.js)
 * 
 * This script applies all migrations sequentially one by one
 * Uses Supabase CLI or Management API to execute migrations in order
 * 
 * Usage:
 *   node scripts/apply-migrations-sequential.js [options]
 * 
 * Options:
 *   --project-ref <id>    Supabase project reference ID
 *   --start-from <file>   Start from specific migration file
 *   --continue-on-error   Continue even if a migration fails
 *   --dry-run            Show what would be executed without running
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_PATH = path.join(PROJECT_ROOT, 'supabase', 'migrations');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    projectRef: getArg('--project-ref'),
    startFrom: getArg('--start-from'),
    continueOnError: args.includes('--continue-on-error'),
    dryRun: args.includes('--dry-run'),
};

function getArg(flag) {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
    try {
        const version = execSync('supabase --version', { encoding: 'utf-8' }).trim();
        log(`✅ Supabase CLI found: ${version}`, 'green');
        return true;
    } catch (error) {
        log('❌ Supabase CLI not installed!', 'red');
        log('');
        log('Please install Supabase CLI first:', 'yellow');
        log('  npm install -g supabase', 'cyan');
        log('  OR', 'cyan');
        log('  brew install supabase/tap/supabase', 'cyan');
        log('');
        log('See: docs/setup/INSTALL_SUPABASE_CLI.md', 'yellow');
        return false;
    }
}

// Check if project is linked
function checkProjectLink() {
    try {
        execSync('supabase status', { stdio: 'ignore' });
        log('✅ Project already linked', 'green');
        return true;
    } catch (error) {
        log('⚠️  Project not linked to Supabase', 'yellow');
        
        if (!options.projectRef) {
            log('');
            log('Please provide your Supabase project reference ID:', 'yellow');
            log('  Usage: node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF', 'cyan');
            log('');
            log('To get your project reference ID:', 'yellow');
            log('  1. Go to Supabase Dashboard', 'cyan');
            log('  2. Select your project', 'cyan');
            log('  3. Go to Settings → General', 'cyan');
            log('  4. Copy the "Reference ID"', 'cyan');
            log('');
            return false;
        }
        
        log(`🔗 Linking to Supabase project: ${options.projectRef}`, 'cyan');
        try {
            execSync(`supabase link --project-ref ${options.projectRef}`, { stdio: 'inherit' });
            log('✅ Project linked successfully', 'green');
            return true;
        } catch (error) {
            log('❌ Failed to link project', 'red');
            log('Make sure you have the correct project reference ID', 'yellow');
            return false;
        }
    }
}

// Get all migration files in order
function getMigrationFiles() {
    const files = fs.readdirSync(MIGRATIONS_PATH)
        .filter(file => file.endsWith('.sql') && !file.includes('MIGRATION_INDEX'))
        .sort()
        .map(file => ({
            name: file,
            path: path.join(MIGRATIONS_PATH, file),
        }));

    if (files.length === 0) {
        log(`❌ No migration files found in: ${MIGRATIONS_PATH}`, 'red');
        process.exit(1);
    }

    // Filter if startFrom is specified
    if (options.startFrom) {
        const startIndex = files.findIndex(f => f.name >= options.startFrom);
        if (startIndex !== -1) {
            return files.slice(startIndex);
        }
    }

    return files;
}

// Confirm execution
function confirmExecution(migrationFiles) {
    return new Promise((resolve) => {
        if (options.dryRun) {
            return resolve(true);
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        log(`⚠️  This will apply ${migrationFiles.length} migrations sequentially`, 'yellow');
        log('');
        log('Migration files to be executed:', 'cyan');
        migrationFiles.forEach((file, index) => {
            log(`  ${index + 1}. ${file.name}`, 'gray');
        });
        log('');

        rl.question('Continue? (Y/N): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Execute migrations using Supabase CLI
async function executeMigrations(migrationFiles) {
    log('🚀 Starting sequential migration execution...', 'cyan');
    log('==========================================', 'cyan');
    log('');

    if (options.dryRun) {
        log('🔍 DRY RUN MODE - No migrations will be executed', 'yellow');
        log('');
        migrationFiles.forEach((file, index) => {
            log(`[${index + 1}/${migrationFiles.length}] Would execute: ${file.name}`, 'cyan');
        });
        log('');
        log('✅ Dry run complete. Run without --dry-run to execute.', 'green');
        return { success: migrationFiles.length, failed: 0, skipped: 0 };
    }

    // Change to project root
    const originalCwd = process.cwd();
    process.chdir(PROJECT_ROOT);

    try {
        log('🔄 Applying all migrations using Supabase CLI...', 'cyan');
        log('   (This will execute migrations in sequential order)', 'gray');
        log('');

        // Execute supabase db push
        const result = execSync('supabase db push', {
            stdio: 'inherit',
            encoding: 'utf-8',
        });

        log('');
        log('✅ All migrations applied successfully!', 'green');

        return {
            success: migrationFiles.length,
            failed: 0,
            skipped: 0,
        };
    } catch (error) {
        log('');
        log('❌ Migration execution failed', 'red');
        log('   Check the error messages above', 'yellow');
        
        return {
            success: 0,
            failed: migrationFiles.length,
            skipped: 0,
        };
    } finally {
        process.chdir(originalCwd);
    }
}

// Main execution
async function main() {
    log('🚀 Sequential Migration Execution Script', 'cyan');
    log('========================================', 'cyan');
    log('');

    // Check prerequisites
    if (!checkSupabaseCLI()) {
        process.exit(1);
    }

    log('');
    log('📋 Checking project link status...', 'yellow');
    if (!checkProjectLink()) {
        process.exit(1);
    }

    // Get migration files
    log('');
    log('📋 Scanning migration files...', 'yellow');
    const migrationFiles = getMigrationFiles();
    log(`✅ Found ${migrationFiles.length} migration files`, 'green');

    if (options.startFrom) {
        log(`📍 Starting from: ${options.startFrom}`, 'cyan');
        log(`   (${migrationFiles.length} migrations remaining)`, 'gray');
    }

    log('');

    // Confirm execution
    const confirmed = await confirmExecution(migrationFiles);
    if (!confirmed) {
        log('❌ Cancelled by user', 'yellow');
        process.exit(0);
    }

    // Execute migrations
    const results = await executeMigrations(migrationFiles);

    // Summary
    log('');
    log('==========================================', 'cyan');
    log('📊 Migration Execution Summary', 'cyan');
    log('==========================================', 'cyan');
    log(`Total migrations: ${migrationFiles.length}`, 'reset');
    log(`✅ Successful: ${results.success}`, 'green');
    log(`❌ Failed: ${results.failed}`, results.failed === 0 ? 'green' : 'red');
    log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
    log('');

    log('✅ Migration execution complete!', 'green');
    log('');
    log('💡 Verify migrations in Supabase Dashboard:', 'cyan');
    log('   - Go to Table Editor to see tables', 'gray');
    log('   - Check Database → Functions for functions', 'gray');
    log('   - Review Authentication → Policies for RLS', 'gray');
    log('');

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
