# Product Requirements Document (PRD)
## EDulearn - SmartLearn MVP

**Version**: 2.0  
**Last Updated**: 2024  
**Project Type**: E-Learning Platform  
**Target Audience**: Educational Institutions

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technology Stack](#technology-stack)
4. [Application Architecture](#application-architecture)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Permission System](#permission-system)
7. [Core Features](#core-features)
8. [Complete Route Mapping](#complete-route-mapping)
9. [Component Architecture](#component-architecture)
10. [User Flows](#user-flows)
11. [Data Models](#data-models)
12. [API & Integration](#api--integration)
13. [Business Logic](#business-logic)
14. [UI/UX Requirements](#uiux-requirements)
15. [Performance Requirements](#performance-requirements)
16. [Security Requirements](#security-requirements)
17. [Testing Strategy](#testing-strategy)
18. [Deployment & Environment](#deployment--environment)

---

## Executive Summary

### Project Vision
EDulearn is a comprehensive e-learning platform designed to modernize educational delivery for institutions. It provides a complete solution for course management, content delivery, student engagement, and administrative oversight.

### Key Objectives
1. **Centralized Learning Management**: Unified platform for courses, content, and assignments
2. **Role-Based Access Control**: Granular permissions for different user types
3. **Content Management**: Rich media library with PDF and video support
4. **Student Engagement**: Interactive dashboards, progress tracking, and assignments
5. **Administrative Control**: Comprehensive user and content management tools

### Success Metrics
- User adoption rate across all roles
- Course completion rates
- Content library utilization
- Assignment submission rates
- System performance and uptime

---

## Project Overview

### Problem Statement
Educational institutions need a modern, scalable platform to:
- Manage courses and curriculum efficiently
- Deliver multimedia content to students
- Track student progress and engagement
- Facilitate assignment submission and grading
- Provide role-based access for different stakeholders

### Solution Overview
EDulearn provides a full-featured Learning Management System (LMS) with:
- **Multi-role Support**: 5 distinct user roles with tailored experiences
- **Course Management**: Complete lifecycle from creation to delivery
- **Content Library**: Centralized repository for educational materials
- **Assignment System**: End-to-end assignment workflow
- **Analytics & Reporting**: Insights for administrators and teachers
- **Permission-Based Access**: Fine-grained control over features

### Target Users
- **Students**: Primary learners accessing courses and content
- **Teachers**: Content creators and course facilitators
- **Administrators**: System managers and content curators
- **Super Admins**: System configuration and advanced management
- **Guardians**: Parents/guardians monitoring student progress

---

## Technology Stack

### Frontend Technologies

#### Core Framework
- **React**: 18.3.1 (Latest stable)
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router DOM**: v6 for client-side routing

#### UI Framework
- **shadcn-ui**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Radix UI Primitives**: Accessible component primitives

#### State Management
- **TanStack Query (React Query)**: Server state management
  - Caching and synchronization
  - Optimistic updates
  - Background refetching
- **React Context API**: Theme and authentication state

#### Form Management
- **React Hook Form**: Performant form handling
- **Zod**: Schema validation
- **Type-safe form validation**

#### Media Handling
- **PDF.js**: PDF rendering and viewing
- **react-easy-crop**: Image cropping functionality
- **HTML5 Video API**: Video playback

#### Utilities
- **date-fns**: Date manipulation and formatting
- **React Router**: Navigation and route protection

### Backend Technologies

#### Database & Backend
- **Supabase**: Backend-as-a-Service
  - **PostgreSQL**: Relational database
  - **Supabase Auth**: Authentication service
  - **Supabase Storage**: File storage
  - **Supabase Realtime**: Real-time subscriptions

#### Database Features
- Row Level Security (RLS) policies
- Database functions and triggers
- Real-time subscriptions
- Full-text search capabilities

### Development Tools
- **Node.js**: Runtime environment
- **npm/yarn**: Package management
- **ESLint**: Code linting
- **TypeScript Compiler**: Type checking

### Development Server
- **Port**: 8080
- **Hot Module Replacement**: Enabled
- **Source Maps**: Enabled for debugging

---

## Application Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── course/         # Course-specific components
│   ├── library/        # Library-specific components
│   ├── permissions/     # Permission management components
│   └── ui/             # shadcn-ui base components
├── pages/              # Page components (routes)
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

### Architecture Patterns

#### Component Architecture
- **Atomic Design**: Components organized by complexity
- **Container/Presentational**: Separation of logic and presentation
- **Composition**: Reusable components composed together

#### State Management Strategy
- **Server State**: React Query for API data
- **Client State**: React Context for theme/auth
- **Form State**: React Hook Form for form data
- **URL State**: React Router for route parameters

#### Data Flow
1. User interaction triggers action
2. Component calls React Query hook
3. Query fetches from Supabase
4. Data cached and displayed
5. Optimistic updates for mutations

### Authentication Flow

#### Login Process
1. User navigates to `/auth`
2. Enters email and password
3. Form validates input (Zod schema)
4. Supabase Auth authenticates credentials
5. On success:
   - Session token stored
   - User profile fetched
   - Role and permissions loaded
   - Redirect based on role and approval status
6. On failure:
   - Error message displayed
   - User remains on login page

#### Registration Process
1. User navigates to `/auth` and switches to registration
2. Enters: email, password, confirm password, name
3. Form validates:
   - Email format
   - Password strength (min 8 characters)
   - Password match
   - Required fields
4. Supabase Auth creates user account
5. User profile created with:
   - `pending_approval` status
   - Default role: `student` (if migration applied)
6. User redirected to `/pending-approval`
7. Admin must approve before access granted

#### Session Management
- **Token Storage**: Secure HTTP-only cookies (via Supabase)
- **Auto-Refresh**: Automatic token refresh before expiration
- **Session Persistence**: Survives page reloads
- **Logout**: Clears session and redirects to `/auth`

### Route Protection System

#### Protection Levels
1. **Public Routes**: No authentication required (`/`, `/auth`)
2. **Authenticated Routes**: Require valid session
3. **Role-Based Routes**: Require specific role(s)
4. **Permission-Based Routes**: Require specific module + action permission

#### Protection Implementation
- **Component**: `ProtectedRoute` wrapper
- **Checks**:
  - Authentication status
  - User role (if `allowRoles` specified)
  - Module permissions (if `requiredPermission` specified)
- **Actions**:
  - Redirect to `/auth` if not authenticated
  - Redirect to appropriate dashboard if role mismatch
  - Show access denied if permission missing

---

## User Roles & Permissions

### Role Hierarchy

```
Super Admin (Highest)
    ↓
Admin
    ↓
Teacher
    ↓
Student / Guardian (Equal, different purposes)
```

### 1. Super Admin

**Role Identifier**: `super_admin`  
**Access Level**: Unlimited system access

#### Capabilities
- **System Configuration**: Full system settings control
- **User Management**: Create, edit, delete any user
- **Role Assignment**: Assign any role to any user
- **Permission Management**: Grant/revoke any permission
- **Database Access**: Bypass all RLS policies
- **Module Management**: Create and configure modules
- **System Monitoring**: Access to all analytics and logs

#### Dashboard
- **Route**: `/dashboard/admin` or `/dashboard/super_admin`
- **Features**:
  - System health monitoring
  - User activity overview
  - Performance metrics
  - Super admin management panel

#### Key Routes Access
- All admin routes
- `/admin/super` - Super admin management
- `/admin/system-monitoring` - System monitoring
- All other routes (bypasses restrictions)

#### Special Privileges
- Can assign `super_admin` role to others
- Can assign `admin` role to others
- Can manage all permissions
- Can access all data regardless of RLS policies

### 2. Admin

**Role Identifier**: `admin`  
**Access Level**: Administrative access with permission-based restrictions

#### Capabilities
- **Course Management**: Create, edit, delete courses
- **User Management**: View, edit, assign roles (except admin/super_admin)
- **Content Library**: Full library management
- **Category Management**: Create and manage categories
- **Assignment Management**: Create and manage assignments
- **Enrollment Management**: Enroll students in courses
- **Content Assignments**: Assign library content to courses
- **System Monitoring**: View analytics and reports

#### Dashboard
- **Route**: `/dashboard/admin`
- **Features**:
  - Statistics cards (users, courses, enrollments, library)
  - Recent users section
  - Recent activity feed
  - System health indicators
  - Quick action buttons
  - Charts (growth, role distribution)

#### Key Routes Access
- `/admin/courses/new` - Create courses (with permission)
- `/admin/users` - User management (with permission)
- `/admin/categories` - Category management (with permission)
- `/admin/assignments` - Assignment management (with permission)
- `/admin/enrollments` - Enrollment management (with permission)
- `/admin/content-assignments` - Content assignments (with permission)
- `/admin/system-monitoring` - System monitoring (with permission)

#### Role Assignment Restrictions
- **Can Assign**: `teacher`, `student`, `guardian`
- **Cannot Assign**: `admin`, `super_admin` (prevents privilege escalation)

#### Permission Requirements
- All actions require specific module permissions
- Without permissions, admin cannot perform actions
- Permissions stored in `user_module_permissions` table

### 3. Teacher

**Role Identifier**: `teacher`  
**Access Level**: Course and student management

#### Capabilities
- **Course Content**: Create and manage course content
- **Lesson Management**: Create, edit, delete lessons
- **Material Upload**: Upload course materials
- **Student Management**: View and manage assigned students
- **Assignment Grading**: Grade student submissions
- **Progress Tracking**: Monitor student progress
- **Attendance Management**: Track student attendance
- **Course Creation**: Create courses (if permission granted)

#### Dashboard
- **Route**: `/dashboard/teacher`
- **Features**:
  - My courses section
  - Student management quick action
  - Recent activity
  - Course statistics
  - Quick actions

#### Key Routes Access
- `/teacher/courses/:courseId/lessons` - Lesson management
- `/teacher/students` - Assigned students
- `/teacher/courses/:courseId/attendance` - Attendance management
- `/admin/courses/new` - Create courses (if permission granted)
- `/library/upload` - Upload content (if permission granted)
- `/admin/assignments` - Assignment management (if permission granted)

#### Assignment-Based Access
- Teachers see only assigned students
- Teachers manage only assigned courses
- Access controlled by teacher-student relationships

### 4. Student

**Role Identifier**: `student`  
**Access Level**: Learning and course access

#### Capabilities
- **Course Browsing**: Browse all available courses
- **Course Enrollment**: Enroll in courses (if allowed)
- **Content Access**: Access enrolled course content
- **Video Viewing**: Watch video lessons with progress tracking
- **Material Download**: Download course materials
- **Assignment Submission**: Submit assignments
- **Progress Tracking**: View own learning progress
- **Teacher Contact**: View assigned teachers and contact info
- **Library Access**: Access library (if permission granted)

#### Dashboard
- **Route**: `/dashboard/student`
- **Features**:
  - Enrolled courses
  - Assigned teachers section
  - Library access status
  - Recent activity
  - Progress tracking
  - Upcoming assignments

#### Key Routes Access
- `/courses` - Browse courses
- `/courses/:courseId` - Course details
- `/student/assignments` - View and submit assignments
- `/library` - Access library (if granted)
- `/library/book/:id` - View books (if granted)
- `/library/video/:id` - View videos (if granted)

#### Enrollment Requirements
- Students must be enrolled to access course content
- Enrollment can be:
  - Self-enrollment (if course allows)
  - Admin/Teacher enrollment
  - Automatic (based on rules)

### 5. Guardian

**Role Identifier**: `guardian`  
**Access Level**: Monitoring and viewing only

#### Capabilities
- **Student Monitoring**: View linked students' progress
- **Course Overview**: See enrolled courses
- **Progress Reports**: Access student progress reports
- **Assignment Status**: View assignment completion status
- **Read-Only Access**: No editing capabilities

#### Dashboard
- **Route**: `/dashboard/guardian`
- **Features**:
  - Linked students list
  - Student progress overview
  - Course enrollment status
  - Assignment completion status
  - Progress charts

#### Key Routes Access
- Limited to viewing student data
- No creation or editing capabilities
- Access controlled by guardian-student relationships

---

## Permission System

### Permission Architecture

The application uses a **two-tier permission system**:
1. **Role-Based Access Control (RBAC)**: High-level role assignments
2. **Module-Based Permissions**: Fine-grained feature access

### Permission Modules

#### Available Modules
1. **`courses`**: Course management
2. **`lessons`**: Lesson content management
3. **`users`**: User management
4. **`analytics`**: Analytics and reporting
5. **`library`**: E-Library content (books & videos)
6. **`quizzes`**: Quiz and assignment management
7. **`certificates`**: Certificate generation
8. **`comments`**: Comments and ratings
9. **`enrollments`**: Course enrollment management

### Permission Actions

Each module supports these actions:
- **`create`**: Create new resources
- **`read`**: View resources
- **`update`**: Edit existing resources
- **`delete`**: Remove resources
- **`assign`**: Assign resources to users/courses
- **`approve`**: Approve pending requests

### Permission Storage

#### Database Tables
1. **`modules`**: Available permission modules
2. **`user_module_permissions`**: User-specific permissions
3. **`role_module_permissions`**: Role-based default permissions

#### Permission Check Flow
1. Check if user is super_admin (has all permissions)
2. Check user-specific permissions in `user_module_permissions`
3. Check role-based permissions in `role_module_permissions`
4. Return permission result

### Permission Examples

#### Example 1: Course Creation
```typescript
// Route protection
<ProtectedRoute 
  allowRoles={['admin', 'teacher']}
  requiredPermission={{ module: 'courses', action: 'create' }}
>
  <CreateCourse />
</ProtectedRoute>
```

#### Example 2: Library Upload
```typescript
// Route protection
<ProtectedRoute 
  allowRoles={['admin', 'teacher']}
  requiredPermission={{ module: 'library', action: 'create' }}
>
  <UploadContent />
</ProtectedRoute>
```

### Permission Inheritance

- **Role Permissions**: Users inherit permissions from their roles
- **User Permissions**: Can override role permissions
- **Super Admin**: Bypasses all permission checks

---

## Core Features

### 1. Authentication & Authorization

#### Login System
- **Method**: Email and password authentication
- **Provider**: Supabase Auth
- **Features**:
  - Email validation
  - Password strength requirements
  - Remember me functionality
  - Session persistence
  - Auto token refresh

#### Registration System
- **Fields**: Email, password, confirm password, full name
- **Validation**: Client-side with Zod schemas
- **Process**:
  1. User submits registration form
  2. Account created in Supabase Auth
  3. User profile created with `pending_approval` status
  4. Default role assigned (usually `student`)
  5. Redirect to pending approval page
  6. Admin approval required for access

#### Session Management
- **Token Storage**: Secure HTTP-only cookies
- **Refresh Strategy**: Automatic before expiration
- **Session Duration**: Configurable (default: 7 days)
- **Multi-Device**: Supports concurrent sessions

#### Pending Approval Workflow
- New users see pending approval message
- Admin receives notification (if implemented)
- Admin approves/rejects from user management
- Approved users gain full access
- Rejected users remain blocked

### 2. Dashboard System

#### Role-Based Dashboards

**Admin Dashboard** (`/dashboard/admin`)
- **Statistics Cards**:
  - Total Users
  - Total Courses
  - Total Enrollments
  - Library Uploads
  - Pending Approvals
- **Recent Users**: Last 6 registered users
- **Recent Activity**: System activity feed
- **System Health**: Performance indicators
- **Charts**:
  - User growth over time
  - Role distribution (pie chart)
- **Quick Actions**:
  - Create Course
  - Manage Users
  - View Library
  - System Monitoring

**Teacher Dashboard** (`/dashboard/teacher`)
- **My Courses**: Courses assigned to teacher
- **Student Management**: Link to assigned students
- **Recent Activity**: Course and student updates
- **Quick Actions**:
  - Create Course (if permission)
  - Manage Lessons
  - View Students
  - Upload Content

**Student Dashboard** (`/dashboard/student`)
- **Enrolled Courses**: Courses student is enrolled in
- **Assigned Teachers**: Teachers linked to student
- **Library Access Status**: Current library access state
- **Progress Tracking**: Learning progress overview
- **Upcoming Assignments**: Pending assignments
- **Recent Activity**: Course updates and notifications

**Guardian Dashboard** (`/dashboard/guardian`)
- **Linked Students**: Students guardian is linked to
- **Student Progress**: Progress overview for each student
- **Course Enrollments**: Enrolled courses per student
- **Assignment Status**: Completion status
- **Progress Reports**: Detailed progress information

#### Dashboard Features
- **Real-time Updates**: Live data via Supabase Realtime
- **Responsive Design**: Mobile-friendly layouts
- **Theme Support**: Dark/light mode
- **Quick Navigation**: Direct links to key features

### 3. Course Management

#### Course Lifecycle

**1. Course Creation**
- **Access**: Admin, Teacher (with permission)
- **Route**: `/admin/courses/new`
- **Process**:
  1. Fill course form:
     - Title (required)
     - Description (required)
     - Image upload (optional)
     - Categories (multi-select)
     - Status (draft/published)
  2. Submit form
  3. Course created in database
  4. Redirect to course detail page

**2. Course Editing**
- **Access**: Admin, Teacher (with permission)
- **Route**: `/admin/courses/:courseId/edit`
- **Features**:
  - Edit all course fields
  - Update course image
  - Modify categories
  - Change status

**3. Course Modules Management**
- **Access**: Admin (with permission)
- **Route**: `/admin/courses/:courseId/modules`
- **Features**:
  - View all modules
  - Add new module
  - Edit module details
  - Reorder modules (drag-and-drop)
  - Delete modules

**4. Course Materials Management**
- **Access**: Admin, Teacher (with permission)
- **Route**: `/admin/courses/:courseId/materials`
- **Features**:
  - View attached materials
  - Attach library content
  - Upload new materials
  - Remove materials
  - Reorder materials

**5. Course Wizard**
- **Access**: Admin (with permission)
- **Route**: `/admin/course-wizard`
- **Features**:
  - Multi-step course creation
  - Step-by-step guidance
  - Progress indicator
  - Save draft functionality

#### Course Detail Page
- **Route**: `/courses/:courseId`
- **Sections**:
  - **Course Header**: Title, image, description
  - **Course Overview**: Detailed information
  - **Curriculum**: Modules and lessons
  - **Resources**: Course materials
  - **Reviews**: Student reviews and ratings
  - **Enrolled Students**: (for teachers/admins)

#### Course Listing
- **Route**: `/courses`
- **Features**:
  - Grid/list view toggle
  - Search functionality
  - Category filtering
  - Sort options
  - Pagination (if needed)
  - Course cards with:
    - Thumbnail
    - Title
    - Description
    - Categories
    - Enrollment status

#### Enrollment Process
- **Self-Enrollment**: Students can enroll if course allows
- **Admin Enrollment**: Admin enrolls students
- **Teacher Enrollment**: Teachers enroll students in their courses
- **Bulk Enrollment**: Enroll multiple students at once

### 4. Content Library

#### Library Overview
- **Route**: `/library`
- **Content Types**:
  - **Books**: PDF documents
  - **Videos**: Video files
- **Features**:
  - Search functionality
  - Category filtering
  - Content type filtering
  - Grid/list view
  - Pagination

#### Content Upload
- **Access**: Admin, Teacher (with permission)
- **Route**: `/library/upload`
- **Process**:
  1. Select content type (book/video)
  2. Upload file:
     - **Books**: PDF files
     - **Videos**: MP4, WebM, etc.
  3. Fill metadata:
     - Title (required)
     - Description
     - Categories (multi-select)
  4. Upload thumbnail:
     - Optional for books
     - Required for videos
     - Image cropping available
  5. Submit
  6. Content created and available in library

#### Book Viewing
- **Route**: `/library/book/:id`
- **Features**:
  - Book information display
  - PDF viewer with:
    - Page navigation
    - Zoom controls
    - Download option
  - Related content suggestions
  - Category tags

#### Video Viewing
- **Route**: `/library/video/:id`
- **Features**:
  - Video information display
  - Video player with:
    - Playback controls
    - Progress tracking
    - Fullscreen mode
    - Quality selection (if available)
  - Resume from last position
  - Related content suggestions

#### Thumbnail Management
- **Generation**: Automatic for videos
- **Upload**: Manual for books
- **Cropping**: Image cropper tool
- **Storage**: Supabase Storage

### 5. Assignment System

#### Assignment Creation
- **Access**: Admin, Teacher (with permission)
- **Route**: `/admin/assignments`
- **Process**:
  1. Click "Create Assignment"
  2. Fill form:
     - Title (required)
     - Description
     - Due date
     - Course selection
     - File attachments (optional)
  3. Submit
  4. Assignment created and visible to students

#### Assignment Submission
- **Access**: Students
- **Route**: `/student/assignments`
- **Process**:
  1. View assignment details
  2. Upload submission file
  3. Add comments (optional)
  4. Submit
  5. Status updates to "Submitted"
  6. Teacher notified (if implemented)

#### Assignment Grading
- **Access**: Teacher, Admin (with permission)
- **Route**: `/admin/assignments/:assignmentId/submissions`
- **Process**:
  1. View submissions list
  2. Open submission
  3. Review submitted work
  4. Enter grade
  5. Add feedback (optional)
  6. Submit grade
  7. Status updates to "Graded"
  8. Student notified (if implemented)

#### Assignment Management
- **View All**: List all assignments
- **Filter**: By course, status, due date
- **Edit**: Modify assignment details
- **Delete**: Remove assignments
- **View Submissions**: See all submissions for an assignment

### 6. User Management

#### User List
- **Access**: Admin, Super Admin
- **Route**: `/admin/users`
- **Features**:
  - User table with:
    - Name
    - Email
    - Role
    - Status (active/pending)
    - Registration date
  - Search functionality
  - Filter by role
  - Sort options
  - Pagination

#### User Actions
- **Edit User**: Modify user information
- **Assign Role**: Change user role
- **Grant Permissions**: Assign module permissions
- **Approve User**: Approve pending users
- **Deactivate User**: Disable user account

#### Profile Management
- **Route**: `/profile`
- **Features**:
  - View profile information
  - Edit profile:
    - Name
    - Email
    - Avatar
    - Bio (if implemented)
  - Change password
  - View permissions

#### Profile Completion
- **Route**: `/profile-completion`
- **Purpose**: Complete required profile fields
- **Process**:
  1. Check if profile incomplete
  2. Show completion form
  3. Collect required information
  4. Save profile
  5. Redirect to dashboard

### 7. Enrollment Management

#### Enrollment Overview
- **Access**: Admin (with permission)
- **Route**: `/admin/enrollments`
- **Features**:
  - View all enrollments
  - Filter by course or student
  - Search functionality
  - Enrollment statistics

#### Enrollment Actions
- **Enroll Student**: Manually enroll student in course
- **Bulk Enrollment**: Enroll multiple students
- **Remove Enrollment**: Unenroll student
- **View Enrollment Details**: See enrollment information

#### Student Enrollment System
- **Access**: Admin
- **Route**: `/admin/student-enrollment`
- **Features**:
  - Student list with performance metrics
  - Detailed student profile view
  - Performance analytics charts
  - Course progress tracking
  - Library access status display
  - Search functionality

### 8. Category Management

#### Category Overview
- **Access**: Admin (with permission)
- **Route**: `/admin/categories`
- **Features**:
  - View all categories
  - Category hierarchy (if implemented)
  - Category usage statistics

#### Category Actions
- **Create Category**: Add new category
- **Edit Category**: Modify category details
- **Delete Category**: Remove category (if no content uses it)
- **Assign to Content**: Link categories to courses/content

### 9. Content Assignments

#### Assignment Overview
- **Access**: Admin (with permission)
- **Route**: `/admin/content-assignments`
- **Purpose**: Assign library content to courses
- **Features**:
  - Select course
  - Select library content
  - Assign content to course
  - View assigned content
  - Remove assignments

### 10. System Monitoring

#### Monitoring Dashboard
- **Access**: Admin, Super Admin (with permission)
- **Route**: `/admin/system-monitoring`
- **Features**:
  - System metrics
  - Performance charts
  - Error logs
  - User activity
  - Database statistics

### 11. Super Admin Management

#### Super Admin Panel
- **Access**: Super Admin only
- **Route**: `/admin/super`
- **Features**:
  - System configuration
  - Advanced user management
  - Permission matrix management
  - Module configuration
  - System settings

### 12. Site Content Management

#### CMS Features
- **Access**: Admin (with permission)
- **Route**: `/admin/site-content`
- **Features**:
  - Landing page content editor
  - Theme management
  - Page sections management
  - Site settings

---

## Complete Route Mapping

### Public Routes

#### `/` - Landing Page
- **Component**: `Landing.tsx`
- **Access**: Public
- **Purpose**: Marketing/landing page
- **Features**:
  - Hero section
  - Feature highlights
  - Call-to-action buttons
  - Navigation to auth

#### `/auth` - Authentication
- **Component**: `Auth.tsx`
- **Access**: Public
- **Purpose**: User login and registration
- **Features**:
  - Login form
  - Registration form
  - Form validation
  - Error handling
  - Toggle between login/register

### Protected Routes (Require Authentication)

#### `/dashboard` - Main Dashboard
- **Component**: `Dashboard.tsx`
- **Access**: Authenticated
- **Purpose**: Redirects to role-specific dashboard
- **Behavior**: Redirects based on user role

#### `/dashboard/admin` - Admin Dashboard
- **Component**: `AdminDashboard.tsx`
- **Access**: `super_admin`, `admin`
- **Purpose**: Administrative overview

#### `/dashboard/teacher` - Teacher Dashboard
- **Component**: `TeacherDashboard.tsx`
- **Access**: `teacher`
- **Purpose**: Teacher overview

#### `/dashboard/student` - Student Dashboard
- **Component**: `StudentDashboard.tsx`
- **Access**: `student`
- **Purpose**: Student learning overview

#### `/dashboard/guardian` - Guardian Dashboard
- **Component**: `GuardianDashboard.tsx`
- **Access**: `guardian`
- **Purpose**: Monitor student progress

#### `/courses` - Course Listing
- **Component**: `Courses.tsx`
- **Access**: Authenticated
- **Purpose**: Browse all courses

#### `/courses/:courseId` - Course Detail
- **Component**: `CourseDetail.tsx`
- **Access**: Authenticated
- **Purpose**: View course details and content

#### `/library` - Content Library
- **Component**: `Library.tsx`
- **Access**: Authenticated (with library permission)
- **Purpose**: Browse library content

#### `/library/upload` - Upload Content
- **Component**: `UploadContent.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `library.create` permission)
- **Purpose**: Upload books and videos

#### `/library/book/:id` - Book Detail
- **Component**: `BookDetail.tsx`
- **Access**: Authenticated (with library access)
- **Purpose**: View PDF book

#### `/library/video/:id` - Video Detail
- **Component**: `VideoDetail.tsx`
- **Access**: Authenticated (with library access)
- **Purpose**: View video content

#### `/profile` - User Profile
- **Component**: `Profile.tsx`
- **Access**: Authenticated
- **Purpose**: View and edit profile

#### `/profile-completion` - Profile Completion
- **Component**: `ProfileCompletion.tsx`
- **Access**: Authenticated (redirected if incomplete)
- **Purpose**: Complete required profile fields

#### `/pending-approval` - Pending Approval
- **Component**: `PendingApproval.tsx`
- **Access**: Authenticated (pending users)
- **Purpose**: Inform users they need approval

### Admin Routes

#### `/admin/courses/new` - Create Course
- **Component**: `CreateCourse.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `courses.create` permission)
- **Purpose**: Create new course

#### `/admin/courses/:courseId/edit` - Edit Course
- **Component**: `EditCourse.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `courses.update` permission)
- **Purpose**: Edit existing course

#### `/admin/courses/:courseId/materials` - Course Materials
- **Component**: `CourseMaterials.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `courses.update` permission)
- **Purpose**: Manage course materials

#### `/admin/courses/:courseId/modules` - Course Modules
- **Component**: `CourseModules.tsx`
- **Access**: `super_admin`, `admin` (with `courses.update` permission)
- **Purpose**: Manage course modules/curriculum

#### `/admin/users` - User Management
- **Component**: `UserManagement.tsx`
- **Access**: `super_admin`, `admin` (with `users.read` permission)
- **Purpose**: Manage all users

#### `/admin/categories` - Category Management
- **Component**: `CategoryManagement.tsx`
- **Access**: `super_admin`, `admin` (with `library.read` permission)
- **Purpose**: Manage content categories

#### `/admin/content-assignments` - Content Assignments
- **Component**: `ContentAssignments.tsx`
- **Access**: `super_admin`, `admin` (with `courses.assign` permission)
- **Purpose**: Assign library content to courses

#### `/admin/enrollments` - Enrollment Management
- **Component**: `EnrollmentManagement.tsx`
- **Access**: `super_admin`, `admin` (with `courses.assign` permission)
- **Purpose**: Manage student enrollments

#### `/admin/assignments` - Assignment Management
- **Component**: `AssignmentManagement.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `quizzes.read` permission)
- **Purpose**: Manage assignments

#### `/admin/assignments/:assignmentId/submissions` - Assignment Submissions
- **Component**: `AssignmentSubmissions.tsx`
- **Access**: `super_admin`, `admin`, `teacher` (with `quizzes.read` permission)
- **Purpose**: View and grade submissions

#### `/admin/course-wizard` - Course Wizard
- **Component**: `CourseWizard.tsx`
- **Access**: `super_admin`, `admin` (with `courses.create` permission)
- **Purpose**: Multi-step course creation

#### `/admin/course-wizard/:courseId` - Edit Course Wizard
- **Component**: `CourseWizard.tsx`
- **Access**: `super_admin`, `admin` (with `courses.update` permission)
- **Purpose**: Edit course via wizard

#### `/admin/super` - Super Admin Management
- **Component**: `SuperAdminManagement.tsx`
- **Access**: `super_admin` only
- **Purpose**: Super admin system configuration

#### `/admin/system-monitoring` - System Monitoring
- **Component**: `SystemMonitoring.tsx`
- **Access**: `super_admin`, `admin` (with `analytics.read` permission)
- **Purpose**: System health and analytics

#### `/admin/site-content` - Site Content
- **Component**: `SiteContent.tsx`
- **Access**: `super_admin`, `admin` (with `users.update` permission)
- **Purpose**: Manage site-wide content

### Teacher Routes

#### `/teacher/courses/:courseId/lessons` - Lesson Management
- **Component**: `LessonManagement.tsx`
- **Access**: `teacher`, `super_admin`, `admin`
- **Purpose**: Manage course lessons

#### `/teacher/students` - Assigned Students
- **Component**: `StudentManagement.tsx`
- **Access**: `teacher`, `super_admin`, `admin`
- **Purpose**: View and manage assigned students

#### `/teacher/courses/:courseId/attendance` - Attendance Management
- **Component**: `AttendanceManagement.tsx`
- **Access**: `teacher`, `super_admin`, `admin`
- **Purpose**: Manage student attendance

### Student Routes

#### `/student/assignments` - Student Assignments
- **Component**: `StudentAssignments.tsx`
- **Access**: `student`
- **Purpose**: View and submit assignments

### Error Routes

#### `*` - Not Found
- **Component**: `NotFound.tsx`
- **Access**: All
- **Purpose**: Handle 404 errors

---

## Component Architecture

### Core Components

#### Navigation Components
- **Navbar** (`components/Navbar.tsx`): Main navigation with role-based menu
- **NavLink** (`components/NavLink.tsx`): Navigation link component
- **ProtectedRoute** (`components/ProtectedRoute.tsx`): Route protection wrapper

#### Course Components
- **CourseHeader**: Course title, image, and metadata
- **CourseOverview**: Course description and information
- **CourseCurriculum**: Modules and lessons display
- **CourseResources**: Course materials list
- **CourseReviews**: Reviews and ratings
- **CourseSidebar**: Course navigation sidebar
- **SmartVideoPlayer**: Video player with progress tracking
- **EnrolledStudents**: List of enrolled students
- **LibrarySelector**: Select library content for course
- **AttachedLibraryItems**: Display attached library items

#### Library Components
- **FileDropzone**: Drag-and-drop file upload
- **ImageCropper**: Image cropping tool
- **ThumbnailUpload**: Thumbnail upload component
- **PDFViewer**: PDF viewing component
- **VideoPlayer**: Video player component
- **VideoPlayerModal**: Modal video player
- **EditBookDialog**: Edit book dialog
- **EditVideoDialog**: Edit video dialog

#### Permission Components
- **PermissionMatrixCard**: Permission matrix display
- **MobilePermissionCard**: Mobile permission card

#### Utility Components
- **CategoryMultiSelect**: Multi-select category picker
- **StarRating**: Star rating component

### UI Component Library (shadcn-ui)

#### Forms
- `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `form`, `label`

#### Navigation
- `tabs`, `breadcrumb`, `navigation-menu`, `sidebar`, `pagination`

#### Feedback
- `toast`, `alert`, `alert-dialog`, `dialog`, `popover`, `tooltip`, `sonner`

#### Data Display
- `table`, `card`, `badge`, `avatar`, `progress`, `skeleton`, `chart`

#### Overlays
- `dropdown-menu`, `context-menu`, `sheet`, `drawer`, `hover-card`

#### Media
- `aspect-ratio`, `carousel`

#### Layout
- `separator`, `scroll-area`, `resizable`, `collapsible`

---

## User Flows

### Authentication Flow

#### Login Flow
1. User navigates to `/auth`
2. Enters email and password
3. Clicks "Login"
4. Form validates input
5. Supabase authenticates
6. On success:
   - Session created
   - User data loaded
   - Role determined
   - Permissions loaded
   - Redirect to appropriate dashboard
7. On failure:
   - Error message displayed
   - User remains on login page

#### Registration Flow
1. User navigates to `/auth`
2. Switches to registration tab
3. Fills form: email, password, confirm password, name
4. Form validates
5. Submits registration
6. Account created
7. Profile created with `pending_approval` status
8. Redirected to `/pending-approval`
9. Admin approves user
10. User gains access

### Course Enrollment Flow

#### Student Self-Enrollment
1. Student browses courses at `/courses`
2. Clicks on course card
3. Views course details at `/courses/:courseId`
4. Clicks "Enroll" button
5. Enrollment created
6. Student gains access to course content
7. Course appears in student dashboard

#### Admin Enrollment
1. Admin navigates to `/admin/enrollments`
2. Clicks "Enroll Student"
3. Selects student from dropdown
4. Selects course from dropdown
5. Submits enrollment
6. Enrollment created
7. Student notified (if implemented)

### Assignment Submission Flow

1. Student navigates to `/student/assignments`
2. Views assignment list
3. Clicks on assignment
4. Views assignment details
5. Uploads submission file
6. Adds comments (optional)
7. Submits assignment
8. Status updates to "Submitted"
9. Teacher notified (if implemented)

### Content Upload Flow

1. Admin/Teacher navigates to `/library/upload`
2. Selects content type (book/video)
3. Uploads file via dropzone
4. Fills metadata form
5. Uploads thumbnail (with cropping if needed)
6. Submits form
7. Content created in library
8. Content available for assignment to courses

---

## Data Models

### Core Entities

#### Users
- `id`: UUID (primary key)
- `email`: String (unique)
- `password_hash`: String (Supabase managed)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### Profiles
- `id`: UUID (primary key, references users)
- `user_id`: UUID (foreign key)
- `full_name`: String
- `avatar_url`: String (optional)
- `bio`: Text (optional)
- `role`: Enum (student, teacher, admin, super_admin, guardian)
- `status`: Enum (active, pending_approval, inactive)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### Courses
- `id`: UUID (primary key)
- `title`: String
- `description`: Text
- `image_url`: String (optional)
- `status`: Enum (draft, published)
- `created_by`: UUID (foreign key to users)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### Enrollments
- `id`: UUID (primary key)
- `student_id`: UUID (foreign key to users)
- `course_id`: UUID (foreign key to courses)
- `enrolled_at`: Timestamp
- `status`: Enum (active, completed, dropped)

#### Library Content
- `id`: UUID (primary key)
- `title`: String
- `description`: Text
- `type`: Enum (book, video)
- `file_url`: String
- `thumbnail_url`: String (optional)
- `created_by`: UUID (foreign key to users)
- `created_at`: Timestamp

#### Assignments
- `id`: UUID (primary key)
- `title`: String
- `description`: Text
- `course_id`: UUID (foreign key to courses)
- `due_date`: Timestamp
- `created_by`: UUID (foreign key to users)
- `created_at`: Timestamp

#### Submissions
- `id`: UUID (primary key)
- `assignment_id`: UUID (foreign key to assignments)
- `student_id`: UUID (foreign key to users)
- `file_url`: String
- `status`: Enum (submitted, graded)
- `grade`: Decimal (optional)
- `feedback`: Text (optional)
- `submitted_at`: Timestamp

---

## API & Integration

### Supabase Integration

#### Authentication API
- **Login**: `supabase.auth.signInWithPassword()`
- **Register**: `supabase.auth.signUp()`
- **Logout**: `supabase.auth.signOut()`
- **Session**: `supabase.auth.getSession()`

#### Database API
- **Query**: `supabase.from('table').select()`
- **Insert**: `supabase.from('table').insert()`
- **Update**: `supabase.from('table').update()`
- **Delete**: `supabase.from('table').delete()`

#### Storage API
- **Upload**: `supabase.storage.from('bucket').upload()`
- **Download**: `supabase.storage.from('bucket').download()`
- **Get Public URL**: `supabase.storage.from('bucket').getPublicUrl()`

#### Real-time API
- **Subscribe**: `supabase.from('table').on('*', callback).subscribe()`

### React Query Integration

#### Query Hooks
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['courses'],
  queryFn: () => fetchCourses()
});
```

#### Mutation Hooks
```typescript
const mutation = useMutation({
  mutationFn: (data) => createCourse(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['courses']);
  }
});
```

---

## Business Logic

### Enrollment Rules
- Students can self-enroll if course allows
- Admin/Teacher can enroll students
- Students must be enrolled to access course content
- Enrollment status affects content access

### Permission Rules
- Super Admin bypasses all checks
- Role permissions are default permissions
- User permissions override role permissions
- Permission checks happen at route and component level

### Content Access Rules
- Library content requires library access permission
- Course content requires enrollment
- Assignment access requires course enrollment
- Video progress tracked per user

### Approval Workflow
- New users require admin approval
- Pending users cannot access protected routes
- Admin can approve/reject from user management
- Approved users gain full access based on role

---

## UI/UX Requirements

### Design System
- **Component Library**: shadcn-ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Theme**: Dark/light mode support

### Responsive Design
- **Mobile First**: Designed for mobile devices
- **Breakpoints**: Tailwind default breakpoints
- **Touch Friendly**: Large touch targets
- **Adaptive Layout**: Responsive grid systems

### Accessibility
- **WCAG 2.1 AA**: Minimum compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels
- **Color Contrast**: Minimum 4.5:1 ratio

### User Experience
- **Loading States**: Skeleton loaders
- **Error States**: User-friendly error messages
- **Empty States**: Helpful empty state messages
- **Success Feedback**: Toast notifications
- **Form Validation**: Real-time validation feedback

---

## Performance Requirements

### Page Load Times
- **Initial Load**: < 2 seconds
- **Route Navigation**: < 500ms
- **Data Fetch**: < 1 second
- **Image Load**: < 2 seconds

### Optimization Strategies
- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Image Optimization**: Optimized images
- **Caching**: React Query caching
- **Memoization**: React.memo for expensive components

---

## Security Requirements

### Authentication Security
- **Password Strength**: Minimum 8 characters
- **Session Management**: Secure token storage
- **Token Refresh**: Automatic refresh
- **CSRF Protection**: Token-based protection

### Authorization Security
- **Role Verification**: Server-side checks
- **Permission Validation**: Database-level checks
- **Route Protection**: Client and server-side
- **RLS Policies**: Row-level security

### Data Security
- **Input Validation**: All inputs validated
- **XSS Prevention**: Proper escaping
- **SQL Injection**: Parameterized queries
- **File Upload**: Type and size validation

---

## Testing Strategy

### Testing Levels
1. **Unit Tests**: Component and function tests
2. **Integration Tests**: Feature integration tests
3. **E2E Tests**: Full user flow tests
4. **Accessibility Tests**: WCAG compliance

### Test Coverage Goals
- **Components**: 80%+
- **Pages**: 90%+
- **Utils/Lib**: 70%+
- **Hooks**: 80%+

### Testing Tools
- **TestSprite MCP**: Automated testing
- **Jest**: Unit testing
- **React Testing Library**: Component testing
- **Playwright/Cypress**: E2E testing

---

## Deployment & Environment

### Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase public key

### Development
- **Server**: `http://localhost:8080`
- **Hot Reload**: Enabled
- **Source Maps**: Enabled

### Production
- **Build**: `npm run build`
- **Output**: `dist/` directory
- **Hosting**: Static hosting (Vercel, Netlify, etc.)

---

## Conclusion

This PRD provides comprehensive documentation for the EDulearn platform. It covers all aspects of the application from architecture to deployment, ensuring clear understanding for developers, stakeholders, and testers.

**Key Highlights**:
- ✅ 5 distinct user roles with granular permissions
- ✅ 40+ routes with detailed access requirements
- ✅ Comprehensive component architecture
- ✅ Complete feature specifications
- ✅ Security and performance requirements
- ✅ Testing strategy and coverage goals

---

**Document Version**: 2.0  
**Last Updated**: 2024  
**Maintained By**: Development Team
