# TestSprite MCP Execution Guide
## Comprehensive 9-Phase Testing Plan

**Status**: ⚠️ Server Not Running - Code Analysis Complete  
**Next Step**: Start server (`npm run dev`) then execute TestSprite tests

---

## Prerequisites

### 1. Start Development Server
```bash
npm run dev
```
Server should run on `http://localhost:8080`

### 2. Verify TestSprite MCP Configuration
- TestSprite MCP server should be configured in Cursor
- Code summary generated: `testsprite_tests/tmp/code_summary.json`

### 3. Test Credentials Setup
Create test users for each role:
- **Super Admin**: `superadmin@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`
- **Teacher**: `teacher@test.com` / `password123`
- **Student**: `student@test.com` / `password123`
- **Guardian**: `guardian@test.com` / `password123`

---

## Test Execution Phases

### Phase 1: System Discovery ✅

**Status**: Code Analysis Complete

**Findings**:
- ✅ 40+ routes identified
- ✅ 5 user roles mapped
- ✅ Authentication flow documented
- ✅ Permission system analyzed

**Routes Identified**:
- Public: `/`, `/auth`
- Protected: 38+ routes
- Admin: 15+ routes
- Teacher: 3 routes
- Student: 1 route

**Next**: Execute live tests when server is running

---

### Phase 2: Authentication & RBAC Validation

**Test Cases**:

1. **Login Flow**
   - Test with valid credentials
   - Test with invalid credentials
   - Verify session creation
   - Verify role assignment

2. **Registration Flow**
   - Test registration form
   - Verify pending approval status
   - Test admin approval workflow

3. **Role-Based Access**
   - Test admin-only routes
   - Test teacher-only routes
   - Test student-only routes
   - Attempt unauthorized access

4. **Permission-Based Access**
   - Test module permissions
   - Test action permissions
   - Verify super admin bypass

**Expected Issues** (from code analysis):
- 🔴 Debug endpoints in production code
- ⚠️ Race condition in ProtectedRoute
- ⚠️ Profile completion check complexity

---

### Phase 3: Enrollment & Course Assignment Testing

**Test Cases**:

1. **Admin Enrollment**
   - Create single enrollment
   - Create bulk enrollment
   - Verify enrollment in database
   - Test duplicate prevention

2. **Teacher Assignment**
   - Assign teacher to course
   - Verify teacher-student relationship
   - Test multiple teachers per course

3. **Course Access Control**
   - Verify enrolled students can access
   - Verify unenrolled students cannot access
   - Test course content visibility

**Expected Issues**:
- ⚠️ Missing enrollment verification in CourseDetail
- ⚠️ N+1 query pattern in enrollment queries

---

### Phase 4: Teacher Dashboard Validation

**Test Cases**:

1. **Assigned Students**
   - Verify teachers see only assigned students
   - Test student profile visibility
   - Verify progress tracking

2. **Grade Submission**
   - Test assignment grading
   - Verify feedback workflow
   - Test grade persistence

3. **Analytics**
   - Verify course statistics
   - Test student progress charts
   - Verify data accuracy

**Expected Issues**:
- ⚠️ Performance: Sequential queries
- ⚠️ Missing loading states

---

### Phase 5: Student Experience Testing

**Test Cases**:

1. **Course List**
   - Verify enrolled courses display
   - Test course filtering
   - Verify enrollment status

2. **Teacher Details**
   - Verify teacher name display
   - Test email/phone visibility
   - Verify profile image display

3. **Library Access**
   - Test approved status display
   - Test pending status display
   - Test denied status display

4. **Progress Tracking**
   - Verify progress calculation
   - Test assignment deadlines
   - Verify completion tracking

**Expected Issues**:
- ⚠️ N+1 query in progress calculation
- ⚠️ Missing teacher details in some views

---

### Phase 6: Library & Media System Testing

**Test Cases**:

1. **Book Upload & Display**
   - Test PDF upload
   - Verify thumbnail display
   - Test cover image rendering
   - Verify download functionality

2. **PDF Viewer**
   - Test PDF loading
   - Verify page navigation
   - Test download button
   - Verify error handling

3. **Video System**
   - **YouTube URLs**:
     - Test auto-detection
     - Verify iframe embedding
     - Test invalid URL handling
     - Verify thumbnail generation
   - **Direct Videos**:
     - Test video file upload
     - Verify custom player
     - Test progress tracking
     - Verify thumbnail display

