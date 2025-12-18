# EduLearn - Learning Management System

A comprehensive, production-ready Learning Management System (LMS) built with modern web technologies. EduLearn provides a unified platform for course management, student enrollment, content delivery, assessment administration, attendance tracking, and administrative oversight.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Guide](#installation-guide)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Available Scripts](#available-scripts)
- [Database Management](#database-management)
- [Security Setup](#security-setup)
- [Verification & Testing](#verification--testing)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Support & Resources](#support--resources)

---

## Features

- **Multi-Role System**: Super Admin, Admin, Teacher, Student, and Guardian roles with granular permissions
- **Course Management**: Create, edit, and manage courses with modules, lessons, and materials
- **Content Library**: Centralized repository for books (PDFs) and videos with access control
- **Assessment System**: Assignments, quizzes, exams with automated grading and rubric support
- **Attendance Tracking**: Session-based attendance management with detailed reporting
- **Student Progress**: Real-time progress tracking and analytics
- **Guardian Portal**: Read-only access for parents/guardians to monitor student progress
- **Landing Page CMS**: Content management system for customizable landing pages (Super Admin only)
- **Real-Time Updates**: Live data synchronization using Supabase Realtime
- **Responsive Design**: Mobile-first design with dark mode support
- **Row-Level Security**: Database-level security ensuring data privacy

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating) or [Download directly](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download Git](https://git-scm.com/downloads)
- **Supabase Account** - [Sign up for free](https://app.supabase.com)
- **Supabase CLI** (Optional, for advanced migration management) - [Installation Guide](./docs/setup/INSTALL_SUPABASE_CLI.md)

---

## Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd EduLearn_new

# 2. Install dependencies
npm install

# 3. Create .env file (see Environment Configuration section)
cp .env.example .env  # If .env.example exists, or create manually

# 4. Configure environment variables (see below)

# 5. Apply database migrations (see Database Migrations section)

# 6. Start development server
npm run dev
```

For detailed step-by-step instructions, see the [Installation Guide](#installation-guide) below.

---

## Installation Guide

### Step 1: Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd EduLearn_new
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required dependencies including React, TypeScript, Vite, Supabase client, and UI libraries.

### Step 3: Set Up Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign in or create a new account
3. Create a new project or select an existing one
4. Wait for the project to be fully provisioned (usually takes 1-2 minutes)

### Step 4: Get Supabase Credentials

1. In your Supabase project dashboard, navigate to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the publishable key under "Project API keys")

### Step 5: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# .env file
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

⚠️ **Important**: 
- Replace placeholder values with your actual Supabase credentials
- Never commit `.env` file to version control (it's already in `.gitignore`)
- Use different projects for development and production

### Step 6: Apply Database Migrations

You have three options to apply database migrations:

#### Option A: Using Supabase Dashboard (Recommended for Beginners)

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open each migration file from `supabase/migrations/` folder in numerical order (001, 002, 003...)
5. Copy the SQL content and paste into SQL Editor
6. Click **Run** (or press `Ctrl+Enter`)
7. Repeat for all 50 migration files

📋 **Migration Index**: See [`supabase/migrations/MIGRATION_INDEX.md`](./supabase/migrations/MIGRATION_INDEX.md) for a complete list and execution order.

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI globally
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase

# Link to your project (replace with your project reference ID)
supabase link --project-ref your-project-ref-id

# Push all migrations
supabase db push
```

📚 **Full CLI Guide**: See [`docs/setup/INSTALL_SUPABASE_CLI.md`](./docs/setup/INSTALL_SUPABASE_CLI.md)

#### Option C: Using PowerShell Script (Windows)

```powershell
# Run the migration script
.\scripts\APPLY_ALL_MIGRATIONS_SCRIPT.ps1
```

This script will:
- Combine all migration files into a single SQL file
- Output: `ALL_MIGRATIONS_COMBINED.sql`
- Copy the combined file content and run it in Supabase SQL Editor

📋 **Available Scripts**: See [Available Scripts](#available-scripts) section below.

### Step 7: Verify Installation

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser**: Navigate to `http://localhost:8080`

3. **Verify database connection**:
   - Try logging in or accessing any page that uses the database
   - Check browser console for any Supabase connection errors
   - You should see tables in Supabase Dashboard → **Table Editor**:
     - `profiles`
     - `courses`
     - `books`
     - `videos`
     - `assignments`
     - And 30+ more tables

4. **Test authentication**:
   - Create a test user via registration
   - Verify user appears in Supabase Dashboard → **Authentication** → **Users**
   - Check that profile is created in `profiles` table

✅ **Setup Complete!** Your development environment is ready.

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### Environment Variables Explained

- **`VITE_SUPABASE_URL`**: Your Supabase project URL
  - Format: `https://[project-ref].supabase.co`
  - Found in: Supabase Dashboard → Settings → API → Project URL

- **`VITE_SUPABASE_PUBLISHABLE_KEY`**: Your Supabase anonymous/public key
  - Also called "anon key" or "public key"
  - Found in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
  - Safe to expose in frontend code (protected by RLS policies)

### Security Notes

⚠️ **Important Security Reminders**:
- Never commit `.env` file to version control (it's in `.gitignore`)
- Use different Supabase projects for development and production
- The `anon` key is safe for frontend use (protected by Row-Level Security)
- Never expose your `service_role` key in frontend code

### Environment File Template

If you have a `.env.example` file, copy it:
```bash
cp .env.example .env
```

Then fill in your actual values.

---

## Database Migrations

### Migration Overview

The project includes **50 migration files** that set up the complete database schema, including:
- 37+ database tables
- 30+ database functions
- Row-Level Security (RLS) policies
- Triggers and indexes
- Initial data structures

### Migration Files Location

All migration files are located in: `supabase/migrations/`

### Migration Execution Order

Migrations must be executed in **numerical order**:
- `001_initial_schema.sql` (first)
- `002_schema_updates.sql`
- `003_additional_tables.sql`
- ... (continue sequentially)
- `050_last_migration.sql` (last)

📋 **Complete Migration Index**: See [`supabase/migrations/MIGRATION_INDEX.md`](./supabase/migrations/MIGRATION_INDEX.md) for detailed migration descriptions and execution order.

### Migration Methods

#### Method 1: Automated Sequential Execution (Recommended)

Best for: Automated sequential execution with progress tracking

**PowerShell Script (Windows):**
```powershell
# Execute all migrations sequentially
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF

# Or skip confirmation prompt
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -SkipConfirm

# Or start from specific migration
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -StartFrom "020_final_fix_enrollment.sql"

# Verbose output
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -Verbose
```

**Bash Script (Linux/Mac):**
```bash
# Make script executable (first time only)
chmod +x scripts/apply-migrations-sequential.sh

# Execute all migrations sequentially
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF

# Or skip confirmation prompt
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF --skip-confirm

# Or start from specific migration
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF --start-from "020_final_fix_enrollment.sql"
```

**Node.js Script (Cross-platform):**
```bash
# Execute all migrations sequentially
npm run migrate -- --project-ref YOUR_PROJECT_REF

# Or using node directly
node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF

# With options
node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF --continue-on-error --dry-run
```

**What it does:**
- ✅ Checks Supabase CLI installation
- ✅ Verifies/links project automatically
- ✅ Scans all migration files in order
- ✅ Executes migrations sequentially via Supabase CLI
- ✅ Shows progress and summary
- ✅ Handles errors gracefully
- ✅ Provides verification steps

#### Method 2: Supabase Dashboard (Manual - One by One)

Best for: Beginners, manual control, step-by-step execution

**Option A: Manual Execution**
1. Open Supabase Dashboard → SQL Editor
2. For each migration file (in order):
   - Copy SQL content
   - Paste into SQL Editor
   - Click Run
   - Verify success message

**Option B: Generate Execution Guide**
```powershell
# Generate step-by-step manual guide
.\scripts\apply-migrations-manual-guide.ps1

# This creates: MIGRATION_EXECUTION_GUIDE.md
# Follow the guide to execute migrations one by one
```

#### Method 3: Supabase CLI Direct

Best for: Developers familiar with CLI

```bash
# Link project (first time only)
supabase link --project-ref your-project-ref

# Push all migrations (executes sequentially)
supabase db push

# Or push specific migration
supabase db push --file supabase/migrations/001_initial_schema.sql
```

#### Method 4: Combined SQL File (Legacy)

Best for: Running all migrations at once

```powershell
# Generate combined SQL file
.\scripts\APPLY_ALL_MIGRATIONS_SCRIPT.ps1

# This creates: ALL_MIGRATIONS_COMBINED.sql
# Copy and run the combined file in Supabase SQL Editor
```

### Verifying Migrations

After applying migrations, verify in Supabase Dashboard:

1. **Table Editor**: Should see 37+ tables
2. **Database Functions**: Go to Database → Functions to see 30+ functions
3. **Policies**: Go to Authentication → Policies to see RLS policies

**Quick Verification SQL**:
```sql
-- Count tables (should be ~37)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count functions (should be ~30+)
SELECT COUNT(*) FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;
```

📚 **For detailed automation guide**: See [`docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md`](./docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md)

---

## Development Workflow

### Starting the Development Server

```bash
npm run dev
```

The development server will start on `http://localhost:8080` with:
- Hot Module Replacement (HMR) - changes reflect instantly
- Source maps for debugging
- Fast refresh for React components

### Available NPM Scripts

```bash
# Development
npm run dev          # Start development server (port 8080)
npm run build        # Build for production
npm run build:dev    # Build for development (with source maps)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint to check code quality
```

### Development Features

- **Hot Reload**: Automatic page refresh on file changes
- **TypeScript**: Full type checking and IntelliSense support
- **ESLint**: Code quality and style checking
- **Source Maps**: Easier debugging in browser DevTools

### Code Editing

You can edit code using:

1. **Your Preferred IDE**: VS Code, WebStorm, etc.
2. **GitHub**: Direct file editing in browser
3. **GitHub Codespaces**: Cloud-based development environment

---

## Project Structure

```
EduLearn_new/
├── src/                      # Source code
│   ├── components/          # Reusable React components
│   │   ├── ui/             # shadcn-ui base components
│   │   ├── course/         # Course-related components
│   │   ├── library/        # Library components
│   │   ├── assessment/     # Assessment components
│   │   ├── cms/            # CMS components
│   │   └── permissions/    # Permission components
│   ├── pages/              # Page components (routes)
│   │   ├── admin/         # Admin pages
│   │   ├── dashboard/     # Dashboard pages (role-based)
│   │   ├── teacher/       # Teacher pages
│   │   ├── student/       # Student pages
│   │   └── library/       # Library pages
│   ├── lib/                # Utility functions and helpers
│   │   └── auth.tsx       # Authentication logic
│   ├── contexts/           # React Context providers
│   │   └── ThemeContext.tsx
│   ├── integrations/       # External integrations
│   │   └── supabase/      # Supabase client and types
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Application entry point
├── supabase/                # Supabase configuration
│   └── migrations/         # Database migration files (50 files)
├── scripts/                 # Automation scripts
│   ├── APPLY_ALL_MIGRATIONS_SCRIPT.ps1
│   ├── INSTALL_AND_APPLY_CLI.ps1
│   └── apply-auth-enhancements.ps1
├── docs/                    # Documentation
│   ├── setup/             # Setup guides
│   ├── supabase/          # Supabase guides
│   ├── guides/            # Feature guides
│   ├── testing/           # Testing documentation
│   └── PROJECT_OVERVIEW.md # Comprehensive project documentation
├── public/                  # Static assets
├── .env                     # Environment variables (not in git)
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

---

## Technology Stack

### Frontend

- **React** 18.3.1 - UI library
- **TypeScript** 5.8.3 - Type-safe JavaScript
- **Vite** 5.4.19 - Build tool and dev server
- **React Router DOM** 6.30.1 - Client-side routing
- **TanStack Query** 5.83.0 - Server state management
- **React Hook Form** 7.61.1 - Form management
- **Zod** 3.25.76 - Schema validation

### UI Framework

- **shadcn-ui** - Accessible component library
- **Radix UI** - Primitive components
- **Tailwind CSS** 3.4.17 - Utility-first CSS
- **Lucide React** 0.462.0 - Icon library
- **Recharts** 2.15.4 - Chart library

### Backend & Database

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication service
  - Storage (file uploads)
  - Realtime subscriptions
- **Row-Level Security (RLS)** - Database-level access control

### Development Tools

- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Vite** - Fast HMR and builds

### Additional Libraries

- **@dnd-kit** - Drag-and-drop functionality
- **PDF.js** - PDF rendering
- **date-fns** - Date utilities
- **framer-motion** - Animations (if used)

For a complete breakdown of all dependencies, see [`package.json`](./package.json).

---

## Available Scripts

### Migration Scripts

#### `apply-migrations-sequential.ps1` (Recommended)
Executes all migrations sequentially using Supabase CLI with progress tracking.

**Usage**:
```powershell
# With project reference ID
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF

# Skip confirmation
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -SkipConfirm

# Verbose output
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -Verbose

# Start from specific migration
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF -StartFrom "020_final_fix_enrollment.sql"
```

**Features**:
- ✅ Automatic project linking
- ✅ Sequential execution with progress
- ✅ Error handling and reporting
- ✅ Summary statistics

#### `apply-migrations-sequential.sh`
Linux/Mac bash version of the sequential migration script.

**Usage**:
```bash
# Make executable (first time)
chmod +x scripts/apply-migrations-sequential.sh

# Execute migrations
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF

# With options
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF --skip-confirm --verbose
```

#### `apply-migrations-sequential.js`
Cross-platform Node.js version of the sequential migration script.

**Usage**:
```bash
# Using npm script
npm run migrate -- --project-ref YOUR_PROJECT_REF

# Direct execution
node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF

# With options
node scripts/apply-migrations-sequential.js --project-ref YOUR_PROJECT_REF --continue-on-error --dry-run
```

#### `apply-migrations-manual-guide.ps1`
Generates a detailed step-by-step guide for manually executing migrations.

**Usage**:
```powershell
.\scripts\apply-migrations-manual-guide.ps1
```

**Output**: Creates `MIGRATION_EXECUTION_GUIDE.md` with instructions for each migration.

#### `APPLY_ALL_MIGRATIONS_SCRIPT.ps1` (Legacy)
Combines all migration files into a single SQL file for easy execution.

**Usage**:
```powershell
.\scripts\APPLY_ALL_MIGRATIONS_SCRIPT.ps1
```

**Output**: Creates `ALL_MIGRATIONS_COMBINED.sql` in project root.

#### `INSTALL_AND_APPLY_CLI.ps1`
Installs Supabase CLI and applies all migrations automatically.

**Usage**:
```powershell
.\scripts\INSTALL_AND_APPLY_CLI.ps1
```

### Utility Scripts

#### `apply-auth-enhancements.ps1`
Applies authentication enhancements (phone support, improved logging).

**Usage**:
```powershell
.\scripts\apply-auth-enhancements.ps1
```

#### `ORGANIZE_FILES.ps1`
Organizes project files into proper directories (`.ps1`, `.sh`, `.md` files).

**Usage**:
```powershell
.\scripts\ORGANIZE_FILES.ps1
```

### Testing Scripts

#### `invoke-testsprite-mcp.ps1` / `invoke-testsprite-mcp.sh`
Runs TestSprite automated testing.

**Usage**:
```powershell
# Windows
.\scripts\invoke-testsprite-mcp.ps1

# Linux/Mac
./scripts/invoke-testsprite-mcp.sh
```

📋 **Scripts Location**: All scripts are in the `scripts/` directory. See [`scripts/README.md`](./scripts/README.md) for more details.

---

## Database Management

### Quick Access

- **Supabase Dashboard**: [app.supabase.com](https://app.supabase.com) → Your Project
- **Table Editor**: View and edit data directly
- **SQL Editor**: Run custom queries and migrations
- **Authentication**: Manage users and roles

### Common Tasks

#### View/Edit Data
1. Go to Supabase Dashboard → **Table Editor**
2. Select any table from the list
3. View, add, edit, or delete rows

#### Run SQL Queries
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Write your SQL and click **Run**

#### Manage Users
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Create, edit, or delete users
3. Reset passwords, manage sessions

#### Assign Roles
1. Go to **Table Editor** → `user_roles` table
2. Add rows with `user_id` and `role` values
3. Available roles: `super_admin`, `admin`, `teacher`, `student`, `guardian`

### Detailed Guides

- **Quick Setup**: [`docs/setup/QUICK_SETUP.md`](./docs/setup/QUICK_SETUP.md) - 3-step setup guide
- **Complete Database Guide**: [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](./docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md) - Comprehensive database management
- **User Management**: [`docs/supabase/SUPABASE_USER_MANAGEMENT.md`](./docs/supabase/SUPABASE_USER_MANAGEMENT.md) - Managing users and roles
- **Connection Verification**: [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md) - Verify setup

---

## Security Setup

### Important Security Fixes

⚠️ **CRITICAL**: After initial setup, apply security fixes:

1. **Quickest Method** (Recommended):
   - See [`docs/migrations/SECURITY_FIX_FINAL.md`](./docs/migrations/SECURITY_FIX_FINAL.md) - 1-minute fix via Supabase Dashboard

2. **Alternative Methods**:
   - [`docs/migrations/QUICK_FIX_SECURITY.md`](./docs/migrations/QUICK_FIX_SECURITY.md)
   - [`docs/migrations/APPLY_SECURITY_FIX.md`](./docs/migrations/APPLY_SECURITY_FIX.md)

### Security Features

- **Row-Level Security (RLS)**: Database-level access control on all tables
- **Permission System**: Module-based granular permissions
- **Role-Based Access**: Five distinct roles with hierarchical permissions
- **Guardian Read-Only**: Guardians have read-only access to student data
- **SECURITY DEFINER Functions**: Safe functions for RLS policy checks

### Authentication Setup

- **Email/Password**: Standard authentication
- **Phone Authentication** (Optional): See [`docs/guides/EXTERNAL_SUPABASE_AUTH_GUIDE.md`](./docs/guides/EXTERNAL_SUPABASE_AUTH_GUIDE.md)
- **Session Management**: Automatic token refresh
- **Password Policies**: Configurable via Supabase Dashboard

---

## Verification & Testing

### Verify Installation

1. **Check Environment Variables**:
   ```bash
   # Verify .env file exists and has correct values
   cat .env  # Linux/Mac
   type .env # Windows
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Should start without errors on `http://localhost:8080`

3. **Verify Database Connection**:
   - Open browser console (F12)
   - Navigate to any page
   - Check for Supabase connection errors
   - Should see successful API calls

4. **Check Database Tables**:
   - Go to Supabase Dashboard → **Table Editor**
   - Verify 37+ tables exist
   - Check key tables: `profiles`, `courses`, `user_roles`, `assignments`

5. **Test Authentication**:
   - Try registering a new user
   - Verify user appears in Supabase Dashboard → **Authentication** → **Users**
   - Check that profile is created in `profiles` table

### Testing

- **Manual Testing**: Test all user flows (registration, login, course access, etc.)
- **Automated Testing**: See [`docs/testing/`](./docs/testing/) for TestSprite setup
- **TestSprite Guide**: [`docs/testing/TESTSPRITE_QUICK_START.md`](./docs/testing/TESTSPRITE_QUICK_START.md)

---

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading

**Problem**: Supabase connection errors, undefined URL/key

**Solution**:
- Verify `.env` file exists in root directory
- Check variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Restart development server after creating/modifying `.env`
- Ensure no spaces around `=` sign in `.env` file

#### Database Connection Errors

**Problem**: "Failed to fetch" or connection timeout errors

**Solution**:
- Verify Supabase project is active (not paused)
- Check Project URL is correct in `.env`
- Verify anon key is correct in `.env`
- Check Supabase Dashboard → Logs for errors
- See [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md)

#### Migration Errors

**Problem**: SQL errors when running migrations

**Solution**:
- Ensure migrations are run in numerical order (001, 002, 003...)
- Check for existing objects (some migrations check for conflicts)
- Verify you're using the correct Supabase project
- See migration-specific errors in Supabase SQL Editor output
- Check [`supabase/migrations/MIGRATION_INDEX.md`](./supabase/migrations/MIGRATION_INDEX.md) for migration notes

#### Port Already in Use

**Problem**: "Port 8080 is already in use"

**Solution**:
```bash
# Option 1: Kill process on port 8080
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9

# Option 2: Use different port
# Modify vite.config.ts or use --port flag
npm run dev -- --port 3000
```

#### RLS Policy Errors

**Problem**: "Permission denied" errors when accessing data

**Solution**:
- Verify user has appropriate role assigned
- Check RLS policies in Supabase Dashboard → Authentication → Policies
- Apply security fixes (see [Security Setup](#security-setup))
- Verify user roles in `user_roles` table

### Getting More Help

- **Troubleshooting Guides**: [`docs/troubleshooting/`](./docs/troubleshooting/)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Issues**: Check existing issues or create new one

---

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deployment Options

#### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

#### Netlify

1. Push code to GitHub
2. Import project in [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify dashboard

#### Other Static Hosting

Any static hosting service that supports Vite/React:
- AWS S3 + CloudFront
- GitHub Pages
- Azure Static Web Apps
- DigitalOcean App Platform

### Production Environment Variables

Add the same environment variables in your hosting platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Deployment Checklist

- [ ] Environment variables configured in hosting platform
- [ ] Production build tested locally (`npm run build && npm run preview`)
- [ ] Database migrations applied to production Supabase project
- [ ] RLS policies verified
- [ ] Security fixes applied
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS enabled (automatic on most platforms)

---

## Documentation

### Quick Links

- **📚 Full Documentation Index**: [`docs/INDEX.md`](./docs/INDEX.md)
- **📋 Comprehensive Project Overview**: [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) (6,000+ lines)
- **📖 Product Requirements**: [`docs/PRD.md`](./docs/PRD.md)

### Documentation Categories

#### Setup Guides
- [`docs/setup/QUICK_SETUP.md`](./docs/setup/QUICK_SETUP.md) - Quick 3-step setup
- [`docs/setup/EXTERNAL_SUPABASE_SETUP.md`](./docs/setup/EXTERNAL_SUPABASE_SETUP.md) - External Supabase configuration
- [`docs/setup/INSTALL_SUPABASE_CLI.md`](./docs/setup/INSTALL_SUPABASE_CLI.md) - CLI installation
- [`docs/setup/GET_SUPABASE_KEYS.md`](./docs/setup/GET_SUPABASE_KEYS.md) - Getting API keys
- [`docs/setup/VERIFY_SUPABASE_CONNECTION.md`](./docs/setup/VERIFY_SUPABASE_CONNECTION.md) - Connection verification

#### Supabase & Database
- [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](./docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md) - Complete database guide
- [`docs/supabase/SUPABASE_USER_MANAGEMENT.md`](./docs/supabase/SUPABASE_USER_MANAGEMENT.md) - User management
- [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md) - Verify setup
- [`docs/supabase/MIGRATION_TO_SUPABASE.md`](./docs/supabase/MIGRATION_TO_SUPABASE.md) - Migration guide
- [`docs/supabase/RUN_MIGRATION.md`](./docs/supabase/RUN_MIGRATION.md) - Running migrations

#### Feature Guides
- [`docs/guides/`](./docs/guides/) - Feature-specific guides
- [`docs/guides/TEACHER_STUDENT_ENROLLMENT_GUIDE.md`](./docs/guides/TEACHER_STUDENT_ENROLLMENT_GUIDE.md)
- [`docs/guides/STUDENT_ENROLLMENT_SYSTEM.md`](./docs/guides/STUDENT_ENROLLMENT_SYSTEM.md)
- [`docs/guides/ROLE_HIERARCHY_SYSTEM.md`](./docs/guides/ROLE_HIERARCHY_SYSTEM.md)

#### Testing
- [`docs/testing/`](./docs/testing/) - Testing documentation
- [`docs/testing/TESTSPRITE_QUICK_START.md`](./docs/testing/TESTSPRITE_QUICK_START.md)
- [`docs/testing/TESTING_GUIDE.md`](./docs/testing/TESTING_GUIDE.md)

#### Troubleshooting
- [`docs/troubleshooting/`](./docs/troubleshooting/) - Common issues and fixes

#### Implementation Details
- [`docs/implementation/`](./docs/implementation/) - Implementation summaries
- [`docs/features/`](./docs/features/) - Feature documentation

### Complete Documentation Index

For a complete list of all documentation, see [`docs/INDEX.md`](./docs/INDEX.md).

---

## Support & Resources

### Official Documentation

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **React Documentation**: [react.dev](https://react.dev)
- **TypeScript Documentation**: [typescriptlang.org](https://www.typescriptlang.org/docs)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev)
- **Tailwind CSS Documentation**: [tailwindcss.com](https://tailwindcss.com/docs)

### Community Resources

- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **Supabase GitHub**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
- **React Community**: [react.dev/community](https://react.dev/community)

### Project Resources

- **GitHub Repository**: Your repository URL
- **Issue Tracker**: GitHub Issues
- **Project Overview**: [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md)

---

## How to Edit This Code

### Using Your Preferred IDE

1. Clone the repository
2. Open in your IDE (VS Code, WebStorm, etc.)
3. Make changes
4. Commit and push

**Requirements**: Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Edit Directly in GitHub

1. Navigate to the file in GitHub
2. Click the "Edit" button (pencil icon)
3. Make changes
4. Commit changes

### Use GitHub Codespaces

1. Navigate to repository main page
2. Click "Code" → "Codespaces" tab
3. Click "New codespace"
4. Edit files directly in the cloud
5. Commit and push changes

---

## License

[Add your license information here]

---

**Happy Learning! 🎓**

For questions or issues, please refer to the [Documentation](#documentation) section or create an issue in the repository.
