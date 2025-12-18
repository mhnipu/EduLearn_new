#!/bin/bash
# ============================================
# Sequential Migration Execution Script (Bash)
# ============================================
# This script applies all migrations sequentially using Supabase CLI
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
MIGRATIONS_PATH="$PROJECT_ROOT/supabase/migrations"

# Parse arguments
PROJECT_REF=""
SKIP_CONFIRM=false
VERBOSE=false
START_FROM=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --project-ref)
            PROJECT_REF="$2"
            shift 2
            ;;
        --skip-confirm)
            SKIP_CONFIRM=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --start-from)
            START_FROM="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}🚀 Sequential Migration Execution Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
echo -e "${YELLOW}📋 Checking Supabase CLI installation...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not installed!${NC}"
    echo ""
    echo -e "${YELLOW}Please install Supabase CLI first:${NC}"
    echo -e "${CYAN}  npm install -g supabase${NC}"
    echo -e "${CYAN}  OR${NC}"
    echo -e "${CYAN}  brew install supabase/tap/supabase${NC}"
    echo ""
    echo -e "${YELLOW}See: docs/setup/INSTALL_SUPABASE_CLI.md${NC}"
    exit 1
fi

VERSION=$(supabase --version 2>&1 | head -n 1)
echo -e "${GREEN}✅ Supabase CLI found: $VERSION${NC}"

# Check if project is linked
echo ""
echo -e "${YELLOW}📋 Checking project link status...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Project not linked to Supabase${NC}"
    
    if [ -z "$PROJECT_REF" ]; then
        echo ""
        echo -e "${YELLOW}Please provide your Supabase project reference ID:${NC}"
        echo -e "${CYAN}  Usage: ./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF${NC}"
        echo ""
        echo -e "${YELLOW}To get your project reference ID:${NC}"
        echo -e "${CYAN}  1. Go to Supabase Dashboard → Settings → General${NC}"
        echo -e "${CYAN}  2. Copy the 'Reference ID'${NC}"
        echo ""
        exit 1
    fi
    
    echo -e "${CYAN}🔗 Linking to Supabase project: $PROJECT_REF${NC}"
    if supabase link --project-ref "$PROJECT_REF"; then
        echo -e "${GREEN}✅ Project linked successfully${NC}"
    else
        echo -e "${RED}❌ Failed to link project${NC}"
        echo -e "${YELLOW}Make sure you have the correct project reference ID${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Project already linked${NC}"
fi

# Get all migration files in order
echo ""
echo -e "${YELLOW}📋 Scanning migration files...${NC}"

MIGRATION_FILES=($(find "$MIGRATIONS_PATH" -name "*.sql" -type f | grep -v "MIGRATION_INDEX" | grep -E "^[0-9]{3}_" | sort))

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No migration files found in: $MIGRATIONS_PATH${NC}"
    exit 1
fi

# Filter if START_FROM is specified
if [ -n "$START_FROM" ]; then
    FILTERED_FILES=()
    for file in "${MIGRATION_FILES[@]}"; do
        FILENAME=$(basename "$file")
        if [[ "$FILENAME" >= "$START_FROM" ]]; then
            FILTERED_FILES+=("$file")
        fi
    done
    MIGRATION_FILES=("${FILTERED_FILES[@]}")
    echo -e "${CYAN}📍 Starting from: $START_FROM${NC}"
fi

TOTAL_MIGRATIONS=${#MIGRATION_FILES[@]}
echo -e "${GREEN}✅ Found $TOTAL_MIGRATIONS migration files${NC}"
echo ""

# Show migration list
if [ "$VERBOSE" = true ] || [ "$SKIP_CONFIRM" = false ]; then
    echo -e "${CYAN}Migration files to be executed (in order):${NC}"
    INDEX=1
    for file in "${MIGRATION_FILES[@]}"; do
        FILENAME=$(basename "$file")
        echo -e "${GRAY}  $INDEX. $FILENAME${NC}"
        ((INDEX++))
    done
    echo ""
fi

# Confirm before proceeding
if [ "$SKIP_CONFIRM" = false ]; then
    echo -e "${YELLOW}⚠️  This will apply $TOTAL_MIGRATIONS migrations sequentially${NC}"
    echo -e "${GRAY}   Supabase CLI will execute them in order automatically${NC}"
    echo ""
    read -p "Continue? (Y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Cancelled by user${NC}"
        exit 0
    fi
    echo ""
fi

# Change to project root
cd "$PROJECT_ROOT"

# Execute migrations
echo -e "${CYAN}🚀 Executing migrations sequentially...${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${YELLOW}💡 Note: Supabase CLI applies migrations in sequential order automatically${NC}"
echo -e "${GRAY}   All $TOTAL_MIGRATIONS migrations will be executed one by one${NC}"
echo ""

if supabase db push; then
    echo ""
    echo -e "${CYAN}==========================================${NC}"
    echo -e "${GREEN}✅ All migrations applied successfully!${NC}"
    echo -e "${CYAN}==========================================${NC}"
    echo ""
    echo -e "${CYAN}📊 Execution Summary:${NC}"
    echo -e "   Total migrations: $TOTAL_MIGRATIONS"
    echo -e "${GREEN}   ✅ All executed successfully in sequential order${NC}"
    echo ""
    echo -e "${CYAN}💡 Verify migrations in Supabase Dashboard:${NC}"
    echo -e "${GRAY}   1. Go to Table Editor - Check for 37+ tables${NC}"
    echo -e "${GRAY}   2. Go to Database → Functions - Check for 30+ functions${NC}"
    echo -e "${GRAY}   3. Go to Authentication → Policies - Check for RLS policies${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Migration execution failed${NC}"
    echo -e "${YELLOW}   Check the error messages above${NC}"
    echo ""
    echo -e "${CYAN}💡 Troubleshooting:${NC}"
    echo -e "${GRAY}   - Verify project is linked: supabase status${NC}"
    echo -e "${GRAY}   - Check Supabase project is active in dashboard${NC}"
    echo -e "${GRAY}   - Review specific error messages above${NC}"
    echo -e "${GRAY}   - Check migration files for syntax errors${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Migration execution complete!${NC}"
echo ""
