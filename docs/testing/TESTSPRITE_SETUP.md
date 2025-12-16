# Testsprite Testing Setup for EDulearn

This document outlines the setup for conducting automated testing with Testsprite.

## Prerequisites

1. **Testsprite MCP Server**: Ensure Testsprite MCP server is configured in Cursor IDE
2. **Development Server**: The application must be running locally on port 8080
3. **Environment Variables**: Supabase credentials should be configured in `.env` file

## Project Overview

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn-ui with Tailwind CSS
- **Backend**: Supabase
- **Port**: 8080

## Application Structure

### Main Routes
- `/` - Landing page
- `/auth` - Authentication (login/register)
- `/dashboard` - User dashboard (role-based)
- `/courses` - Course listing and details
- `/library` - Content library
- `/profile` - User profile

### User Roles
- Admin
- Super Admin
- Teacher
- Student
- Guardian

## Starting the Development Server

```bash
cd smartlearn-mvp
npm install
npm run dev
```

The server will start on `http://localhost:8080`

## Testing with Testsprite

Once the MCP server is configured in Cursor:

1. Start the development server: `npm run dev`
2. Use the IDE assistant with: "Help me test this project with TestSprite"
3. Testsprite will:
   - Analyze the codebase
   - Generate test plans
   - Execute tests automatically
   - Provide detailed reports

## Test Configuration

The `testsprite.config.json` file contains:
- Application routes to test
- Authentication requirements
- Test scenarios for each route
- Component coverage targets

## Comprehensive PRD for TestSprite

A detailed Product Requirements Document (PRD) is available at `docs/testing/TESTSPRITE_PRD.md`:
- Complete route mapping (40+ routes)
- Detailed component inventory
- User roles and permissions
- Test scenarios with expected behaviors
- Integration points
- Edge cases and error handling
- Performance and accessibility requirements

**Usage**: Reference this PRD when running TestSprite for comprehensive testing:
```
Run comprehensive tests using TESTSPRITE_PRD.md on http://localhost:8080
```

See `docs/testing/TESTSPRITE_PRD_GUIDE.md` for detailed usage instructions.

## Expected Test Areas

1. **UI Components**: All shadcn-ui components
2. **Navigation**: Route transitions and link functionality
3. **Authentication**: Login, registration, session management
4. **Dashboards**: Role-based content display
5. **Course Management**: CRUD operations
6. **Library**: File upload, viewing, searching
7. **Forms**: Validation and submission
8. **Responsive Design**: Mobile and desktop layouts

## Environment Variables Required

Create a `.env` file in `smartlearn-mvp/` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

## Notes

- Testsprite will automatically detect React components
- Tests can be run in headless or browser mode
- Test reports will be generated after execution
- Failed tests will include detailed error information

