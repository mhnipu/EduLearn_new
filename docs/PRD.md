# Product Requirements Document (PRD)
## EDulearn - SmartLearn MVP

### Project Overview
EDulearn is a modern e-learning platform built with React, TypeScript, and Supabase. It provides course management, content library, user management, and role-based dashboards for educational institutions.

### Technology Stack
- **Frontend**: React 18.3.1 with TypeScript
- **UI Framework**: shadcn-ui components with Tailwind CSS
- **Routing**: React Router DOM v6
- **State Management**: React Query (TanStack Query)
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Build Tool**: Vite
- **Development Server**: Port 8080

### User Roles & Permissions

#### 1. Student
- Browse and enroll in courses
- Access enrolled course content
- View video lessons and download materials
- Submit assignments
- Track learning progress

#### 2. Teacher
- Create and manage course content
- Upload lessons and materials
- Manage enrolled students
- Grade assignments
- Track student progress

#### 3. Admin
- Manage all courses
- User management (create, edit, assign roles)
- Content library management
- Category management
- Assignment management
- Enrollment management

#### 4. Super Admin
- All admin capabilities
- System configuration
- Advanced user management

#### 5. Guardian
- View student progress
- Monitor enrolled courses
- Access reports

### Core Features

#### Authentication & Authorization
- **Login/Registration**: Email-based authentication via Supabase
- **Session Management**: Persistent sessions with auto-refresh
- **Role-Based Access**: Routes and features protected by user roles
- **Pending Approval**: New users require admin approval

#### Dashboard System
- **Role-Based Dashboards**: Different dashboards for each user type
  - `/dashboard/admin` - Admin dashboard
  - `/dashboard/teacher` - Teacher dashboard
  - `/dashboard/student` - Student dashboard
  - `/dashboard/guardian` - Guardian dashboard
- **Navigation**: Consistent navbar across all pages
- **Theme Support**: Dark/light mode toggle

#### Course Management
- **Course Listing**: Browse all available courses at `/courses`
- **Course Details**: Individual course pages at `/courses/:courseId`
  - Course overview
  - Curriculum/modules
  - Resources
  - Reviews
  - Enrolled students (for teachers/admins)
- **Course Creation**: Admin-only course creation wizard
- **Course Editing**: Edit course details, materials, modules
- **Enrollment**: Students can enroll in courses
- **Categories**: Course categorization system

#### Content Library
- **Library Page**: Main library at `/library`
- **Content Types**: Books (PDF), Videos
- **Upload**: Content upload at `/library/upload`
- **Viewing**:
  - PDF viewer for books
  - Video player for videos
  - Thumbnail generation
- **File Management**: Dropzone, image cropping, thumbnail upload

#### Assignment System
- **Assignment Creation**: Admins/teachers create assignments
- **Submission**: Students submit assignments
- **Grading**: Teachers/admins grade submissions
- **Management**: Assignment management interface

#### User Management
- **User List**: View all users (admin only)
- **Role Assignment**: Assign roles to users
- **Profile Management**: Users can edit profiles

### Key Routes

#### Public Routes
- `/` - Landing page with hero section and features
- `/auth` - Authentication page (login/register)

#### Protected Routes (Require Authentication)
- `/dashboard` - Main dashboard (redirects based on role)
- `/dashboard/admin` - Admin dashboard
- `/dashboard/teacher` - Teacher dashboard
- `/dashboard/student` - Student dashboard
- `/dashboard/guardian` - Guardian dashboard
- `/courses` - Course listing
- `/courses/:courseId` - Course detail page
- `/library` - Content library
- `/library/upload` - Upload content
- `/library/book/:id` - Book detail/viewer
- `/library/video/:id` - Video detail/player
- `/profile` - User profile page
- `/pending-approval` - Pending user approval page

#### Admin-Only Routes
- `/admin/courses/new` - Create new course
- `/admin/courses/:courseId/edit` - Edit course
- `/admin/courses/:courseId/materials` - Manage course materials
- `/admin/courses/:courseId/modules` - Manage course modules
- `/admin/users` - User management
- `/admin/categories` - Category management
- `/admin/content-assignments` - Content assignment management
- `/admin/enrollments` - Enrollment management
- `/admin/assignments` - Assignment management
- `/admin/assignments/:assignmentId/submissions` - View submissions
- `/admin/course-wizard` - Course creation wizard
- `/admin/super` - Super admin management

#### Teacher Routes
- `/teacher/courses/:courseId/lessons` - Lesson management

#### Student Routes
- `/student/assignments` - View and submit assignments

### UI Components (shadcn-ui)
The application uses a comprehensive set of shadcn-ui components:
- Forms (input, textarea, select, checkbox, radio)
- Navigation (tabs, sidebar, breadcrumb, navigation-menu)
- Feedback (toast, alert, dialog, popover, tooltip)
- Data Display (table, card, badge, avatar, progress)
- Overlays (dropdown-menu, context-menu, sheet, drawer)
- Media (aspect-ratio, carousel)
- And many more...

### Key Functionality Requirements

#### 1. Video Player
- Custom video player with progress tracking
- Resume from last watched position
- Playback controls

#### 2. PDF Viewer
- PDF viewing capability
- Thumbnail generation
- Download functionality

#### 3. File Upload
- Drag-and-drop file upload
- Image cropping
- Thumbnail generation
- Multiple file type support

#### 4. Form Validation
- Client-side validation using Zod
- React Hook Form integration
- Error messaging

#### 5. Search & Filter
- Course search functionality
- Category filtering
- Library content search

#### 6. Responsive Design
- Mobile-friendly navigation
- Responsive layouts
- Touch-friendly interactions

### Testing Requirements

#### Functional Testing
1. **Authentication Flow**
   - Login functionality
   - Registration process
   - Session persistence
   - Logout functionality

2. **Navigation**
   - All routes accessible
   - Role-based route protection
   - Navigation links work correctly

3. **Dashboard Rendering**
   - Correct dashboard for each role
   - Data displays correctly
   - Charts and statistics render

4. **Course Management**
   - Course listing displays
   - Course detail pages load
   - Enrollment process works
   - Course creation/editing functions

5. **Library Functionality**
   - Content displays correctly
   - File upload works
   - PDF viewer functions
   - Video player works

6. **Forms**
   - All forms validate correctly
   - Form submission works
   - Error messages display

#### UI/UX Testing
- Components render correctly
- Responsive design works on different screen sizes
- Theme switching works
- Loading states display
- Error states handle gracefully

#### Integration Testing
- Supabase integration
- API calls succeed
- Data persistence works
- Real-time updates function

### Environment Configuration
- Development server: `http://localhost:8080`
- Supabase URL: Configured via `VITE_SUPABASE_URL`
- Supabase Key: Configured via `VITE_SUPABASE_PUBLISHABLE_KEY`

### Known Dependencies
- React Router for navigation
- Supabase client for backend
- React Query for data fetching
- Lucide React for icons
- Date-fns for date manipulation
- PDF.js for PDF viewing
- React Easy Crop for image cropping

