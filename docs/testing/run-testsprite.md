# Running Testsprite Tests

## Current Status
✅ Development server is running on `http://localhost:8080`
✅ Testsprite configuration file created (`testsprite.config.json`)
✅ Product Requirements Document created (`PRD.md`)
✅ Setup documentation created (`TESTSPRITE_SETUP.md`)

## Next Steps to Run Testsprite

### Option 1: Using Testsprite MCP Server in Cursor

If Testsprite MCP server is already configured in Cursor:

1. **Ensure the dev server is running:**
   ```bash
   cd smartlearn-mvp
   npm run dev
   ```

2. **In Cursor, use the following prompt:**
   ```
   Help me test this project with TestSprite.
   ```

3. Testsprite will:
   - Analyze the codebase using the PRD.md file
   - Generate comprehensive test plans
   - Execute tests automatically
   - Generate detailed test reports

### Option 2: If Testsprite MCP is Not Configured

1. **Install/Configure Testsprite MCP Server in Cursor:**
   - Go to Cursor Settings
   - Navigate to MCP Servers section
   - Add Testsprite MCP server
   - Configure with your Testsprite credentials (if required)

2. **Follow Option 1 steps**

## Test Coverage Areas

Testsprite will test:

### 1. Authentication & Authorization
- Login/registration forms
- Session management
- Role-based access control
- Route protection

### 2. Core Pages
- Landing page (`/`)
- Authentication page (`/auth`)
- Dashboard pages (role-based)
- Course listing and detail pages
- Library pages
- Profile page

### 3. Component Functionality
- All shadcn-ui components
- Form validation
- File upload
- Video player
- PDF viewer
- Navigation components

### 4. User Flows
- Student enrollment flow
- Course creation flow
- Content upload flow
- Assignment submission flow

## Expected Test Results

After execution, Testsprite will provide:
- ✅ Pass/Fail status for each test
- 📊 Coverage metrics
- 🐛 Bug reports with details
- 📝 Missing feature detection
- 💡 Recommendations for improvements

## Configuration Files

- **testsprite.config.json**: Test configuration with routes and scenarios
- **PRD.md**: Product requirements document for Testsprite analysis
- **TESTSPRITE_SETUP.md**: Detailed setup instructions

## Troubleshooting

### Server Not Running
```bash
cd smartlearn-mvp
npm run dev
```

### Port Already in Use
The server is configured to run on port 8080. If it's occupied:
1. Stop the other process
2. Or modify `vite.config.ts` to use a different port

### Environment Variables Missing
Create `.env` file in `smartlearn-mvp/`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Testsprite Not Available
- Verify MCP server is configured in Cursor
- Check Testsprite documentation for setup: https://docs.testsprite.com
- Ensure you have Testsprite account/credentials if required

