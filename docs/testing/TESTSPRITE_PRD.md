# Product Requirements Document (PRD) for TestSprite Testing
## EDulearn - SmartLearn MVP

**Version**: 2.0  
**Last Updated**: 2024  
**Purpose**: Comprehensive PRD for TestSprite MCP automated testing  
**Base URL**: http://localhost:8080  
**Framework**: React 18.3.1 + TypeScript + Vite

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application Architecture](#application-architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Complete Route Mapping](#complete-route-mapping)
5. [Component Inventory](#component-inventory)
6. [Feature Specifications](#feature-specifications)
7. [Test Scenarios & Expected Behaviors](#test-scenarios--expected-behaviors)
8. [Integration Points](#integration-points)
9. [Data Requirements](#data-requirements)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)
11. [Performance Requirements](#performance-requirements)
12. [Accessibility Requirements](#accessibility-requirements)
13. [Security Requirements](#security-requirements)

---

## Executive Summary

### Project Overview
EDulearn is a comprehensive e-learning platform designed for educational institutions. It provides course management, content library, user management, and role-based dashboards with granular permission controls.

### Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **UI Library**: shadcn-ui components with Tailwind CSS
- **Routing**: React Router DOM v6
- **State Management**: React Query (TanStack Query) v5
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Real-time)
- **Build Tool**: Vite
- **Development Server**: Port 8080
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **PDF Viewing**: PDF.js
- **Image Processing**: react-easy-crop

### Key Features
1. Multi-role authentication system (5 user roles)
2. Role-based dashboards with analytics
3. Course management with modules and materials
4. Content library (PDFs and videos)
5. Assignment system with submissions
6. Student enrollment management
7. Permission-based access control
8. Profile completion workflow
9. Theme support (dark/light mode)

---

## Application Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── course/         # Course-specific components
│   ├── library/        # Library-specific components
│   ├── permissions/    # Permission management components
│   └── ui/             # shadcn-ui base components
├── pages/              # Page components
│   ├── admin/          # Admin-only pages
│   ├── dashboard/      # Role-based dashboards
│   ├── library/        # Library pages
│   ├── student/        # Student pages
│   └── teacher/        # Teacher pages
├── lib/                # Utilities and helpers
│   └── auth.ts         # Authentication logic
├── contexts/           # React contexts
│   └── ThemeContext.tsx
└── App.tsx             # Main application component
```

### Authentication Flow
1. User visits `/auth` (public route)
2. User can login or register
3. New users require admin approval (redirected to `/pending-approval`)
4. Approved users are redirected to role-specific dashboard
5. Session persists via Supabase Auth
6. Protected routes check authentication and role

### Route Protection System
- **Public Routes**: `/`, `/auth`
- **Authenticated Routes**: Require valid session
- **Role-Based Routes**: Require specific role(s)
- **Permission-Based Routes**: Require specific module + action permission

---

## User Roles & Permissions

### 1. Super Admin
**Role ID**: `super_admin`  
**Access Level**: Full system access

**Capabilities**:
- All admin capabilities
- System configuration
- Advanced user management
- Super admin management panel
- System monitoring

**Dashboard**: `/dashboard/admin` or `/dashboard/super_admin`

### 2. Admin
**Role ID**: `admin`  
**Access Level**: Administrative access

**Capabilities**:
- Course management (create, edit, delete)
- User management (view, edit, assign roles)
- Content library management
- Category management
- Assignment management
- Enrollment management
- Content assignments
- System monitoring

**Dashboard**: `/dashboard/admin`

**Key Routes**:
- `/admin/courses/new` - Create courses
- `/admin/users` - User management
- `/admin/categories` - Category management
- `/admin/assignments` - Assignment management
- `/admin/enrollments` - Enrollment management

### 3. Teacher
**Role ID**: `teacher`  
**Access Level**: Course and student management

**Capabilities**:
- Create and manage course content
- Upload lessons and materials
- Manage enrolled students
- Grade assignments
- Track student progress
- Manage attendance
- View assigned students

**Dashboard**: `/dashboard/teacher`

**Key Routes**:
- `/teacher/courses/:courseId/lessons` - Lesson management
- `/teacher/students` - Assigned students
- `/teacher/courses/:courseId/attendance` - Attendance management
- `/admin/courses/new` - Create courses (if permission granted)
- `/library/upload` - Upload content (if permission granted)

### 4. Student
**Role ID**: `student`  
**Access Level**: Learning and course access

**Capabilities**:
- Browse and enroll in courses
- Access enrolled course content
- View video lessons and download materials
- Submit assignments
- Track learning progress
- View assigned teachers
- Request library access

**Dashboard**: `/dashboard/student`

**Key Routes**:
- `/courses` - Browse courses
- `/courses/:courseId` - Course details
- `/student/assignments` - View and submit assignments
- `/library` - Access library (if granted)

### 5. Guardian
**Role ID**: `guardian`  
**Access Level**: Monitoring and viewing

**Capabilities**:
- View student progress
- Monitor enrolled courses
- Access reports
- View student assignments

**Dashboard**: `/dashboard/guardian`

---

## Complete Route Mapping

### Public Routes

#### `/` - Landing Page
**Component**: `Landing.tsx`  
**Access**: Public  
**Purpose**: Marketing/landing page

**Expected Elements**:
- Hero section with call-to-action
- Feature cards/sections
- Navigation links
- Footer

**Test Scenarios**:
- Page loads without errors
- All navigation links work
- Hero section displays correctly
- Feature cards render
- Responsive design works

#### `/auth` - Authentication
**Component**: `Auth.tsx`  
**Access**: Public  
**Purpose**: User login and registration

**Expected Elements**:
- Login form (email, password)
- Registration form (email, password, confirm password, name)
- Toggle between login/register
- Form validation
- Error messages
- Success states

**Test Scenarios**:
- Login form displays correctly
- Registration form displays correctly
- Form validation works (empty fields, invalid email, password mismatch)
- Login succeeds with valid credentials
- Registration creates new user
- New users redirected to `/pending-approval`
- Existing users redirected to role-based dashboard
- Error messages display for invalid credentials
- Session persists after login

### Protected Routes (Require Authentication)

#### `/dashboard` - Main Dashboard
**Component**: `Dashboard.tsx`  
**Access**: Authenticated  
**Purpose**: Redirects to role-specific dashboard

**Expected Behavior**:
- Redirects to `/dashboard/{role}` based on user role
- If no role, shows appropriate message

**Test Scenarios**:
- Redirects admin to `/dashboard/admin`
- Redirects teacher to `/dashboard/teacher`
- Redirects student to `/dashboard/student`
- Redirects guardian to `/dashboard/guardian`
- Unauthenticated users redirected to `/auth`

#### `/dashboard/admin` - Admin Dashboard
**Component**: `AdminDashboard.tsx`  
**Access**: `super_admin`, `admin`  
**Purpose**: Administrative overview and quick actions

**Expected Elements**:
- Statistics cards (users, courses, enrollments, library uploads)
- Recent users section
- Recent activity feed
- System health monitoring
- Quick action buttons
- Charts (growth, role distribution)
- Pending approvals indicator

**Test Scenarios**:
- Dashboard loads for admin users
- Statistics display correct data
- Recent users section shows 6 users
- Activity feed displays recent actions
- Quick action buttons navigate correctly
- Charts render with data
- System health indicators show correct status
- Navigation works correctly

#### `/dashboard/teacher` - Teacher Dashboard
**Component**: `TeacherDashboard.tsx`  
**Access**: `teacher`  
**Purpose**: Teacher overview and course management

**Expected Elements**:
- My courses section
- Student management quick action
- Recent activity
- Course statistics
- Quick actions

**Test Scenarios**:
- Dashboard loads for teacher users
- My courses section displays
- Quick actions work
- Navigation to student management works
- Statistics display correctly

#### `/dashboard/student` - Student Dashboard
**Component**: `StudentDashboard.tsx`  
**Access**: `student`  
**Purpose**: Student learning overview

**Expected Elements**:
- Enrolled courses
- Assigned teachers section
- Library access status
- Recent activity
- Progress tracking

**Test Scenarios**:
- Dashboard loads for student users
- Enrolled courses display
- Assigned teachers show correctly
- Library access status displays
- Progress tracking works

#### `/dashboard/guardian` - Guardian Dashboard
**Component**: `GuardianDashboard.tsx`  
**Access**: `guardian`  
**Purpose**: Monitor student progress

**Expected Elements**:
- Linked students list
- Student progress overview
- Course enrollment status
- Assignment completion status

**Test Scenarios**:
- Dashboard loads for guardian users
- Linked students display
- Progress information shows correctly

#### `/courses` - Course Listing
**Component**: `Courses.tsx`  
**Access**: Authenticated  
**Purpose**: Browse all available courses

**Expected Elements**:
- Course cards/grid
- Search functionality
- Category filters
- Pagination (if applicable)
- Empty state (if no courses)
- Loading state

**Test Scenarios**:
- Course list displays
- Search functionality works
- Category filtering works
- Course cards are clickable
- Navigation to course detail works
- Empty state displays when no courses
- Loading state shows during fetch

#### `/courses/:courseId` - Course Detail
**Component**: `CourseDetail.tsx`  
**Access**: Authenticated  
**Purpose**: View course details and content

**Expected Elements**:
- Course header (title, description, image)
- Course overview
- Curriculum/modules section
- Resources section
- Reviews section
- Enrolled students (for teachers/admins)
- Enrollment button (for students)
- Progress indicator (for enrolled students)

**Test Scenarios**:
- Course details load correctly
- All sections display
- Enrollment button works for students
- Progress shows for enrolled students
- Modules/curriculum display
- Resources are accessible
- Reviews display correctly

#### `/library` - Content Library
**Component**: `Library.tsx`  
**Access**: Authenticated (with library access permission)  
**Purpose**: Browse library content (books and videos)

**Expected Elements**:
- Content grid (books and videos)
- Search functionality
- Category filters
- Content type filters (book/video)
- Empty state
- Loading state

**Test Scenarios**:
- Library content displays
- Search works
- Filters work correctly
- Content cards are clickable
- Navigation to content detail works
- Empty state displays appropriately

#### `/library/upload` - Upload Content
**Component**: `UploadContent.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with create permission)  
**Purpose**: Upload books (PDF) and videos

**Expected Elements**:
- File dropzone
- File type selection (book/video)
- Title input
- Description textarea
- Category selection
- Thumbnail upload
- Image cropper (for thumbnails)
- Submit button
- Form validation

**Test Scenarios**:
- Upload form displays
- File dropzone works
- File selection works
- Form validation works
- Thumbnail upload works
- Image cropper functions
- Submit creates content
- Success message displays
- Error handling works

#### `/library/book/:id` - Book Detail
**Component**: `BookDetail.tsx`  
**Access**: Authenticated (with library access)  
**Purpose**: View PDF book

**Expected Elements**:
- Book information (title, description, thumbnail)
- PDF viewer
- Download button
- Related content

**Test Scenarios**:
- Book details load
- PDF viewer displays
- PDF loads correctly
- Download button works
- Navigation works

#### `/library/video/:id` - Video Detail
**Component**: `VideoDetail.tsx`  
**Access**: Authenticated (with library access)  
**Purpose**: View video content

**Expected Elements**:
- Video information (title, description, thumbnail)
- Video player
- Progress tracking
- Related content

**Test Scenarios**:
- Video details load
- Video player displays
- Video plays correctly
- Progress tracking works
- Navigation works

#### `/profile` - User Profile
**Component**: `Profile.tsx`  
**Access**: Authenticated  
**Purpose**: View and edit user profile

**Expected Elements**:
- Profile information display
- Edit form
- Avatar upload
- Save button
- Form validation

**Test Scenarios**:
- Profile displays correctly
- Edit form works
- Avatar upload works
- Form validation works
- Save updates profile
- Success message displays

#### `/profile-completion` - Profile Completion
**Component**: `ProfileCompletion.tsx`  
**Access**: Authenticated (redirected if profile incomplete)  
**Purpose**: Complete user profile setup

**Expected Elements**:
- Multi-step form
- Required fields
- Form validation
- Progress indicator
- Submit button

**Test Scenarios**:
- Form displays for incomplete profiles
- All required fields validated
- Progress indicator works
- Submit completes profile
- Redirects after completion

#### `/pending-approval` - Pending Approval
**Component**: `PendingApproval.tsx`  
**Access**: Authenticated (pending users)  
**Purpose**: Inform users they need admin approval

**Expected Elements**:
- Approval pending message
- User information
- Logout option

**Test Scenarios**:
- Page displays for pending users
- Message is clear
- Logout works

### Admin Routes

#### `/admin/courses/new` - Create Course
**Component**: `CreateCourse.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with create permission)  
**Purpose**: Create new course

**Expected Elements**:
- Course form (title, description, image, categories)
- Form validation
- Submit button
- Success redirect

**Test Scenarios**:
- Form displays
- Validation works
- Submit creates course
- Redirects to course detail

#### `/admin/courses/:courseId/edit` - Edit Course
**Component**: `EditCourse.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with update permission)  
**Purpose**: Edit existing course

**Expected Elements**:
- Pre-filled course form
- Form validation
- Save button
- Success message

**Test Scenarios**:
- Form loads with course data
- Validation works
- Save updates course
- Success message displays

#### `/admin/courses/:courseId/materials` - Course Materials
**Component**: `CourseMaterials.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with update permission)  
**Purpose**: Manage course materials

**Expected Elements**:
- Materials list
- Add material button
- Material upload
- Delete functionality

**Test Scenarios**:
- Materials list displays
- Add material works
- Upload works
- Delete works

#### `/admin/courses/:courseId/modules` - Course Modules
**Component**: `CourseModules.tsx`  
**Access**: `super_admin`, `admin` (with update permission)  
**Purpose**: Manage course modules/curriculum

**Expected Elements**:
- Modules list
- Add module button
- Module form
- Reorder functionality
- Delete functionality

**Test Scenarios**:
- Modules list displays
- Add module works
- Edit module works
- Reorder works
- Delete works

#### `/admin/users` - User Management
**Component**: `UserManagement.tsx`  
**Access**: `super_admin`, `admin` (with read permission)  
**Purpose**: Manage all users

**Expected Elements**:
- Users table/list
- Search functionality
- Filter by role
- Edit user button
- Assign role functionality
- Approve/reject users
- User details view

**Test Scenarios**:
- Users list displays
- Search works
- Filters work
- Edit user works
- Role assignment works
- Approval/rejection works

#### `/admin/categories` - Category Management
**Component**: `CategoryManagement.tsx`  
**Access**: `super_admin`, `admin` (with read permission)  
**Purpose**: Manage content categories

**Expected Elements**:
- Categories list
- Add category button
- Category form
- Edit functionality
- Delete functionality

**Test Scenarios**:
- Categories list displays
- Add category works
- Edit category works
- Delete category works

#### `/admin/content-assignments` - Content Assignments
**Component**: `ContentAssignments.tsx`  
**Access**: `super_admin`, `admin` (with assign permission)  
**Purpose**: Assign library content to courses

**Expected Elements**:
- Assignment interface
- Course selector
- Content selector
- Assign button
- Assignment list

**Test Scenarios**:
- Interface displays
- Course selection works
- Content selection works
- Assignment works
- List displays assignments

#### `/admin/enrollments` - Enrollment Management
**Component**: `EnrollmentManagement.tsx`  
**Access**: `super_admin`, `admin` (with assign permission)  
**Purpose**: Manage student enrollments

**Expected Elements**:
- Enrollments list
- Enroll student button
- Student selector
- Course selector
- Enrollment status
- Remove enrollment

**Test Scenarios**:
- Enrollments list displays
- Enroll student works
- Student selection works
- Course selection works
- Status updates correctly
- Remove enrollment works

#### `/admin/assignments` - Assignment Management
**Component**: `AssignmentManagement.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with read permission)  
**Purpose**: Manage assignments

**Expected Elements**:
- Assignments list
- Create assignment button
- Assignment form
- Edit functionality
- View submissions

**Test Scenarios**:
- Assignments list displays
- Create assignment works
- Edit assignment works
- View submissions works

#### `/admin/assignments/:assignmentId/submissions` - Assignment Submissions
**Component**: `AssignmentSubmissions.tsx`  
**Access**: `super_admin`, `admin`, `teacher` (with read permission)  
**Purpose**: View and grade submissions

**Expected Elements**:
- Submissions list
- Submission details
- Grade input
- Submit grade button
- Status indicators

**Test Scenarios**:
- Submissions list displays
- Submission details show
- Grade input works
- Submit grade works
- Status updates

#### `/admin/course-wizard` - Course Wizard
**Component**: `CourseWizard.tsx`  
**Access**: `super_admin`, `admin` (with create permission)  
**Purpose**: Multi-step course creation wizard

**Expected Elements**:
- Multi-step form
- Step indicator
- Navigation (next/back)
- Form validation
- Final submit

**Test Scenarios**:
- Wizard displays
- Steps work correctly
- Navigation works
- Validation works
- Submit creates course

#### `/admin/super` - Super Admin Management
**Component**: `SuperAdminManagement.tsx`  
**Access**: `super_admin` only  
**Purpose**: Super admin system configuration

**Expected Elements**:
- System settings
- Advanced user management
- Configuration options

**Test Scenarios**:
- Page loads for super admin only
- Settings display
- Configuration works

#### `/admin/system-monitoring` - System Monitoring
**Component**: `SystemMonitoring.tsx`  
**Access**: `super_admin`, `admin` (with analytics permission)  
**Purpose**: System health and analytics

**Expected Elements**:
- System metrics
- Performance charts
- Error logs
- User activity

**Test Scenarios**:
- Metrics display
- Charts render
- Logs show correctly

#### `/admin/site-content` - Site Content
**Component**: `SiteContent.tsx`  
**Access**: `super_admin`, `admin` (with update permission)  
**Purpose**: Manage site-wide content

**Expected Elements**:
- Content editor
- Save button
- Preview

**Test Scenarios**:
- Editor displays
- Save works
- Preview works

### Teacher Routes

#### `/teacher/courses/:courseId/lessons` - Lesson Management
**Component**: `LessonManagement.tsx`  
**Access**: `teacher`, `super_admin`, `admin`  
**Purpose**: Manage course lessons

**Expected Elements**:
- Lessons list
- Add lesson button
- Lesson form
- Edit functionality
- Delete functionality

**Test Scenarios**:
- Lessons list displays
- Add lesson works
- Edit lesson works
- Delete lesson works

#### `/teacher/students` - Assigned Students
**Component**: `StudentManagement.tsx`  
**Access**: `teacher`, `super_admin`, `admin`  
**Purpose**: View and manage assigned students

**Expected Elements**:
- Students list
- Student details
- Performance metrics
- Search functionality

**Test Scenarios**:
- Students list displays
- Student details show
- Performance metrics display
- Search works

#### `/teacher/courses/:courseId/attendance` - Attendance Management
**Component**: `AttendanceManagement.tsx`  
**Access**: `teacher`, `super_admin`, `admin`  
**Purpose**: Manage student attendance

**Expected Elements**:
- Attendance list
- Mark attendance
- Attendance calendar
- Reports

**Test Scenarios**:
- Attendance list displays
- Mark attendance works
- Calendar displays
- Reports generate

### Student Routes

#### `/student/assignments` - Student Assignments
**Component**: `StudentAssignments.tsx`  
**Access**: `student`  
**Purpose**: View and submit assignments

**Expected Elements**:
- Assignments list
- Assignment details
- Submit button
- File upload
- Submission status

**Test Scenarios**:
- Assignments list displays
- Assignment details show
- Submit works
- File upload works
- Status updates

### Error Routes

#### `*` - Not Found
**Component**: `NotFound.tsx`  
**Access**: All  
**Purpose**: Handle 404 errors

**Expected Elements**:
- 404 message
- Back to home link

**Test Scenarios**:
- 404 page displays for invalid routes
- Navigation link works

---

## Component Inventory

### Core Components

#### Navigation
- **Navbar** (`components/Navbar.tsx`): Main navigation bar with role-based menu
- **NavLink** (`components/NavLink.tsx`): Navigation link component
- **ProtectedRoute** (`components/ProtectedRoute.tsx`): Route protection wrapper

#### Course Components
- **CourseHeader** (`components/course/CourseHeader.tsx`): Course title and metadata
- **CourseOverview** (`components/course/CourseOverview.tsx`): Course description and info
- **CourseCurriculum** (`components/course/CourseCurriculum.tsx`): Modules and lessons
- **CourseResources** (`components/course/CourseResources.tsx`): Course resources list
- **CourseReviews** (`components/course/CourseReviews.tsx`): Course reviews and ratings
- **CourseSidebar** (`components/course/CourseSidebar.tsx`): Course navigation sidebar
- **SmartVideoPlayer** (`components/course/SmartVideoPlayer.tsx`): Video player with progress tracking
- **EnrolledStudents** (`components/course/EnrolledStudents.tsx`): List of enrolled students
- **LibrarySelector** (`components/course/LibrarySelector.tsx`): Select library content for course
- **AttachedLibraryItems** (`components/course/AttachedLibraryItems.tsx`): Display attached library items

#### Library Components
- **FileDropzone** (`components/library/FileDropzone.tsx`): Drag-and-drop file upload
- **ImageCropper** (`components/library/ImageCropper.tsx`): Image cropping tool
- **ThumbnailUpload** (`components/library/ThumbnailUpload.tsx`): Thumbnail upload component
- **PDFViewer** (`components/library/PDFViewer.tsx`): PDF viewing component
- **VideoPlayer** (`components/library/VideoPlayer.tsx`): Video player component
- **VideoPlayerModal** (`components/library/VideoPlayerModal.tsx`): Modal video player
- **EditBookDialog** (`components/library/EditBookDialog.tsx`): Edit book dialog
- **EditVideoDialog** (`components/library/EditVideoDialog.tsx`): Edit video dialog

#### Permission Components
- **PermissionMatrixCard** (`components/permissions/PermissionMatrixCard.tsx`): Permission matrix display
- **MobilePermissionCard** (`components/permissions/MobilePermissionCard.tsx`): Mobile permission card

#### Utility Components
- **CategoryMultiSelect** (`components/CategoryMultiSelect.tsx`): Multi-select category picker
- **StarRating** (`components/StarRating.tsx`): Star rating component

#### UI Components (shadcn-ui)
All shadcn-ui components are available in `components/ui/`:
- Forms: button, input, textarea, select, checkbox, radio-group, form, label
- Navigation: tabs, breadcrumb, navigation-menu, sidebar, pagination
- Feedback: toast, alert, alert-dialog, dialog, popover, tooltip, sonner
- Data Display: table, card, badge, avatar, progress, skeleton, chart
- Overlays: dropdown-menu, context-menu, sheet, drawer, hover-card
- Media: aspect-ratio, carousel
- Layout: separator, scroll-area, resizable, collapsible
- And more...

---

## Feature Specifications

### Authentication & Authorization

#### Login Flow
1. User enters email and password
2. Form validates input
3. Supabase Auth authenticates user
4. On success:
   - Session created
   - User data fetched
   - Redirect based on role and approval status
5. On failure:
   - Error message displayed
   - User remains on login page

#### Registration Flow
1. User enters email, password, confirm password, name
2. Form validates:
   - Email format
   - Password strength
   - Password match
   - Required fields
3. Supabase Auth creates user
4. User profile created with `pending_approval` status
5. User redirected to `/pending-approval`

#### Session Management
- Sessions persist via Supabase Auth
- Auto-refresh on token expiration
- Logout clears session
- Protected routes check session on mount

#### Role-Based Access Control
- Routes protected by `allowRoles` prop
- Components check user role
- Navigation items filtered by role
- API calls include role context

#### Permission-Based Access Control
- Routes protected by `requiredPermission` prop
- Format: `{ module: string, action: string }`
- Modules: `courses`, `library`, `users`, `quizzes`, `analytics`
- Actions: `read`, `create`, `update`, `delete`, `assign`

### Course Management

#### Course Creation
1. Admin/Teacher navigates to `/admin/courses/new`
2. Fills course form:
   - Title (required)
   - Description (required)
   - Image upload (optional)
   - Categories (multi-select)
3. Submits form
4. Course created in database
5. Redirect to course detail page

#### Course Editing
1. Navigate to `/admin/courses/:courseId/edit`
2. Form pre-filled with course data
3. Edit fields
4. Save updates course
5. Success message displayed

#### Course Modules
1. Navigate to `/admin/courses/:courseId/modules`
2. View existing modules
3. Add new module:
   - Module title
   - Module description
   - Order/sequence
4. Edit module
5. Delete module
6. Reorder modules (drag-and-drop)

#### Course Materials
1. Navigate to `/admin/courses/:courseId/materials`
2. View attached materials
3. Add material:
   - Select from library
   - Or upload new file
4. Remove material

### Content Library

#### Upload Book (PDF)
1. Navigate to `/library/upload`
2. Select "Book" type
3. Upload PDF file
4. Enter title and description
5. Select categories
6. Upload thumbnail (optional, with cropping)
7. Submit
8. Book created in library

#### Upload Video
1. Navigate to `/library/upload`
2. Select "Video" type
3. Upload video file
4. Enter title and description
5. Select categories
6. Upload thumbnail (optional, with cropping)
7. Submit
8. Video created in library

#### View Book
1. Navigate to `/library/book/:id`
2. Book details display
3. PDF viewer loads
4. User can:
   - View PDF
   - Download PDF
   - View related content

#### View Video
1. Navigate to `/library/video/:id`
2. Video details display
3. Video player loads
4. User can:
   - Play video
   - Track progress
   - View related content

### Assignment System

#### Create Assignment
1. Admin/Teacher navigates to `/admin/assignments`
2. Clicks "Create Assignment"
3. Fills form:
   - Title
   - Description
   - Due date
   - Course selection
   - File upload (optional)
4. Submits
5. Assignment created

#### Submit Assignment
1. Student navigates to `/student/assignments`
2. Views assignment details
3. Uploads submission file
4. Submits
5. Status updates to "Submitted"

#### Grade Assignment
1. Teacher/Admin navigates to `/admin/assignments/:assignmentId/submissions`
2. Views submissions list
3. Opens submission
4. Reviews submission
5. Enters grade
6. Submits grade
7. Status updates to "Graded"

### Student Enrollment

#### Enroll Student
1. Admin navigates to `/admin/enrollments`
2. Clicks "Enroll Student"
3. Selects student
4. Selects course
5. Submits
6. Enrollment created
7. Student gains access to course

#### View Enrollments
1. Navigate to `/admin/enrollments`
2. View all enrollments
3. Filter by course or student
4. View enrollment details
5. Remove enrollment (if needed)

### User Management

#### View Users
1. Admin navigates to `/admin/users`
2. Users table displays
3. Search users
4. Filter by role
5. View user details

#### Edit User
1. Click "Edit" on user
2. Edit form opens
3. Update user information
4. Save changes
5. Success message

#### Assign Role
1. Select user
2. Click "Assign Role"
3. Select new role
4. Confirm
5. Role updated

#### Approve User
1. View pending users
2. Click "Approve"
3. User status updated
4. User can now access system

---

## Test Scenarios & Expected Behaviors

### Authentication Tests

#### Test: Login with Valid Credentials
**Steps**:
1. Navigate to `/auth`
2. Enter valid email and password
3. Click "Login"

**Expected**:
- Form validates successfully
- Login succeeds
- User redirected to role-based dashboard
- Session persists

#### Test: Login with Invalid Credentials
**Steps**:
1. Navigate to `/auth`
2. Enter invalid email or password
3. Click "Login"

**Expected**:
- Error message displays
- User remains on login page
- Form clears password field

#### Test: Registration Flow
**Steps**:
1. Navigate to `/auth`
2. Switch to registration
3. Fill form with valid data
4. Submit

**Expected**:
- User created
- Redirected to `/pending-approval`
- Admin can approve user

#### Test: Protected Route Access
**Steps**:
1. Attempt to access `/dashboard` without login

**Expected**:
- Redirected to `/auth`
- After login, redirected to intended route

#### Test: Role-Based Route Access
**Steps**:
1. Login as student
2. Attempt to access `/admin/users`

**Expected**:
- Access denied
- Redirected to appropriate page
- Error message displayed

### Dashboard Tests

#### Test: Admin Dashboard Loads
**Steps**:
1. Login as admin
2. Navigate to `/dashboard/admin`

**Expected**:
- Dashboard loads
- Statistics display
- Recent users show
- Activity feed displays
- Charts render

#### Test: Role-Based Dashboard Redirect
**Steps**:
1. Login as teacher
2. Navigate to `/dashboard`

**Expected**:
- Redirected to `/dashboard/teacher`
- Teacher dashboard displays

### Course Tests

#### Test: Course Listing
**Steps**:
1. Navigate to `/courses`
2. View courses

**Expected**:
- Courses display in grid/list
- Search works
- Filters work
- Clicking course navigates to detail

#### Test: Course Enrollment
**Steps**:
1. Login as student
2. Navigate to course detail
3. Click "Enroll"

**Expected**:
- Enrollment succeeds
- Button changes to "Enrolled"
- Course appears in student dashboard

#### Test: Course Creation
**Steps**:
1. Login as admin
2. Navigate to `/admin/courses/new`
3. Fill form
4. Submit

**Expected**:
- Course created
- Redirected to course detail
- Course appears in listing

### Library Tests

#### Test: Library Content Display
**Steps**:
1. Navigate to `/library`
2. View content

**Expected**:
- Books and videos display
- Search works
- Filters work
- Content cards clickable

#### Test: PDF Upload
**Steps**:
1. Login as admin
2. Navigate to `/library/upload`
3. Select "Book"
4. Upload PDF
5. Fill form
6. Submit

**Expected**:
- Upload succeeds
- Book created
- Appears in library

#### Test: PDF Viewing
**Steps**:
1. Navigate to `/library/book/:id`
2. View book

**Expected**:
- Book details display
- PDF viewer loads
- PDF renders correctly
- Download works

#### Test: Video Viewing
**Steps**:
1. Navigate to `/library/video/:id`
2. View video

**Expected**:
- Video details display
- Video player loads
- Video plays
- Progress tracks

### Form Validation Tests

#### Test: Required Field Validation
**Steps**:
1. Navigate to any form
2. Attempt to submit with empty required fields

**Expected**:
- Form does not submit
- Error messages display
- Fields highlighted

#### Test: Email Validation
**Steps**:
1. Enter invalid email format
2. Submit

**Expected**:
- Validation error displays
- Form does not submit

#### Test: Password Match Validation
**Steps**:
1. Registration form
2. Enter mismatched passwords
3. Submit

**Expected**:
- Error message displays
- Form does not submit

### Error Handling Tests

#### Test: 404 Page
**Steps**:
1. Navigate to invalid route

**Expected**:
- 404 page displays
- Navigation link works

#### Test: Network Error Handling
**Steps**:
1. Disconnect network
2. Attempt API call

**Expected**:
- Error message displays
- User-friendly error shown
- Retry option available

#### Test: Permission Denied
**Steps**:
1. Access route without permission

**Expected**:
- Access denied message
- Redirected appropriately

---

## Integration Points

### Supabase Integration

#### Authentication
- **Service**: Supabase Auth
- **Endpoints**: `/auth/v1/token`, `/auth/v1/user`
- **Features**: Email/password auth, session management, user management

#### Database
- **Service**: Supabase PostgreSQL
- **Tables**: users, courses, enrollments, library_content, assignments, etc.
- **Features**: CRUD operations, relationships, real-time subscriptions

#### Storage
- **Service**: Supabase Storage
- **Buckets**: `course-images`, `library-content`, `thumbnails`, `assignments`
- **Features**: File upload, download, public/private access

#### Real-time
- **Service**: Supabase Realtime
- **Features**: Live updates for courses, enrollments, assignments

### React Query Integration

#### Data Fetching
- **Hooks**: `useQuery`, `useMutation`, `useInfiniteQuery`
- **Features**: Caching, refetching, optimistic updates

#### Cache Management
- **Strategy**: Stale-while-revalidate
- **Invalidation**: On mutations
- **Time**: 5 minutes default

### External Libraries

#### PDF.js
- **Purpose**: PDF rendering
- **Integration**: PDFViewer component
- **Features**: Page navigation, zoom, download

#### React Easy Crop
- **Purpose**: Image cropping
- **Integration**: ImageCropper component
- **Features**: Crop, zoom, rotate

#### Date-fns
- **Purpose**: Date formatting
- **Integration**: Throughout application
- **Features**: Format, parse, manipulate dates

---

## Data Requirements

### Test Data Needed

#### Users
- **Super Admin**: 1 user
- **Admin**: 2-3 users
- **Teacher**: 3-5 users
- **Student**: 10-20 users
- **Guardian**: 5-10 users
- **Pending**: 2-3 users

#### Courses
- **Active Courses**: 5-10 courses
- **Draft Courses**: 2-3 courses
- **Categories**: 5-8 categories
- **Modules per Course**: 3-5 modules
- **Lessons per Module**: 2-4 lessons

#### Library Content
- **Books (PDF)**: 10-15 books
- **Videos**: 10-15 videos
- **Thumbnails**: For all content

#### Assignments
- **Active Assignments**: 5-10 assignments
- **Submissions**: 20-30 submissions
- **Graded**: 10-15 graded submissions

#### Enrollments
- **Student Enrollments**: 20-30 enrollments
- **Multiple enrollments per student**: Yes

### Database State

#### Required Tables
- `users` - User accounts
- `profiles` - User profiles
- `courses` - Course data
- `course_modules` - Course modules
- `lessons` - Lesson data
- `enrollments` - Student enrollments
- `library_content` - Library items
- `assignments` - Assignments
- `submissions` - Assignment submissions
- `categories` - Content categories
- `permissions` - Permission matrix

#### Relationships
- Users → Profiles (1:1)
- Users → Enrollments (1:many)
- Courses → Modules (1:many)
- Modules → Lessons (1:many)
- Courses → Enrollments (1:many)
- Users → Submissions (1:many)
- Assignments → Submissions (1:many)

---

## Edge Cases & Error Handling

### Authentication Edge Cases

#### Expired Session
- **Scenario**: User session expires
- **Expected**: Redirect to login, show message

#### Invalid Token
- **Scenario**: Token corrupted
- **Expected**: Clear session, redirect to login

#### Concurrent Logins
- **Scenario**: User logs in from multiple devices
- **Expected**: Both sessions valid, or latest session wins

### Data Edge Cases

#### Empty States
- **Scenario**: No courses, no content, no users
- **Expected**: Empty state message, helpful CTAs

#### Large Datasets
- **Scenario**: 1000+ courses, 5000+ users
- **Expected**: Pagination, search, filters work

#### Missing Data
- **Scenario**: Course without image, user without avatar
- **Expected**: Placeholder images display

### Form Edge Cases

#### Long Input
- **Scenario**: Very long title/description
- **Expected**: Validation limits, truncation

#### Special Characters
- **Scenario**: Input with special characters
- **Expected**: Proper encoding, no XSS

#### File Size Limits
- **Scenario**: Upload very large file
- **Expected**: Validation error, clear message

### Network Edge Cases

#### Slow Connection
- **Scenario**: Slow network
- **Expected**: Loading states, progress indicators

#### Intermittent Connection
- **Scenario**: Connection drops during operation
- **Expected**: Error message, retry option

#### Timeout
- **Scenario**: Request times out
- **Expected**: Timeout error, retry option

---

## Performance Requirements

### Page Load Times
- **Initial Load**: < 2 seconds
- **Route Navigation**: < 500ms
- **Data Fetch**: < 1 second
- **Image Load**: < 2 seconds

### Component Rendering
- **Dashboard**: < 1 second
- **Course List**: < 800ms
- **Library Grid**: < 1 second

### File Operations
- **PDF Load**: < 3 seconds
- **Video Load**: < 5 seconds
- **Image Upload**: < 10 seconds (depending on size)

### Optimization Strategies
- Code splitting
- Lazy loading
- Image optimization
- Caching
- Memoization

---

## Accessibility Requirements

### WCAG 2.1 Compliance
- **Level**: AA minimum
- **Keyboard Navigation**: All features accessible via keyboard
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: Minimum 4.5:1 ratio
- **Focus Indicators**: Visible focus states

### Keyboard Navigation
- **Tab Order**: Logical tab sequence
- **Shortcuts**: Common shortcuts supported
- **Focus Management**: Proper focus handling

### Screen Reader Support
- **ARIA Labels**: All interactive elements labeled
- **Landmarks**: Proper page structure
- **Alt Text**: Images have alt text

### Visual Accessibility
- **Color Blindness**: Not relying solely on color
- **Text Size**: Scalable text
- **Spacing**: Adequate spacing

---

## Security Requirements

### Authentication Security
- **Password Strength**: Minimum requirements enforced
- **Session Management**: Secure session handling
- **Token Storage**: Secure token storage

### Authorization Security
- **Role Verification**: Server-side role checks
- **Permission Checks**: Server-side permission validation
- **Route Protection**: Client and server-side protection

### Data Security
- **Input Validation**: All inputs validated
- **XSS Prevention**: Proper escaping
- **CSRF Protection**: CSRF tokens
- **SQL Injection**: Parameterized queries

### File Upload Security
- **File Type Validation**: Only allowed types
- **File Size Limits**: Size restrictions
- **Virus Scanning**: (If applicable)
- **Storage Security**: Secure file storage

---

## Test Execution Guidelines for TestSprite

### Pre-Test Setup
1. **Start Development Server**: `npm run dev` (port 8080)
2. **Verify Environment**: Check `.env` file has Supabase credentials
3. **Seed Test Data**: Ensure test data exists in database
4. **Clear Browser Cache**: Start with clean state

### Test Execution Order
1. **Static Analysis**: Analyze codebase structure
2. **Accessibility Tests**: Check route accessibility
3. **Authentication Tests**: Test login/registration
4. **Component Tests**: Test UI components
5. **Functional Tests**: Test user flows
6. **Integration Tests**: Test API integrations
7. **Performance Tests**: Check load times
8. **Accessibility Tests**: WCAG compliance

### Test Credentials
Create test users for each role:
- **Super Admin**: `superadmin@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`
- **Teacher**: `teacher@test.com` / `password123`
- **Student**: `student@test.com` / `password123`
- **Guardian**: `guardian@test.com` / `password123`

### Test Coverage Goals
- **Routes**: 100% of routes tested
- **Components**: 80%+ component coverage
- **User Flows**: All critical flows tested
- **Edge Cases**: Major edge cases covered
- **Error Handling**: All error scenarios tested

### Reporting Requirements
- **Test Results**: Pass/fail for each test
- **Screenshots**: For failed tests
- **Error Messages**: Detailed error information
- **Coverage Report**: Code coverage metrics
- **Performance Metrics**: Load time data
- **Accessibility Report**: WCAG compliance status

---

## Additional Notes for TestSprite

### Important Considerations
1. **Authentication Required**: Most routes require authentication
2. **Role-Specific Access**: Test with different user roles
3. **Permission-Based Access**: Some routes require specific permissions
4. **Database State**: Some tests require existing data
5. **File Uploads**: Test with actual files
6. **Real-time Features**: May require active connections

### Known Limitations
1. **Pending Approval**: New users need admin approval
2. **Library Access**: Students need library access permission
3. **Course Enrollment**: Students must be enrolled to access course content
4. **File Dependencies**: PDF/Video viewing requires actual files

### Test Priorities
1. **Critical**: Authentication, route protection, core user flows
2. **High**: Course management, library, assignments
3. **Medium**: Dashboards, profiles, search/filter
4. **Low**: Advanced features, admin tools

---

## Conclusion

This PRD provides comprehensive information about the EDulearn application for TestSprite MCP to generate and execute comprehensive automated tests. All routes, components, features, and expected behaviors are documented to ensure thorough test coverage and bug detection.

**For TestSprite Execution**:
- Use this PRD to understand application structure
- Reference `testsprite.config.json` for test configuration
- Execute tests against `http://localhost:8080`
- Generate comprehensive test reports
- Focus on critical user flows and edge cases

---

**Document Version**: 2.0  
**Last Updated**: 2024  
**Maintained By**: Development Team  
**For**: TestSprite MCP Automated Testing


