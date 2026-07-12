// ─── Auth ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'lecturer';

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    must_reset_password: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthTokens {
    access_token: string;
    token_type: string;
}

// ─── Student ─────────────────────────────────────────────────────────────────

export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export interface Student {
    id: string;
    student_id: string;
    full_name: string;
    program: string;
    year: number;
    email: string;
    phone?: string;
    school_id?: string;
    school_name?: string;
    degree_id?: string;
    degree_name?: string;
    must_reset_password: boolean;
    created_at: string;
    sms_status: DeliveryStatus;
    email_status: DeliveryStatus;
}

export interface StudentCSVRow {
    student_id: string;
    full_name: string;
    program: string;
    year: string | number;
    email: string;
    phone?: string;
    _errors?: string[];
    _isDuplicate?: boolean;
}

// ─── Lecturer ─────────────────────────────────────────────────────────────────

export interface Lecturer {
    id: string;
    staff_id: string;
    full_name: string;
    email: string;
    phone?: string;
    courses: string[];
    must_reset_password: boolean;
    created_at: string;
}

// ─── School ──────────────────────────────────────────────────────────────────

export interface School {
    id: string;
    code: string;
    name: string;
    description?: string;
    created_at?: string;
}

// ─── Degree Programme ────────────────────────────────────────────────────────

export type DegreeLevel = 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Certificate';

export interface Degree {
    id: string;
    code: string;
    name: string;
    school_id: string;
    level: DegreeLevel;
    created_at?: string;
}

// ─── Course ───────────────────────────────────────────────────────────────────

export interface Course {
    id: string;
    code: string;
    name: string;
    department?: string;
    intake?: string;
    learning_type?: string;
    lecturer?: string;
    created_at?: string;
}

// ─── Question Bank ────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'short_answer' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MCQOption {
    id: string;
    text: string;
    is_correct: boolean;
}

export interface Question {
    id: string;
    course_id: string;
    course_name?: string;
    topic: string;
    type: QuestionType;
    text: string;
    difficulty: Difficulty;
    marks: number;
    options?: MCQOption[];      // MCQ only
    model_answer?: string;      // short_answer / essay
    created_at: string;
    updated_at: string;
}

// ─── Assessment ───────────────────────────────────────────────────────────────

export type AssessmentType = 'quiz' | 'cat1' | 'cat2' | 'exam';
export type AssessmentStatus = 'draft' | 'published' | 'active' | 'closed';
export type LatePolicy = 'allow' | 'deny' | 'deduct';

export interface Assessment {
    id: string;
    title: string;
    course_id: string;
    course_name?: string;
    type: AssessmentType;
    status: AssessmentStatus;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    attempt_limit: number;
    late_policy: LatePolicy;
    shuffle_questions: boolean;
    tab_switch_logging: boolean;
    total_marks: number;
    question_ids: string[];
    created_by: string;
    created_at: string;
}

// ─── Submission / Grading ─────────────────────────────────────────────────────

export type GradingStatus = 'auto_graded' | 'pending_review' | 'graded' | 'released';

export interface Submission {
    id: string;
    assessment_id: string;
    assessment_title?: string;
    student_id: string;
    student_name?: string;
    submitted_at: string;
    auto_score: number | null;
    manual_score: number | null;
    final_score: number | null;
    grading_status: GradingStatus;
    tab_switches: number;
    time_taken_minutes: number;
}

export interface SubmissionAnswer {
    question_id: string;
    question_text: string;
    question_type: QuestionType;
    student_answer: string;
    is_correct?: boolean;
    auto_marks?: number;
    manual_marks?: number;
    rubric?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditEvent {
    id: string;
    event_type: string;
    actor_id: string;
    actor_name: string;
    target_id?: string;
    target_name?: string;
    details: string;
    created_at: string;
}

// ─── Proctoring / Flags ───────────────────────────────────────────────────────

export interface ProctoringFlag {
    id: string;
    submission_id: string;
    student_name: string;
    assessment_title: string;
    course_name: string;
    tab_switches: number;
    background_events: number;
    timing_anomaly: boolean;
    flagged_at: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEvent {
    id: string;
    title: string;
    course: string;
    type: AssessmentType;
    start: string;
    end: string;
    status: AssessmentStatus;
}

// ─── Provision Log ────────────────────────────────────────────────────────────

export interface ProvisionLog {
    id: string;
    provisioned_by: string;
    target_id: string;
    target_name: string;
    target_type: 'student' | 'lecturer';
    sms_status: DeliveryStatus;
    email_status: DeliveryStatus;
    created_at: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface AdminStats {
    total_students: number;
    total_lecturers: number;
    total_courses: number;
    active_assessments: number;
    flagged_sessions_today: number;
}

export interface LecturerStats {
    total_questions: number;
    active_assessments: number;
    pending_grading: number;
    total_submissions: number;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiError {
    detail: string;
}
