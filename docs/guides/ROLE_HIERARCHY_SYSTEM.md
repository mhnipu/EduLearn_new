# Role Hierarchy & Permission System

## Overview
A comprehensive role-based access control (RBAC) system with hierarchical permissions, user tracking, termination capabilities, and system monitoring features.

---

## 🎭 Role Hierarchy

### 1. Super User / Super Admin (সুপার ইউজার)
**Highest Level Authority**

#### Capabilities:
- ✅ Create and manage **custom roles**
- ✅ Create and assign **Admin** roles
- ✅ Create and assign **Super Admin** roles
- ❌ **CANNOT** assign Teacher, Student, or Guardian roles
- ✅ Full access to all system features
- ✅ User tracking and monitoring
- ✅ User termination (except other super admins)
- ✅ System configuration and settings

#### Access to:
- Super Admin Management Console (`/admin/super`)
- All Admin features
- Role creation and custom role management
- Complete user database access
- System-wide analytics

---

### 2. Admin (অ্যাডমিন)
**System Moderator**

#### Capabilities:
- ✅ Assign roles to users: **Teacher**, **Student**, **Guardian**
- ❌ **CANNOT** assign Admin or Super Admin roles
- ❌ **CANNOT** directly manipulate user accounts
- ✅ Can **view** all user information (name, email, phone, profile)
- ✅ Can **track** user activity and behavior
- ✅ Can **terminate** users from the database (except admins and super admins)
- ✅ Full access to features, modules, and components
- ✅ System monitoring and analytics
- ✅ Activity log viewing
- ✅ Content management (courses, lessons, library)

#### Access to:
- System Monitoring Dashboard (`/admin/system-monitoring`)
- User Management (view + tracking + termination)
- Course Management
- Content Management
- Module Configuration
- Activity Logs
- System Analytics

#### Restrictions:
- Cannot create or assign Admin/Super Admin roles
- Cannot access Super Admin Management Console
- Cannot modify other Admin accounts

---

### 3. Teacher (শিক্ষক)
**Content Creator**

#### Capabilities:
- Create and manage courses
- Create lessons and curriculum
- Upload educational content
- View enrolled students
- Track student progress
- Manage assignments
- Grade submissions

#### Access to:
- Teacher Dashboard
- Course Creation
- Lesson Management
- Content Upload
- Student Progress Tracking
- Assignment Management

---

### 4. Student (শিক্ষার্থী)
**Learner**

#### Capabilities:
- Browse and enroll in courses
- Access learning materials
- Submit assignments
- Track own progress
- Earn certificates
- Save bookmarks

#### Access to:
- Student Dashboard
- Course Catalog
- Library
- Assignments
- Profile & Progress

---

### 5. Guardian (অভিভাবক)
**Monitor**

#### Capabilities:
- Monitor children's learning progress
- View student performance
- Track course completion
- View certificates earned
- Receive progress notifications

#### Access to:
- Guardian Dashboard
- Student Progress Reports
- Certificate Viewing

---

## 🔐 Permission Matrix

### Super Admin Can:
| Action | Super Admin | Admin | Teacher | Student | Guardian |
|--------|-------------|-------|---------|---------|----------|
| Create Super Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Teacher | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create Student | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create Guardian | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Track Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Terminate Users | ✅ | ✅* | ❌ | ❌ | ❌ |
| Manage Modules | ✅ | ✅ | ❌ | ❌ | ❌ |
| System Monitoring | ✅ | ✅ | ❌ | ❌ | ❌ |

*Admins cannot terminate Super Admins or other Admins

---

## 👤 User Tracking & Management

### Super Admin & Admin Can Track:
1. **Basic Information**
   - Full Name
   - Email Address
   - User ID

2. **Account Details**
   - Member Since (Created Date)
   - Assigned Roles

3. **Activity Tracking**
   - Course enrollments
   - Content interactions
   - Assignment submissions
   - System actions

---

## 🚫 User Termination

### Termination Rules:
- ✅ Admins can terminate: Teacher, Student, Guardian
- ❌ Admins **CANNOT** terminate: Admin, Super Admin
- ✅ Super Admins can terminate: Everyone except other Super Admins
- ❌ Users **CANNOT** terminate themselves

### Termination Process:
1. View user details
2. Click "Terminate User" button
3. Review termination confirmation dialog
4. Confirm deletion

### What Gets Deleted:
- ✅ User account from authentication system
- ✅ User profile and personal data
- ✅ All assigned roles
- ✅ Enrollment records
- ✅ Progress data
- ✅ Permissions
- ⚠️ Cascading delete based on foreign key constraints

---

## 📊 System Monitoring Dashboard

### Features Available to Admins:

#### 1. System Health
- **Database Status**: Monitor database connectivity and performance
- **Storage Status**: Track storage usage and availability
- **API Status**: Check API response times and uptime
- **System Uptime**: View overall platform uptime percentage

#### 2. Real-time Analytics
- Total Users (Active vs Total)
- Total Courses & Lessons
- Total Enrollments
- Content Statistics (Videos, Books)
- Pending Approvals

#### 3. Activity Logs
- Real-time activity feed
- Action types and timestamps
- User IDs and entity types
- Filterable and searchable logs
- Export capabilities

#### 4. Visual Analytics
- **User Activity Chart**: 7-day active users and enrollments
- **Content Distribution**: Pie chart showing course/lesson/video/book breakdown
- **Growth Trends**: Line charts for platform growth
- **Performance Metrics**: System health indicators

#### 5. Module Management
- **Course Management**: Configure courses and curriculum
- **User Management**: View-only user tracking
- **Content Library**: Manage videos, books, materials
- **Notifications**: Email campaigns and system alerts
- **Security & Permissions**: View-only security settings
- **Analytics & Reports**: Generate and export reports