**Expected Issues**:
- ✅ YouTube detection works (code verified)
- ⚠️ Invalid URL error handling could be improved
- ⚠️ Missing file size validation

---

### Phase 7: UI/UX & Performance Review

**Test Cases**:

1. **Responsive Design**
   - Test desktop layout
   - Test tablet layout
   - Test mobile layout
   - Verify touch interactions

2. **User Experience**
   - Identify confusing flows
   - Test loading states
   - Verify error messages
   - Test empty states

3. **Performance**
   - Measure API response times
   - Detect redundant renders
   - Identify slow queries
   - Test with large datasets

**Expected Issues**:
- ⚠️ N+1 query patterns
- ⚠️ Missing loading states
- ⚠️ Table responsiveness on mobile

---

### Phase 8: Data Integrity & Security

**Test Cases**:

1. **Database Consistency**
   - Verify enrollment data
   - Test role assignments
   - Verify permission consistency
   - Test foreign key constraints

2. **Role Escalation**
   - Attempt unauthorized role assignment
   - Test permission manipulation
   - Verify RLS policies

3. **JWT Handling**
   - Test token expiration
   - Verify token refresh
   - Test session persistence
   - Verify logout

4. **Data Exposure**
   - Check frontend for sensitive data
   - Verify API response filtering
   - Test error message exposure

**Expected Issues**:
- 🔴 Debug endpoints exposing data
- ⚠️ JWT in localStorage (Supabase default)
- ⚠️ Some client-side only checks

---

### Phase 9: Reporting & Improvements

**Deliverables**:

1. **Structured Bug Report**
   - Critical bugs
   - Security issues
   - RBAC failures
   - UI/UX improvements

2. **Prioritized Recommendations**
   - Code refactoring
   - Schema optimization
   - Performance improvements
   - Scalability readiness

---

## TestSprite MCP Execution Commands

### Option 1: Full Test Suite
```bash
# After server is running
# Use TestSprite MCP in Cursor chat:
"Run comprehensive tests on http://localhost:8080 covering all 9 phases"
```

### Option 2: Phase-by-Phase Testing
```bash
# Phase 1: System Discovery
"Test system discovery - detect routes, APIs, and authentication flows"

# Phase 2: Authentication & RBAC
"Test authentication flows and role-based access control"

# Phase 3: Enrollment Testing
"Test enrollment system and course assignment"

# Phase 4: Teacher Dashboard
"Test teacher dashboard and student management"

# Phase 5: Student Experience
"Test student dashboard and course access"

# Phase 6: Library & Media
"Test library system, PDF viewing, and video playback including YouTube"

# Phase 7: UI/UX & Performance
"Test responsive design and performance"

# Phase 8: Security
"Test data integrity and security vulnerabilities"

# Phase 9: Reporting
"Generate comprehensive test report"
```

---

## Known Issues from Code Analysis

### Critical (Fix Immediately)
1. **Debug Endpoints**: Remove all `fetch('http://127.0.0.1:7243/...')` calls
2. **Enrollment Verification**: Add check in CourseDetail component

### High Priority
3. **N+1 Queries**: Optimize progress calculation queries
4. **Race Conditions**: Fix ProtectedRoute useEffect dependencies
5. **File Validation**: Add file size and type validation

### Medium Priority
6. **Loading States**: Add skeleton loaders
7. **Error Messages**: Improve user-friendly error handling
8. **Performance**: Implement React Query caching

---

## Test Execution Workflow

1. **Start Server**: `npm run dev`
2. **Verify Server**: Check `http://localhost:8080`
3. **Run TestSprite**: Use MCP commands above
4. **Review Results**: Check generated reports
5. **Fix Issues**: Address critical bugs first
6. **Re-test**: Run tests after fixes

---

## Expected Test Output

TestSprite will generate:
- `testsprite_tests/tmp/raw_report.md` - Raw test results
- `testsprite_tests/testsprite-mcp-test-report.md` - Formatted report
- Test execution logs
- Screenshots (if configured)
- Performance metrics

---

## Next Steps

1. ✅ Code summary generated
2. ⏳ Start development server
3. ⏳ Execute TestSprite tests
4. ⏳ Review and fix issues
5. ⏳ Re-test after fixes

---

**Note**: The comprehensive test report from code analysis is available at:
`docs/testing/COMPREHENSIVE_TEST_REPORT.md`

This includes detailed findings from all 9 phases based on static code analysis.

