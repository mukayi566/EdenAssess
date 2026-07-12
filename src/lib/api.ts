import axios, { AxiosError } from 'axios';
import { supabase } from '@/lib/supabase';
import type {
    AuthTokens, AuthUser, Student, StudentCSVRow, Lecturer, Course,
    School, Degree,
    Question, Assessment, Submission, SubmissionAnswer,
    AuditEvent, ProctoringFlag, CalendarEvent, ProvisionLog,
    AdminStats, LecturerStats, AssessmentType,
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
// Queries the dedicated `students` table (role-separated from admins & lecturers)

export const studentsAPI = {
    list: async (params?: { page?: number; limit?: number; search?: string }) => {
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search || '';

        // ── Try the dedicated `students` table first ──────────────────────────
        // Fall back to `users` table filtered by role='student' if the
        // dedicated table doesn't exist yet (pre-migration state).
        let query = supabase
            .from('students')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(
                `full_name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`
            );
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        // If the dedicated table doesn't exist, fall back to the users table
        // filtered by role='student'
        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
            console.warn('`students` table not found – falling back to users table with role filter');

            let fallbackQuery = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .eq('role', 'student');

            if (search) {
                fallbackQuery = fallbackQuery.or(
                    `full_name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`
                );
            }

            const { data: fbData, error: fbError, count: fbCount } = await fallbackQuery
                .order('created_at', { ascending: false })
                .range(from, to);

            if (fbError) {
                console.error('Fallback fetch error:', fbError);
                throw new Error(fbError.message);
            }

            return {
                items: (fbData || []).map((d: any) => ({
                    id: d.id,
                    student_id: d.student_id || '',
                    full_name: d.full_name,
                    program: d.programme || d.program || 'Unknown',
                    year: d.year_of_study || 1,
                    email: d.email,
                    phone: d.phone || '',
                    must_reset_password: !!d.is_first_login,
                    created_at: d.created_at,
                    sms_status: (d.sms_status || 'pending') as Student['sms_status'],
                    email_status: (d.email_status || 'pending') as Student['email_status'],
                })) as Student[],
                total: fbCount || 0,
                page,
                limit,
            };
        }

        if (error) {
            console.error('Supabase fetch error:', error);
            throw new Error(error.message);
        }

        return {
            items: (data || []).map((d: any) => ({
                id: d.id,
                student_id: d.student_id || '',
                full_name: d.full_name,
                program: d.programme || d.program || 'Unknown',
                year: d.year_of_study || 1,
                email: d.email,
                phone: d.phone || '',
                must_reset_password: !!d.is_first_login,
                created_at: d.created_at,
                sms_status: (d.sms_status || 'pending') as Student['sms_status'],
                email_status: (d.email_status || 'pending') as Student['email_status'],
            })) as Student[],
            total: count || 0,
            page,
            limit,
        };
    },

    create: async (data: Partial<Student> & { school_id?: string; degree_id?: string }) => {
        // Insert directly into the dedicated students table
        const { data: inserted, error } = await supabase
            .from('students')
            .insert({
                student_id: data.student_id,
                full_name: data.full_name,
                email: data.email,
                phone: data.phone || null,
                programme: data.program,
                year_of_study: data.year,
                school_id: data.school_id || null,
                degree_id: data.degree_id || null,
                sms_status: 'pending',
                email_status: 'pending',
                is_first_login: true,
            })
            .select()
            .single();

        if (error) {
            // Fall back to RPC if dedicated table doesn't exist yet
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                const { data: resData, error: rpcError } = await supabase.rpc('provision_student', {
                    p_student_id: data.student_id,
                    p_full_name: data.full_name,
                    p_email: data.email,
                    p_program: data.program,
                    p_year: data.year,
                    p_phone: data.phone || ''
                });
                if (rpcError) throw new Error(rpcError.message);
                return resData;
            }
            console.error('Insert error:', error);
            throw new Error(error.message);
        }

        return { ...inserted, temp_password: null };
    },

    delete: async (id: string) => {
        // Try dedicated table first
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
            // Fall back to users table
            const { error: ue } = await supabase.from('users').delete().eq('id', id);
            if (ue) throw new Error(ue.message);
            return true;
        }
        if (error) throw new Error(error.message);
        return true;
    },

    bulkUpload: (rows: StudentCSVRow[]) =>
        api.post<{ created: number; errors: string[] }>('/admin/students/bulk', { rows }).then(r => r.data),

    bulkDeliver: (student_ids: string[], channels: ('sms' | 'email')[]) =>
        api.post('/admin/students/deliver', { student_ids, channels }).then(r => r.data),

    retryDelivery: (student_id: string, channel: 'sms' | 'email') =>
        api.post(`/admin/students/${student_id}/retry-delivery`, { channel }).then(r => r.data),
};

// ─── Admin – Lecturers ─────────────────────────────────────────────────────────
// Queries the dedicated `lecturers` table (role-separated)

