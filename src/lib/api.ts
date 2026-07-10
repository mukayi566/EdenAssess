import axios, { AxiosError } from 'axios';
import type {
    AuthTokens, AuthUser, Student, StudentCSVRow, Lecturer, Course,
    Question, Assessment, Submission, SubmissionAnswer,
    AuditEvent, ProctoringFlag, CalendarEvent, ProvisionLog,
    AdminStats, LecturerStats, PaginatedResponse, AssessmentType,
} from '@/types';

// ─── Axios instance ────────────────────────────────────────────────────────────

export const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err: AxiosError<{ detail: string }>) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
    login: (username: string, password: string) =>
        api.post<AuthTokens>('/auth/login', new URLSearchParams({ username, password }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).then(r => r.data),

    me: () => api.get<AuthUser>('/auth/me').then(r => r.data),

    resetPassword: (current_password: string, new_password: string) =>
        api.post('/auth/reset-password', { current_password, new_password }).then(r => r.data),
};

// ─── Admin – Students ──────────────────────────────────────────────────────────

export const studentsAPI = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get<PaginatedResponse<Student>>('/admin/students', { params }).then(r => r.data),

    bulkUpload: (rows: StudentCSVRow[]) =>
        api.post<{ created: number; errors: string[] }>('/admin/students/bulk', { rows }).then(r => r.data),

    bulkDeliver: (student_ids: string[], channels: ('sms' | 'email')[]) =>
        api.post('/admin/students/deliver', { student_ids, channels }).then(r => r.data),

    retryDelivery: (student_id: string, channel: 'sms' | 'email') =>
        api.post(`/admin/students/${student_id}/retry-delivery`, { channel }).then(r => r.data),

    delete: (id: string) => api.delete(`/admin/students/${id}`).then(r => r.data),
};

// ─── Admin – Lecturers ─────────────────────────────────────────────────────────

export const lecturersAPI = {
    list: () => api.get<Lecturer[]>('/admin/lecturers').then(r => r.data),

    create: (data: Partial<Lecturer>) =>
        api.post<Lecturer>('/admin/lecturers', data).then(r => r.data),

    update: (id: string, data: Partial<Lecturer>) =>
        api.put<Lecturer>(`/admin/lecturers/${id}`, data).then(r => r.data),

    assignCourses: (id: string, course_ids: string[]) =>
        api.post(`/admin/lecturers/${id}/courses`, { course_ids }).then(r => r.data),

    delete: (id: string) => api.delete(`/admin/lecturers/${id}`).then(r => r.data),
};

// ─── Admin – Audit & Proctoring ────────────────────────────────────────────────

export const adminAPI = {
    stats: () => api.get<AdminStats>('/admin/stats').then(r => r.data),
    auditLog: () => api.get<AuditEvent[]>('/admin/audit-log').then(r => r.data),
    proctoringFlags: () => api.get<ProctoringFlag[]>('/admin/proctoring-flags').then(r => r.data),
    calendar: () => api.get<CalendarEvent[]>('/admin/calendar').then(r => r.data),
    provisionLog: () => api.get<ProvisionLog[]>('/admin/provision-log').then(r => r.data),
};

// ─── Courses ───────────────────────────────────────────────────────────────────

export const coursesAPI = {
    list: () => api.get<Course[]>('/courses').then(r => r.data),
    create: (data: Partial<Course>) => api.post<Course>('/courses', data).then(r => r.data),
};

// ─── Question Bank ─────────────────────────────────────────────────────────────

export const questionsAPI = {
    list: (params?: { course_id?: string; type?: string; difficulty?: string; topic?: string }) =>
        api.get<Question[]>('/lecturer/questions', { params }).then(r => r.data),

    create: (data: Partial<Question>) =>
        api.post<Question>('/lecturer/questions', data).then(r => r.data),

    update: (id: string, data: Partial<Question>) =>
        api.put<Question>(`/lecturer/questions/${id}`, data).then(r => r.data),

    delete: (id: string) => api.delete(`/lecturer/questions/${id}`).then(r => r.data),
};

// ─── Assessments ───────────────────────────────────────────────────────────────

export const assessmentsAPI = {
    list: (params?: { type?: AssessmentType }) =>
        api.get<Assessment[]>('/lecturer/assessments', { params }).then(r => r.data),

    get: (id: string) => api.get<Assessment>(`/lecturer/assessments/${id}`).then(r => r.data),

    create: (data: Partial<Assessment>) =>
        api.post<Assessment>('/lecturer/assessments', data).then(r => r.data),

    update: (id: string, data: Partial<Assessment>) =>
        api.put<Assessment>(`/lecturer/assessments/${id}`, data).then(r => r.data),

    publish: (id: string) =>
        api.post(`/lecturer/assessments/${id}/publish`).then(r => r.data),

    delete: (id: string) => api.delete(`/lecturer/assessments/${id}`).then(r => r.data),

    randomQuestions: (params: { course_id: string; topic: string; count: number; difficulty?: string }) =>
        api.get<Question[]>('/lecturer/questions/random', { params }).then(r => r.data),
};

// ─── Grading ───────────────────────────────────────────────────────────────────

export const gradingAPI = {
    queue: () => api.get<Submission[]>('/lecturer/grading/queue').then(r => r.data),

    submission: (id: string) =>
        api.get<{ submission: Submission; answers: SubmissionAnswer[] }>
            (`/lecturer/grading/submissions/${id}`).then(r => r.data),

    grade: (submission_id: string, grades: { question_id: string; marks: number }[]) =>
        api.post(`/lecturer/grading/submissions/${submission_id}/grade`, { grades }).then(r => r.data),

    bulkRelease: (submission_ids: string[]) =>
        api.post('/lecturer/grading/release', { submission_ids }).then(r => r.data),

    lecturerStats: () => api.get<LecturerStats>('/lecturer/stats').then(r => r.data),
};
