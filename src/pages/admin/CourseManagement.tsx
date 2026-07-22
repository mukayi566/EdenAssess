import React, { useState, useEffect } from 'react';
import { coursesAPI, schoolsAPI, degreesAPI, lecturersAPI } from '@/lib/api';
import type { Course, School, Degree, Lecturer } from '@/types';
import { Plus, Search, Trash2, BookOpen, AlertOctagon, Check, Building2, GraduationCap, User, CalendarDays } from 'lucide-react';
import clsx from 'clsx';

interface NewCourseForm {
    code: string;
    name: string;
    school_id: string;
    degree_id: string;
    learning_type: string;
    lecturer_id: string;
    intake_year: string;
}

const EMPTY_FORM: NewCourseForm = {
    code: '',
    name: '',
    school_id: '',
    degree_id: '',
    learning_type: 'Full-time',
    lecturer_id: '',
    intake_year: '',
};

export function CourseManagement() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Reference data
    const [schools, setSchools] = useState<School[]>([]);
    const [degrees, setDegrees] = useState<Degree[]>([]);
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [refLoading, setRefLoading] = useState(true);

    const [newCourse, setNewCourse] = useState<NewCourseForm>(EMPTY_FORM);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Degrees filtered by selected school
    const filteredDegrees = newCourse.school_id
        ? degrees.filter(d => d.school_id === newCourse.school_id)
        : degrees;

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await coursesAPI.list();
            setCourses(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        setRefLoading(true);
        try {
            const [s, d, l] = await Promise.all([
                schoolsAPI.list(),
                degreesAPI.list(),
                lecturersAPI.list(),
            ]);
            setSchools(s);
            setDegrees(d);
            setLecturers(l);
        } catch (err) {
            console.error('Failed to load reference data:', err);
        } finally {
            setRefLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchReferenceData();
    }, []);

    const handleSchoolChange = (school_id: string) => {
        setNewCourse(prev => ({ ...prev, school_id, degree_id: '' }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedSchool = schools.find(s => s.id === newCourse.school_id);
            const selectedDegree = degrees.find(d => d.id === newCourse.degree_id);
            const selectedLecturer = lecturers.find(l => l.id === newCourse.lecturer_id);

            await coursesAPI.create({
                code: newCourse.code,
                name: newCourse.name,
                school_id: newCourse.school_id || undefined,
                school_name: selectedSchool?.name,
                degree_id: newCourse.degree_id || undefined,
                degree_name: selectedDegree?.name,
                learning_type: newCourse.learning_type,
                lecturer_id: newCourse.lecturer_id || undefined,
                lecturer: selectedLecturer?.full_name,
                department: selectedSchool?.name,
                intake: selectedDegree?.name,
                // e.g. 1.1, 2.2, 3.1
                intake_year: newCourse.intake_year ? parseFloat(newCourse.intake_year) : undefined,
            });
            showToast('Course added successfully.');
            setShowAddModal(false);
            setNewCourse(EMPTY_FORM);
            fetchCourses();
        } catch (err: any) {
            showToast(err.message || 'Failed to add course', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await coursesAPI.delete(id);
            showToast('Course deleted.');
            fetchCourses();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete course', 'error');
        }
    };

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    // Helper: convert 1.1 → "Y1 · S1"
    const formatSemester = (val: number | string) => {
        const [yr, sem] = String(val).split('.');
        return `Y${yr} · S${sem ?? '?'}`;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Sticky page header ──────────────────────────────── */}
            <div className="shrink-0 px-8 pt-8 pb-5 bg-[#f5f7fa] border-b border-[#dbeeff]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold text-navy-900">Course Management</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure institutional courses, schools, degree programmes, and assigned lecturers.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center gap-2 shrink-0"
                    >
                        <Plus size={16} />
                        <span>Add Course</span>
                    </button>
                </div>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div className="flex-1 overflow-hidden px-8 py-6">
                <div className="card flex flex-col h-full bg-white max-w-7xl mx-auto overflow-hidden">

                    {/* Search bar — stays put */}
                    <div className="shrink-0 px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-transparent text-sm w-full outline-none"
                            />
                        </div>
                    </div>

                    {/* Table — only this div scrolls */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">Loading courses...</div>
                        ) : filteredCourses.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                                <p>No courses found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#e5e7eb]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">School / Faculty</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Degree Programme</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Yr · Sem</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Learning Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Lecturer</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCourses.map(course => (
                                        <tr key={course.id} className="hover:bg-[#f8fbff] transition-colors">
                                            <td className="px-4 py-3 font-mono font-medium text-navy-900 whitespace-nowrap">{course.code}</td>
                                            <td className="px-4 py-3 font-semibold text-navy-700">{course.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {course.school_name || course.department || <span className="text-gray-400 italic">None</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={course.degree_name || course.intake}>
                                                {course.degree_name || course.intake || <span className="text-gray-400 italic">—</span>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {course.intake_year != null ? (
                                                    <span className="badge badge-info text-[10px] font-semibold tracking-wide">
                                                        {formatSemester(course.intake_year)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx('badge text-[10px]', course.learning_type === 'Full-time' ? 'badge-primary' : 'badge-warning')}>
                                                    {course.learning_type || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {course.lecturer || <span className="text-gray-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add Course Modal ─────────────────────────────────── */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-lg p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-navy-900">Add New Course</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Select school and degree from configured lists.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>

                        {refLoading ? (
                            <div className="py-10 flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Loading reference data...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                {/* Course Code + Name */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-navy-900 mb-1">Course Code *</label>
                                        <input
                                            required
                                            type="text"
                                            className="input w-full uppercase"
                                            placeholder="e.g. ICT3421"
                                            value={newCourse.code}
                                            onChange={e => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-navy-900 mb-1">Course Name *</label>
                                        <input
                                            required
                                            type="text"
                                            className="input w-full"
                                            placeholder="e.g. Intro to Programming"
                                            value={newCourse.name}
                                            onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* School / Faculty */}
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1">
                                        <Building2 size={12} />
                                        School / Faculty
                                    </label>
                                    {schools.length === 0 ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                                            ⚠ No schools configured yet. Go to <strong>Schools &amp; Degrees</strong> to add one first.
                                        </div>
                                    ) : (
                                        <select
                                            className="input w-full"
                                            value={newCourse.school_id}
                                            onChange={e => handleSchoolChange(e.target.value)}
                                        >
                                            <option value="">— Select School / Faculty —</option>
                                            {schools.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Degree Programme */}
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1">
                                        <GraduationCap size={12} />
                                        Degree Programme
                                    </label>
                                    <select
                                        className="input w-full"
                                        value={newCourse.degree_id}
                                        onChange={e => setNewCourse({ ...newCourse, degree_id: e.target.value })}
                                        disabled={!newCourse.school_id || filteredDegrees.length === 0}
                                    >
                                        <option value="">
                                            {!newCourse.school_id
                                                ? '— Select a school first —'
                                                : filteredDegrees.length === 0
                                                    ? '— No degrees for this school —'
                                                    : '— Select Degree Programme —'}
                                        </option>
                                        {filteredDegrees.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                        ))}
                                    </select>
                                    {newCourse.school_id && filteredDegrees.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            No degree programmes yet. Add them in <strong>Schools &amp; Degrees</strong>.
                                        </p>
                                    )}
                                </div>

                                {/* Year & Semester */}
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1">
                                        <CalendarDays size={12} />
                                        Year &amp; Semester *
                                    </label>
                                    <select
                                        required
                                        className="input w-full"
                                        value={newCourse.intake_year}
                                        onChange={e => setNewCourse({ ...newCourse, intake_year: e.target.value })}
                                    >
                                        <option value="">— Select Year &amp; Semester —</option>
                                        <optgroup label="Year 1">
                                            <option value="1.1">Year 1 · Semester 1 (1.1)</option>
                                            <option value="1.2">Year 1 · Semester 2 (1.2)</option>
                                        </optgroup>
                                        <optgroup label="Year 2">
                                            <option value="2.1">Year 2 · Semester 1 (2.1)</option>
                                            <option value="2.2">Year 2 · Semester 2 (2.2)</option>
                                        </optgroup>
                                        <optgroup label="Year 3">
                                            <option value="3.1">Year 3 · Semester 1 (3.1)</option>
                                            <option value="3.2">Year 3 · Semester 2 (3.2)</option>
                                        </optgroup>
                                        <optgroup label="Year 4">
                                            <option value="4.1">Year 4 · Semester 1 (4.1)</option>
                                            <option value="4.2">Year 4 · Semester 2 (4.2)</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        e.g. <strong>1.1</strong> = Year 1, Semester 1 &nbsp;·&nbsp; <strong>3.2</strong> = Year 3, Semester 2
                                    </p>
                                </div>

                                {/* Learning Type + Lecturer */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-navy-900 mb-1">Learning Type</label>
                                        <select
                                            className="input w-full"
                                            value={newCourse.learning_type}
                                            onChange={e => setNewCourse({ ...newCourse, learning_type: e.target.value })}
                                        >
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Distance">Distance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1">
                                            <User size={12} />
                                            Lecturer <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <select
                                            className="input w-full"
                                            value={newCourse.lecturer_id}
                                            onChange={e => setNewCourse({ ...newCourse, lecturer_id: e.target.value })}
                                        >
                                            <option value="">— Unassigned —</option>
                                            {lecturers.map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.full_name}{l.staff_id ? ` (${l.staff_id})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {lecturers.length === 0 && (
                                            <p className="text-xs text-gray-400 mt-1">No lecturers provisioned yet.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Course</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={clsx(
                    'fixed bottom-8 right-8 px-5 py-3.5 rounded-lg shadow-xl text-sm font-semibold text-white z-[100] flex items-center gap-2 animate-in slide-in-from-bottom-5',
                    toast.type === 'success' ? 'bg-green-600 border border-green-700' : 'bg-red-600 border border-red-700'
                )}>
                    {toast.type === 'success' ? <Check size={16} /> : <AlertOctagon size={16} />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
