# Backend Test Configuration Fix Guide

## 🔴 Critical Issue Found

All backend tests failed because they're trying to access Supabase APIs through the frontend server (`http://localhost:8080`) instead of the actual Supabase backend URL.

## Problem

**Current (WRONG) Configuration:**
```python
BASE_URL = "http://localhost:8080"
```

**Tests Attempt:**
- `http://localhost:8080/auth/v1/token` ❌ (404 Not Found)
- `http://localhost:8080/auth/signup` ❌ (404 Not Found)

**Should Be:**
- `https://pcpiigyuafdzgokiosve.supabase.co/auth/v1/token` ✅
- `https://pcpiigyuafdzgokiosve.supabase.co/auth/v1/signup` ✅

## Solution

### Option 1: Update Test Files Directly

Update all backend test files in `testsprite_tests/TC*.py`:

```python
# Find this line in each test file:
BASE_URL = "http://localhost:8080"

# Replace with:
BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
```

### Option 2: Use Environment Variable

1. Create `.env.test` file:
```env
SUPABASE_URL=https://pcpiigyuafdzgokiosve.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

2. Update test files to read from environment:
```python
import os
BASE_URL = os.getenv("SUPABASE_URL", "https://pcpiigyuafdzgokiosve.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
```

### Option 3: Create Test Configuration File

Create `testsprite_tests/backend_config.json`:
```json
{
  "supabase_url": "https://pcpiigyuafdzgokiosve.supabase.co",
  "supabase_anon_key": "your_anon_key_here",
  "endpoints": {
    "auth": {
      "signup": "/auth/v1/signup",
      "login": "/auth/v1/token",
      "refresh": "/auth/v1/token?grant_type=refresh_token"
    },
    "rest": {
      "courses": "/rest/v1/courses",
      "enrollments": "/rest/v1/course_enrollments",
      "books": "/rest/v1/books",
      "videos": "/rest/v1/videos"
    },
    "rpc": {
      "admin_enroll_student": "/rest/v1/rpc/admin_enroll_student",
      "admin_assign_teacher": "/rest/v1/rpc/admin_assign_teacher",
      "is_profile_complete": "/rest/v1/rpc/is_profile_complete"
    }
  }
}
```

## Required Dependencies

Install missing Python packages:
```bash
pip install PyJWT requests
```

## Supabase Project Information

- **Project URL**: `https://pcpiigyuafdzgokiosve.supabase.co`
- **Auth Endpoint**: `https://pcpiigyuafdzgokiosve.supabase.co/auth/v1/...`
- **REST Endpoint**: `https://pcpiigyuafdzgokiosve.supabase.co/rest/v1/...`
- **Storage Endpoint**: `https://pcpiigyuafdzgokiosve.supabase.co/storage/v1/...`

## Test Files to Update

Update these files:
- `TC001_authentication_registration_and_login.py`
- `TC002_role_based_dashboard_access.py`
- `TC003_course_creation_and_management.py`
- `TC004_student_enrollment_in_courses.py`
- `TC005_library_content_upload_and_management.py`
- `TC006_assignment_creation_submission_and_grading.py`
- `TC007_user_management_and_role_assignment.py`
- `TC008_system_monitoring_access_and_data_retrieval.py`
- `TC009_site_content_management.py`
- `TC010_session_management_and_token_handling.py`

## After Fixing

1. Re-run backend tests:
```bash
cd "E:\Work\Personal Projects\EduLearn\EduLearn_new"
node "C:\Users\mazed\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js" generateCodeAndExecute
```

2. Review updated test report in `testsprite_tests/testsprite-backend-test-report.md`

## Additional Notes

- Backend tests require valid Supabase API keys
- Some tests may need test user accounts created in Supabase
- RLS policies will be tested automatically when using correct endpoints
- Storage API tests require proper bucket configuration
