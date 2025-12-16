# TestSprite PRD Usage Guide

## Overview

The `TESTSPRITE_PRD.md` file is a comprehensive Product Requirements Document specifically structured for TestSprite MCP to understand and test the EDulearn application effectively.

## File Location

- **PRD File**: `docs/testing/TESTSPRITE_PRD.md`
- **Config File**: `testsprite.config.json`
- **This Guide**: `docs/testing/TESTSPRITE_PRD_GUIDE.md`

## How to Use with TestSprite MCP

### 1. Basic Usage

When invoking TestSprite MCP, reference the PRD:

```
Run comprehensive tests on this React application using TESTSPRITE_PRD.md.
The application is running on http://localhost:8080.
```

### 2. Specific Feature Testing

Test specific features by referencing sections:

```
Test the authentication flow as described in TESTSPRITE_PRD.md section "Authentication & Authorization".
Focus on login, registration, and session management.
```

### 3. Role-Based Testing

Test specific user roles:

```
Test all admin routes and features as documented in TESTSPRITE_PRD.md.
Use admin credentials: admin@test.com / password123
```

### 4. Component Testing

Test specific components:

```
Test all course components listed in TESTSPRITE_PRD.md section "Component Inventory".
Verify CourseHeader, CourseCurriculum, and SmartVideoPlayer work correctly.
```

## PRD Structure

The PRD is organized into 13 main sections:

1. **Executive Summary** - Project overview and tech stack
2. **Application Architecture** - Project structure and flow
3. **User Roles & Permissions** - All 5 user roles with capabilities
4. **Complete Route Mapping** - All 40+ routes with details
5. **Component Inventory** - All components cataloged
6. **Feature Specifications** - Detailed feature descriptions
7. **Test Scenarios & Expected Behaviors** - Ready-to-use test cases
8. **Integration Points** - Supabase, React Query, external libs
9. **Data Requirements** - Test data needed
10. **Edge Cases & Error Handling** - Edge cases to test
11. **Performance Requirements** - Performance benchmarks
12. **Accessibility Requirements** - WCAG compliance needs
13. **Security Requirements** - Security testing guidelines

## Key Sections for TestSprite

### Route Testing
Reference: **Section 4: Complete Route Mapping**

Each route includes:
- Component name
- Access requirements
- Expected elements
- Test scenarios

Example usage:
```
Test all routes listed in TESTSPRITE_PRD.md section "Complete Route Mapping".
Verify each route loads correctly and shows expected elements.
```

### User Flow Testing
Reference: **Section 7: Test Scenarios & Expected Behaviors**

Pre-defined test scenarios with:
- Steps to execute
- Expected results

Example usage:
```
Execute all authentication test scenarios from TESTSPRITE_PRD.md section 7.
Verify login, registration, and session management work as documented.
```

### Component Testing
Reference: **Section 5: Component Inventory**

Complete list of:
- Core components
- Course components
- Library components
- UI components

Example usage:
```
Test all library components from TESTSPRITE_PRD.md:
- FileDropzone
- PDFViewer
- VideoPlayer
- ImageCropper
Verify each component functions as documented.
```

## Test Execution Commands

### Full Test Suite
```
Run comprehensive automated tests on this React application.
Use TESTSPRITE_PRD.md for complete application understanding.
Base URL: http://localhost:8080
Config: testsprite.config.json
```

### Authentication Testing
```
Test authentication system as documented in TESTSPRITE_PRD.md.
Test scenarios:
- Login with valid credentials
- Login with invalid credentials
- Registration flow
- Session management
- Protected route access
```

### Dashboard Testing
```
Test all role-based dashboards from TESTSPRITE_PRD.md:
- Admin dashboard (/dashboard/admin)
- Teacher dashboard (/dashboard/teacher)
- Student dashboard (/dashboard/student)
- Guardian dashboard (/dashboard/guardian)
Verify each dashboard shows correct content for its role.
```

### Course Management Testing
```
Test course management features from TESTSPRITE_PRD.md:
- Course creation
- Course editing
- Module management
- Material management
- Enrollment process
```

### Library Testing
```
Test content library features from TESTSPRITE_PRD.md:
- Content upload (books and videos)
- PDF viewing
- Video playback
- Search and filtering
- Thumbnail generation
```

### Form Validation Testing
```
Test all forms for validation as documented in TESTSPRITE_PRD.md:
- Required field validation
- Email validation
- Password match validation
- File upload validation
Verify error messages display correctly.
```

## Test Data Requirements

The PRD specifies test data needed in **Section 9: Data Requirements**.

Ensure you have:
- Test users for each role
- Sample courses (5-10)
- Library content (books and videos)
- Assignments and submissions
- Enrollments

## Best Practices

### 1. Start with Critical Paths
Test authentication and route protection first, as documented in the PRD.

### 2. Test by Role
Use the role-specific sections to test each user type comprehensively.

### 3. Follow Test Scenarios
The PRD includes ready-to-use test scenarios. Execute them in order.

### 4. Check Edge Cases
Reference Section 10 for edge cases that need special attention.

### 5. Verify Expected Behaviors
Each route and feature has documented expected behaviors. Verify against these.

## Integration with testsprite.config.json

The PRD complements `testsprite.config.json`:

- **Config File**: Defines routes and basic scenarios
- **PRD File**: Provides detailed specifications and expected behaviors

Use both together for comprehensive testing:
```
Use testsprite.config.json for route configuration and TESTSPRITE_PRD.md for detailed test specifications.
Execute comprehensive tests on http://localhost:8080.
```

## Troubleshooting

### If Tests Fail
1. Check PRD section for expected behavior
2. Verify test data exists (Section 9)
3. Check authentication status
4. Verify permissions (Section 3)

### If Routes Don't Load
1. Verify route protection requirements (Section 4)
2. Check user role matches route requirements
3. Verify permissions if permission-based route

### If Components Don't Render
1. Check component inventory (Section 5)
2. Verify component dependencies
3. Check for required props/data

## Updates

The PRD should be updated when:
- New routes are added
- New features are implemented
- Component structure changes
- User roles/permissions change
- Expected behaviors change

## Summary

The `TESTSPRITE_PRD.md` file is your comprehensive guide for testing the EDulearn application. It provides:

✅ Complete route mapping (40+ routes)  
✅ Detailed component inventory  
✅ Ready-to-use test scenarios  
✅ Expected behaviors for each feature  
✅ Edge cases and error handling  
✅ Performance and accessibility requirements  
✅ Security testing guidelines  

Use it with TestSprite MCP to ensure comprehensive, bug-free testing of your application.

---

**Quick Start Command**:
```
Run comprehensive tests using TESTSPRITE_PRD.md on http://localhost:8080
```
