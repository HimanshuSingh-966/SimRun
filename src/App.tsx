'use client';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './views/LandingPage';
import Login from './views/Auth/Login';
import RoleSelection from './views/Auth/RoleSelection';
import StudentRegistration from './views/Auth/StudentRegistration';
import FacultyRegistration from './views/Auth/FacultyRegistration';
import AuthLayout from './views/Auth/AuthLayout';
import AdminLayout from './views/Dashboard/AdminLayout';
import AdminOverview from './views/Dashboard/AdminOverview';
import AdminApprovals from './views/Dashboard/AdminApprovals';
import AdminFacultyManagement from './views/Dashboard/AdminFacultyManagement';
import AdminStudentManagement from './views/Dashboard/AdminStudentManagement';
import AdminStudentsByBatch from './views/Dashboard/AdminStudentsByBatch';
import FacultyLayout from './views/Dashboard/FacultyLayout';
import FacultyOverview from './views/Dashboard/FacultyOverview';
import FacultyCreateCourse from './views/Dashboard/FacultyCreateCourse';
import FacultyMyCourses from './views/Dashboard/FacultyMyCourses';
import FacultyCourseContent from './views/Dashboard/FacultyCourseContent';
import FacultyEnrollments from './views/Dashboard/FacultyEnrollments';
import FacultyProgress from './views/Dashboard/FacultyProgress';
import FacultyCourseProgress from './views/Dashboard/FacultyCourseProgress';
import FacultyAssignments from './views/Dashboard/FacultyAssignments';
import FacultyProfile from './views/Dashboard/FacultyProfile';
import StudentLayout from './views/Dashboard/StudentLayout';
import StudentOverview from './views/Dashboard/StudentOverview';
import StudentMyCourses from './views/Dashboard/StudentMyCourses';
import StudentProfile from './views/Dashboard/StudentProfile';
import StudentCourseLearn from './views/Dashboard/StudentCourseLearn';
import StudentAssignments from './views/Dashboard/StudentAssignments';
import StudentResources from './views/Dashboard/StudentResources';
import AdminProfile from './views/Dashboard/AdminProfile';
import AdminCoursesList from './views/Dashboard/AdminCoursesList';
import AdminCreateCourse from './views/Dashboard/AdminCreateCourse';
import AdminCoursePreview from './views/Dashboard/AdminCoursePreview';
import NotificationsPage from './views/Dashboard/NotificationsPage';
import HelpPage from './views/Dashboard/HelpPage';
import PrivacyPolicy from './views/PrivacyPolicy';

function DashboardRedirect() {
  const { profile, session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  const roleRedirects: Record<string, string> = { student: '/student', faculty: '/faculty', admin: '/admin' };
  return <Navigate to={roleRedirects[profile.role] || '/'} replace />;
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
    <AuthProvider>
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RoleSelection />} />
            <Route path="/register/student" element={<StudentRegistration />} />
            <Route path="/register/faculty" element={<FacultyRegistration />} />
          </Route>

          {/* Protected Dashboard Routes - Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="faculty" element={<AdminFacultyManagement />} />
            <Route path="students" element={<AdminStudentManagement />} />
            <Route path="students/:batchId" element={<AdminStudentsByBatch />} />
            <Route path="courses/new" element={<AdminCreateCourse />} />
            <Route path="courses/:courseId/view" element={<AdminCoursePreview />} />
            <Route path="courses/:courseId/manage" element={<FacultyCourseContent />} />
      <Route path="courses" element={<AdminCoursesList />} />
      <Route path="profile" element={<AdminProfile />} />
      <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>

          {/* Protected Dashboard Routes - Faculty */}
          <Route path="/faculty" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyLayout />
            </ProtectedRoute>
          }>
            <Route index element={<FacultyOverview />} />
            <Route path="create-course" element={<FacultyCreateCourse />} />
            <Route path="my-courses" element={<FacultyMyCourses />} />
            <Route path="my-courses/:courseId/content" element={<FacultyCourseContent />} />
            <Route path="enrollments" element={<FacultyEnrollments />} />
            <Route path="progress" element={<FacultyProgress />} />
            <Route path="progress/:courseId" element={<FacultyCourseProgress />} />
            <Route path="assignments" element={<FacultyAssignments />} />
            <Route path="profile" element={<FacultyProfile />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>

          {/* Protected Dashboard Routes - Student */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StudentOverview />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="courses/:courseId/learn" element={<StudentCourseLearn />} />
            <Route path="courses" element={<StudentMyCourses />} />
      <Route path="assignments" element={<StudentAssignments />} />
      <Route path="resources" element={<StudentResources />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<DashboardRedirect />} />
    </Routes>
    </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
