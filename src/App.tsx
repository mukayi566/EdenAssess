import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/RequireAuth';
import { AppLayout } from '@/components/AppLayout';

// Public pages
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { StudentRoster } from '@/pages/admin/StudentRoster';
import { LecturerManagement } from '@/pages/admin/LecturerManagement';
import { CalendarPage } from '@/pages/admin/CalendarPage';
import { ProctoringPage } from '@/pages/admin/ProctoringPage';
import { AuditPage } from '@/pages/admin/AuditPage';

// Lecturer pages
import { LecturerDashboard } from '@/pages/lecturer/LecturerDashboard';
import { QuestionBank } from '@/pages/lecturer/QuestionBank';
import { AssessmentsList } from '@/pages/lecturer/AssessmentsList';
import { CreateAssessment } from '@/pages/lecturer/CreateAssessment';
import { GradingQueue } from '@/pages/lecturer/GradingQueue';
import { AnalyticsPage } from '@/pages/lecturer/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/reset-password"
              element={
                <RequireAuth>
                  <ResetPasswordPage />
                </RequireAuth>
              }
            />

            {/* Admin layout */}
            <Route
              path="/admin"
              element={
                <RequireAuth roles={['admin']}>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<StudentRoster />} />
              <Route path="lecturers" element={<LecturerManagement />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="flags" element={<ProctoringPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>

            {/* Lecturer layout */}
            <Route
              path="/lecturer"
              element={
                <RequireAuth roles={['lecturer']}>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<LecturerDashboard />} />
              <Route path="questions" element={<QuestionBank />} />
              <Route path="assessments" element={<AssessmentsList />} />
              <Route path="assessments/new" element={<CreateAssessment />} />
              <Route path="grading" element={<GradingQueue />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Fallbacks */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