---

## 🛠️ Technical Implementation

### Components Created/Updated:

1. **SuperAdminManagement.tsx**
   - Role hierarchy implementation
   - User tracking interface
   - Termination dialogs
   - User details modal
   - Permission management

2. **SystemMonitoring.tsx**
   - Real-time system monitoring
   - Activity logs viewer
   - Analytics dashboard
   - Module management interface
   - System health checks

3. **AdminDashboard.tsx**
   - Added System Monitoring quick action
   - Enhanced navigation
   - Role-based UI rendering

4. **App.tsx**
   - Added `/admin/system-monitoring` route
   - Imported SystemMonitoring component

### Database Considerations:
- User roles stored in `user_roles` table
- Activity logged in `activity_feed` table
- Module permissions in `user_module_permissions` table
- Cascading deletes configured for user termination

---

## 🎨 UI/UX Enhancements

### SuperAdmin Management:
- **User Cards**: Avatar, name, email, roles
- **Action Buttons**: View Details, Permissions, Terminate
- **Role Checkboxes**: Conditional rendering based on user role
- **Termination Dialog**: Confirmation with warning messages
- **User Details Modal**: Complete user information display

### System Monitoring:
- **Health Cards**: Color-coded status indicators (Green/Yellow/Red)
- **Stats Grid**: 5 key metric cards with icons
- **Tab Navigation**: Analytics, Activity Logs, Modules & Features
- **Charts**: Area, Pie, Line charts for data visualization
- **Activity Feed**: Real-time scrollable log
- **Module Cards**: Feature status and quick actions

### Color Coding:
- **Green**: Healthy, Active, Success
- **Yellow**: Warning, Limited Access
- **Red**: Critical, Error, Destructive
- **Blue**: Information, Users
- **Purple**: Analytics, Reports

---

## 🔒 Security Features

### Protection Mechanisms:
1. **Self-Termination Prevention**: Users cannot delete their own accounts
2. **Super Admin Protection**: Super Admins cannot be terminated
3. **Role Hierarchy Enforcement**: Lower roles cannot assign higher roles
4. **Permission Validation**: Server-side role checks on all actions
5. **Activity Logging**: All critical actions are logged

### Access Control:
- Route-level authentication
- Role-based component rendering
- API endpoint protection
- Database RLS (Row Level Security) policies

---

## 📱 Responsive Design

All new components are fully responsive:
- **Mobile**: Stacked layouts, hamburger menus
- **Tablet**: 2-column grids, compact cards
- **Desktop**: Full width layouts, multi-column grids
- **Large Screens**: Maximum width containers, enhanced spacing

---

## 🚀 Future Enhancements

### Planned Features:
1. **Custom Role Builder**: Visual role creation interface for Super Admins
2. **Advanced Permissions**: Granular CRUD permissions per module
3. **Audit Trail**: Comprehensive audit log with rollback capability
4. **Bulk Actions**: Batch user management operations
5. **Role Templates**: Pre-configured role templates
6. **Time-based Permissions**: Temporary role assignments
7. **IP Restrictions**: Role-based IP whitelisting
8. **Two-Factor Authentication**: Enhanced security for admin roles
9. **Session Management**: Active session monitoring and termination
10. **Automated Reports**: Scheduled email reports for admins

---

## 📋 Usage Guide

### For Super Admins:

1. **Creating Admins**:
   - Navigate to `/admin/super`
   - Find user in the list
   - Check "Admin" checkbox
   - User receives admin privileges

2. **Viewing User Details**:
   - Click eye icon next to user
   - View complete profile information
   - Check activity status and login history

3. **Terminating Users**:
   - Click terminate (UserX) icon
   - Review confirmation dialog
   - Confirm deletion
   - User permanently removed

### For Admins:

1. **Assigning Roles**:
   - Access user management
   - Select Teacher/Student/Guardian role
   - User gets appropriate access

2. **System Monitoring**:
   - Go to `/admin/system-monitoring`
   - View real-time analytics
   - Check system health
   - Review activity logs

3. **Tracking Users**:
   - Click view details on any user
   - See complete profile
   - Track activity and status

4. **Managing Modules**:
   - Access Modules & Features tab
   - Configure available features
   - Enable/disable components

---

## ⚠️ Important Notes

### Role Assignment Rules:
- **Super Admin** → Can only assign: Super Admin, Admin
- **Admin** → Can only assign: Teacher, Student, Guardian
- **Nobody** → Can assign: Admin or Super Admin (except Super Admin)

### Termination Rules:
- Cannot terminate yourself
- Cannot terminate Super Admins (unless you're a Super Admin terminating another Super Admin)
- Admins cannot terminate other Admins

### Monitoring Access:
- Only Admins and Super Admins can access System Monitoring
- Regular users have no access to admin features
- Role-based routing automatically redirects unauthorized access

---

## 🎉 Summary

The EDulearn platform now features:
- ✅ **Hierarchical Role System**: Clear authority levels
- ✅ **User Tracking**: Complete user information monitoring
- ✅ **Termination Capability**: Safe user removal with safeguards
- ✅ **System Monitoring**: Real-time platform analytics
- ✅ **Module Management**: Admin-controlled feature configuration
- ✅ **Security**: Multi-layer protection and validation
- ✅ **Modern UI**: Beautiful, responsive interfaces
- ✅ **Activity Logging**: Complete audit trail

This system provides **industry-leading role management** with the perfect balance of power and security! 🚀

---

**Created**: December 3, 2025  
**Version**: 2.0  
**Status**: ✅ Complete  
**Language**: Bilingual (English + বাংলা)

