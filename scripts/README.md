# Scripts Directory

This directory contains all automation and utility scripts for the EduLearn project.

## PowerShell Scripts (.ps1)

### Database & Migration Scripts

- **`APPLY_ALL_MIGRATIONS_SCRIPT.ps1`**
  - Applies all database migrations to Supabase
  - Usage: Run from project root with Supabase CLI configured

- **`INSTALL_AND_APPLY_CLI.ps1`**
  - Installs Supabase CLI and applies migrations
  - Setup script for new developers

### Test & Quality Assurance Scripts

- **`invoke-testsprite-mcp.ps1`**
  - Invokes TestSprite MCP (Model Context Protocol) for testing
  - PowerShell version for Windows

- **`run-testsprite-mcp.ps1`**
  - Runs TestSprite MCP tests
  - Alternative test execution script

### Authentication & Security Scripts

- **`apply-auth-enhancements.ps1`**
  - Applies authentication enhancements to the system
  - Security-related updates

### Utility Scripts

- **`ORGANIZE_FILES.ps1`**
  - Organizes project files into proper directories
  - File organization automation

## Shell Scripts (.sh)

### Test Scripts

- **`invoke-testsprite-mcp.sh`**
  - Unix/Linux/macOS version of TestSprite MCP invocation
  - Cross-platform test execution

## Usage

All scripts should be run from the project root directory unless otherwise specified.

### PowerShell (Windows)
```powershell
.\scripts\<script-name>.ps1
```

### Bash (Unix/Linux/macOS)
```bash
bash scripts/<script-name>.sh
```

## Requirements

- **PowerShell 5.1+** (Windows) or **PowerShell Core** (Cross-platform)
- **Supabase CLI** (for migration scripts)
- **Node.js & npm** (for project dependencies)

## Notes

- Always review scripts before execution
- Ensure proper permissions and environment setup
- Database scripts require valid Supabase credentials