export const lecturersAPI = {
    list: async (): Promise<Lecturer[]> => {
        // Try dedicated lecturers table first
        const { data, error } = await supabase
            .from('lecturers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
            // Fall back to users table filtered by role
            console.warn('`lecturers` table not found – falling back to users table with role filter');
            const { data: fbData, error: fbError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'lecturer')
                .order('created_at', { ascending: false });
            if (fbError) throw new Error(fbError.message);
            return (fbData || []).map((d: any) => ({
                id: d.id,
                staff_id: d.student_id || d.staff_id || '',
                full_name: d.full_name,
                email: d.email,
                phone: d.phone || '',
                courses: [],
                must_reset_password: !!d.is_first_login,
                created_at: d.created_at,
            })) as Lecturer[];
        }

        if (error) throw new Error(error.message);

        return (data || []).map((d: any) => ({
            id: d.id,
            staff_id: d.staff_id || '',
            full_name: d.full_name,
            email: d.email,
            phone: d.phone || '',
            courses: [],
            must_reset_password: !!d.is_first_login,
            created_at: d.created_at,
        })) as Lecturer[];
    },

    create: async (data: Partial<Lecturer>) => {
        const { data: inserted, error } = await supabase
            .from('lecturers')
            .insert({
                staff_id: data.staff_id,
                full_name: data.full_name,
                email: data.email,
                phone: data.phone || null,
                sms_status: 'pending',
                email_status: 'pending',
                is_first_login: true,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return inserted as Lecturer;
    },

    update: (id: string, data: Partial<Lecturer>) =>
        api.put<Lecturer>(`/admin/lecturers/${id}`, data).then(r => r.data),

    assignCourses: (id: string, course_ids: string[]) =>
        api.post(`/admin/lecturers/${id}/courses`, { course_ids }).then(r => r.data),

    delete: async (id: string) => {
        const { error } = await supabase.from('lecturers').delete().eq('id', id);
        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
            const { error: ue } = await supabase.from('users').delete().eq('id', id);
            if (ue) throw new Error(ue.message);
            return true;
        }
        if (error) throw new Error(error.message);
        return true;
    },
};

// ─── Admin – Admins ────────────────────────────────────────────────────────────
// Queries the dedicated `admins` table (role-separated)

export const adminsAPI = {
    list: async () => {
        // Try dedicated admins table first
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
            // Fall back to users table filtered by role
            console.warn('`admins` table not found – falling back to users table with role filter');
            const { data: fbData, error: fbError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'admin')
                .order('created_at', { ascending: false });
            if (fbError) throw new Error(fbError.message);
            return fbData || [];
        }

        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (data: { staff_id: string; full_name: string; email: string; phone?: string; department?: string }) => {
        const { data: inserted, error } = await supabase
            .from('admins')
            .insert(data)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return inserted;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('admins').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },
};

// ─── Admin – Audit & Proctoring ────────────────────────────────────────────────

export const adminAPI = {
    stats: async (): Promise<AdminStats> => {
        // Count from dedicated role tables; fall back to users table if not yet migrated
        const [studentsRes, lecturersRes, coursesRes, activeAssessmentsRes] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }),
            supabase.from('lecturers').select('*', { count: 'exact', head: true }),
            supabase.from('courses').select('*', { count: 'exact', head: true }),
            supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);

        // Fall back to users table for counts if dedicated tables don't exist
        let studentsCount = studentsRes.count;
        let lecturersCount = lecturersRes.count;
        if (studentsRes.error && (studentsRes.error.code === '42P01' || studentsRes.error.message.includes('does not exist'))) {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
            studentsCount = count;
        }
        if (lecturersRes.error && (lecturersRes.error.code === '42P01' || lecturersRes.error.message.includes('does not exist'))) {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'lecturer');
            lecturersCount = count;
        }

        return {
            total_students: studentsCount || 0,
            total_lecturers: lecturersCount || 0,
            total_courses: coursesRes.count || 0,
            active_assessments: activeAssessmentsRes.count || 0,
            flagged_sessions_today: 0,
        };
    },

    auditLog: async (): Promise<AuditEvent[]> => {
        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw new Error(error.message);
        return (data || []) as AuditEvent[];
    },

    proctoringFlags: async (): Promise<ProctoringFlag[]> => {
        const { data, error } = await supabase
            .from('proctoring_flags')
            .select('*')
            .order('flagged_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data || []) as ProctoringFlag[];
    },

    calendar: async (): Promise<CalendarEvent[]> => {
        const { data, error } = await supabase
            .from('assessments')
            .select('id, title, course_name, type, start_time, end_time, status')
            .order('start_time', { ascending: true });
        if (error) throw new Error(error.message);
        return (data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            course: a.course_name || '',
            type: a.type,
            start: a.start_time,
            end: a.end_time,
            status: a.status,
        })) as CalendarEvent[];
    },

    provisionLog: async (): Promise<ProvisionLog[]> => {
        const { data, error } = await supabase
            .from('provision_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw new Error(error.message);
        return (data || []) as ProvisionLog[];
    },
};

// ─── Courses ───────────────────────────────────────────────────────────────────

export const coursesAPI = {
    list: async () => {
        const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data as Course[];
    },
    create: async (data: Partial<Course>) => {
        const { data: created, error } = await supabase.from('courses').insert(data).select().single();
        if (error) throw new Error(error.message);
        return created as Course;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },
};

// ─── Schools ───────────────────────────────────────────────────────────────────

export const schoolsAPI = {
    list: async (): Promise<School[]> => {
        const { data, error } = await supabase.from('schools').select('*').order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return (data || []) as School[];
    },
    create: async (data: { name: string; code: string; description?: string }): Promise<School> => {
        const { data: created, error } = await supabase.from('schools').insert(data).select().single();
        if (error) throw new Error(error.message);
        return created as School;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('schools').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },
};

// ─── Degrees ───────────────────────────────────────────────────────────────────

export const degreesAPI = {
    list: async (): Promise<Degree[]> => {
        const { data, error } = await supabase.from('degrees').select('*').order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return (data || []) as Degree[];
    },
    listBySchool: async (school_id: string): Promise<Degree[]> => {
        const { data, error } = await supabase.from('degrees').select('*').eq('school_id', school_id).order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return (data || []) as Degree[];
    },
    create: async (data: { name: string; code: string; school_id: string; level: string }): Promise<Degree> => {
        const { data: created, error } = await supabase.from('degrees').insert(data).select().single();
        if (error) throw new Error(error.message);
        return created as Degree;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('degrees').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },
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
