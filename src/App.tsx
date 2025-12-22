import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import TeacherDashboard from "./pages/dashboard/TeacherDashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import GuardianDashboard from "./pages/dashboard/GuardianDashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Profile from "./pages/Profile";
import CreateCourse from "./pages/admin/CreateCourse";
import EditCourse from "./pages/admin/EditCourse";
import CourseMaterials from "./pages/admin/CourseMaterials";
import UserManagement from "./pages/admin/UserManagement";
import ContentAssignments from "./pages/admin/ContentAssignments";
import CategoryManagement from "./pages/admin/CategoryManagement";
import Library from "./pages/Library";
import UploadContent from "./pages/library/UploadContent";
import BookDetail from "./pages/library/BookDetail";
import VideoDetail from "./pages/library/VideoDetail";
import LessonManagement from "./pages/teacher/LessonManagement";
import StudentManagement from "./pages/teacher/StudentManagement";
import StudentDetail from "./pages/teacher/StudentDetail";
import AttendanceManagement from "./pages/teacher/AttendanceManagement";
import PendingApproval from "./pages/PendingApproval";
import SuperAdminManagement from "./pages/admin/SuperAdminManagement";
import SystemMonitoring from "./pages/admin/SystemMonitoring";
import EnrollmentManagement from "./pages/admin/EnrollmentManagement";
import CourseModules from "./pages/admin/CourseModules";
import CourseWizard from "./pages/admin/CourseWizard";
import AssignmentManagement from "./pages/admin/AssignmentManagement";
import AssignmentSubmissions from "./pages/admin/AssignmentSubmissions";
import SiteContent from "./pages/admin/SiteContent";
import LandingPageCMS from "./pages/admin/LandingPageCMS";
import StudentAssignments from "./pages/student/StudentAssignments";
import QuizExamTaking from "./pages/student/QuizExamTaking";
import ProfileCompletion from "./pages/ProfileCompletion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/admin" element={
                <ProtectedRoute allowRoles={['super_admin', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/super_admin" element={
                <ProtectedRoute allowRoles={['super_admin', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/teacher" element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/student" element={
                <ProtectedRoute allowRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/guardian" element={
                <ProtectedRoute allowRoles={['guardian']}>
                  <GuardianDashboard />
                </ProtectedRoute>
              } />
              <Route path="/courses" element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              } />
              <Route path="/courses/:courseId" element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/profile-completion" element={
                <ProfileCompletion />
              } />
              <Route path="/library" element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              } />
              <Route path="/library/upload" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'library', action: 'create' }}
                >
                  <UploadContent />
                </ProtectedRoute>
              } />
              <Route path="/library/book/:id" element={
                <ProtectedRoute>
                  <BookDetail />
                </ProtectedRoute>
              } />
              <Route path="/library/video/:id" element={
                <ProtectedRoute>
                  <VideoDetail />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/courses/new" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'courses', action: 'create' }}
                >
                  <CreateCourse />
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/:courseId/edit" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'courses', action: 'update' }}
                >
                  <EditCourse />
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/:courseId/materials" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'courses', action: 'update' }}
                >
                  <CourseMaterials />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'users', action: 'read' }}
                >
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/content-assignments" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'courses', action: 'assign' }}
                >
                  <ContentAssignments />
                </ProtectedRoute>
              } />
              <Route path="/admin/categories" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'library', action: 'read' }}
                >
                  <CategoryManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/super" element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperAdminManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/site-content" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'users', action: 'update' }}
                >
                  <SiteContent />
                </ProtectedRoute>
              } />
              <Route path="/admin/landing-page-cms" element={
                <ProtectedRoute requiredRole="super_admin">
                  <LandingPageCMS />
                </ProtectedRoute>
              } />
              <Route path="/admin/system-monitoring" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'analytics', action: 'read' }}
                >
                  <SystemMonitoring />
                </ProtectedRoute>
              } />
              <Route path="/admin/enrollments" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'courses', action: 'assign' }}
                >
                  <EnrollmentManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/:courseId/modules" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'courses', action: 'update' }}
                >
                  <CourseModules />
                </ProtectedRoute>
              } />
              <Route path="/admin/course-wizard" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'courses', action: 'create' }}
                >
                  <CourseWizard />
                </ProtectedRoute>
              } />
              <Route path="/admin/course-wizard/:courseId" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin']}
                  requiredPermission={{ module: 'courses', action: 'update' }}
                >
                  <CourseWizard />
                </ProtectedRoute>
              } />
              <Route path="/admin/assignments" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'quizzes', action: 'read' }}
                >
                  <AssignmentManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/assignments/:assignmentId/submissions" element={
                <ProtectedRoute 
                  allowRoles={['super_admin', 'admin', 'teacher']}
                  requiredPermission={{ module: 'quizzes', action: 'read' }}
                >
                  <AssignmentSubmissions />
                </ProtectedRoute>
              } />
              
              {/* Teacher Routes */}
              <Route path="/teacher/courses/:courseId/lessons" element={
                <ProtectedRoute allowRoles={['teacher', 'super_admin', 'admin']}>
                  <LessonManagement />
                </ProtectedRoute>
              } />
              <Route path="/teacher/students" element={
                <ProtectedRoute allowRoles={['teacher', 'super_admin', 'admin']}>
                  <StudentManagement />
                </ProtectedRoute>
              } />
              <Route path="/teacher/students/:studentId" element={
                <ProtectedRoute allowRoles={['teacher', 'super_admin', 'admin']}>
                  <StudentDetail />
                </ProtectedRoute>
              } />
              <Route path="/teacher/courses/:courseId/attendance" element={
                <ProtectedRoute allowRoles={['teacher', 'super_admin', 'admin']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              } />
              
              {/* Student Routes */}
              <Route path="/student/assignments" element={
                <ProtectedRoute allowRoles={['student']}>
                  <StudentAssignments />
                </ProtectedRoute>
              } />
              <Route path="/student/quiz/:quizId/take" element={
                <ProtectedRoute allowRoles={['student']}>
                  <QuizExamTaking />
                </ProtectedRoute>
              } />
              
              {/* Pending Approval */}
              <Route path="/pending-approval" element={
                <ProtectedRoute>
                  <PendingApproval />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
