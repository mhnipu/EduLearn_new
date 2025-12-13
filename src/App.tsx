import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Navbar } from "./components/Navbar";
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
import PendingApproval from "./pages/PendingApproval";
import SuperAdminManagement from "./pages/admin/SuperAdminManagement";
import SystemMonitoring from "./pages/admin/SystemMonitoring";
import EnrollmentManagement from "./pages/admin/EnrollmentManagement";
import CourseModules from "./pages/admin/CourseModules";
import CourseWizard from "./pages/admin/CourseWizard";
import AssignmentManagement from "./pages/admin/AssignmentManagement";
import AssignmentSubmissions from "./pages/admin/AssignmentSubmissions";
import SiteContent from "./pages/admin/SiteContent";
import StudentAssignments from "./pages/student/StudentAssignments";
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/super_admin" element={<AdminDashboard />} />
              <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
              <Route path="/dashboard/student" element={<StudentDashboard />} />
              <Route path="/dashboard/guardian" element={<GuardianDashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/library" element={<Library />} />
              <Route path="/library/upload" element={<UploadContent />} />
              <Route path="/library/book/:id" element={<BookDetail />} />
              <Route path="/library/video/:id" element={<VideoDetail />} />
              <Route path="/admin/courses/new" element={<CreateCourse />} />
              <Route path="/admin/courses/:courseId/edit" element={<EditCourse />} />
              <Route path="/admin/courses/:courseId/materials" element={<CourseMaterials />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/content-assignments" element={<ContentAssignments />} />
              <Route path="/admin/categories" element={<CategoryManagement />} />
              <Route path="/admin/super" element={<SuperAdminManagement />} />
              <Route path="/admin/site-content" element={<SiteContent />} />
              <Route path="/admin/system-monitoring" element={<SystemMonitoring />} />
              <Route path="/admin/enrollments" element={<EnrollmentManagement />} />
              <Route path="/admin/courses/:courseId/modules" element={<CourseModules />} />
              <Route path="/admin/course-wizard" element={<CourseWizard />} />
              <Route path="/admin/course-wizard/:courseId" element={<CourseWizard />} />
              <Route path="/admin/assignments" element={<AssignmentManagement />} />
              <Route path="/admin/assignments/:assignmentId/submissions" element={<AssignmentSubmissions />} />
              <Route path="/teacher/courses/:courseId/lessons" element={<LessonManagement />} />
              <Route path="/student/assignments" element={<StudentAssignments />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
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
