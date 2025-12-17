# Codebase Organization

This document describes the organization structure of the EduLearn codebase.

## Directory Structure

```
EduLearn_new/
├── scripts/                    # All automation scripts
│   ├── *.ps1                  # PowerShell scripts (Windows)
│   ├── *.sh                   # Shell scripts (Unix/Linux/macOS)
│   └── README.md              # Scripts documentation
├── docs/                       # All documentation
│   ├── summaries/             # Summary documents and guides
│   ├── setup/                 # Setup and installation guides
│   ├── guides/                # User and developer guides
│   ├── troubleshooting/       # Troubleshooting guides
│   ├── implementation/        # Implementation details
│   ├── features/              # Feature documentation
│   ├── changelog/             # Change logs
│   └── migrations/            # Migration documentation
├── src/                        # Source code
│   ├── components/            # React components
│   ├── pages/                 # Page components
│   ├── lib/                   # Utility libraries
│   └── ...
├── supabase/                   # Database files
│   ├── migrations/            # Database migration files
│   └── scripts/               # SQL scripts
├── public/                     # Static assets
├── testsprite_tests/          # Test files and reports
└── ...                        # Configuration files
```

## File Organization Rules

### Scripts (`.ps1`, `.sh`)
- **Location**: `scripts/` directory
- **Purpose**: All automation, utility, and setup scripts
- **Documentation**: See `scripts/README.md`

### Documentation (`.md`)
- **Location**: `docs/` directory with appropriate subdirectories
- **Root-level summaries**: Moved to `docs/summaries/`
- **Structure**:
  - `docs/setup/` - Installation and setup guides
  - `docs/guides/` - How-to guides for users and developers
  - `docs/troubleshooting/` - Problem-solving guides
  - `docs/implementation/` - Implementation details
  - `docs/features/` - Feature documentation
  - `docs/changelog/` - Change logs and updates
  - `docs/summaries/` - Summary documents and overviews

### Database Files (`.sql`)
- **Location**: `supabase/migrations/` (for migrations) and `supabase/scripts/` (for utility scripts)
- **Naming**: Sequential numbering for migrations (e.g., `001_initial_schema.sql`)

### Configuration Files
- **Root level**: `package.json`, `tsconfig.json`, `vite.config.ts`, etc.
- **Purpose**: Project configuration only

## Scripts Reference

All scripts have been moved to the `scripts/` directory. Update any references:

### Before
```bash
.\INSTALL_AND_APPLY_CLI.ps1
```

### After
```bash
.\scripts\INSTALL_AND_APPLY_CLI.ps1
```

## Documentation Reference

All summary documents have been moved to `docs/summaries/`. Update references:

### Before
```markdown
[Setup Guide](./SUPER_ADMIN_SETUP.md)
```

### After
```markdown
[Setup Guide](./docs/summaries/SUPER_ADMIN_SETUP.md)
```

## Migration Notes

The following files were moved during organization:

### Scripts Moved to `scripts/`
- `APPLY_ALL_MIGRATIONS_SCRIPT.ps1`
- `apply-auth-enhancements.ps1`
- `INSTALL_AND_APPLY_CLI.ps1`
- `invoke-testsprite-mcp.ps1`
- `invoke-testsprite-mcp.sh`
- `ORGANIZE_FILES.ps1`
- `run-testsprite-mcp.ps1`

### Documents Moved to `docs/summaries/`
- `COMPLETE_FIX_GUIDE.md`
- `MIGRATION_ORGANIZATION_SUMMARY.md`
- `ORGANIZATION_COMPLETE.md`
- `PERMISSION_SYSTEM_FIX.md`
- `RBAC_ROLES_SUMMARY.md`
- `SUPER_ADMIN_SETUP.md`
- `TEACHER_DASHBOARD_UPGRADE_SUMMARY.md`

## Benefits

1. **Cleaner root directory** - Only essential config files at root level
2. **Better organization** - Scripts and docs are grouped logically
3. **Easier navigation** - Clear structure for finding files
4. **Maintainability** - Easier to locate and update scripts/docs

## Future Organization

When adding new files:
- **Scripts**: Add to `scripts/` with appropriate naming
- **Documentation**: Add to appropriate `docs/` subdirectory
- **Summary docs**: Add to `docs/summaries/`
- **Keep root clean**: Only essential configuration files
