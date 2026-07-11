import React, { useState, useEffect } from 'react';
import { coursesAPI } from '@/lib/api';
import type { Course } from '@/types';
import { Plus, Search, Trash2, BookOpen, AlertOctagon, Check } from 'lucide-react';
import clsx from 'clsx';

export function CourseManagement() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const [newCourse, setNewCourse] = useState<Partial<Course>>({
        code: '',
        name: '',
        department: '',
        intake: '',
        learning_type: 'Full-time',
        lecturer: ''
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

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

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await coursesAPI.create(newCourse);
            showToast('Course added successfully.');
            setShowAddModal(false);
            setNewCourse({ code: '', name: '', department: '', intake: '', learning_type: 'Full-time', lecturer: '' });
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

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Course Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure institutional courses, departments, and enrollment intakes.
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>Add Course</span>
                </button>
            </div>

            <div className="card p-5 bg-white">
                <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80 mb-6">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none"
                    />
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading courses...</div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                            <p>No courses found.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Course Name</th>
                                    <th>Department</th>
                                    <th>Intake</th>
                                    <th>Learning Type</th>
                                    <th>Assigned Lecturer</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map(course => (
                                    <tr key={course.id}>
                                        <td className="font-mono font-medium text-navy-900">{course.code}</td>
                                        <td className="font-semibold text-navy-700">{course.name}</td>
                                        <td>{course.department || <span className="text-gray-400 italic">None</span>}</td>
                                        <td>{course.intake || <span className="text-gray-400 italic">-</span>}</td>
                                        <td>
                                            <span className={clsx("badge text-[10px]", course.learning_type === 'Full-time' ? 'badge-primary' : 'badge-warning')}>
                                                {course.learning_type || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>{course.lecturer || <span className="text-gray-400 italic">Unassigned</span>}</td>
                                        <td className="text-right">
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

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-lg p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h3 className="text-xl font-bold text-navy-900">Add New Course</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1">Course Code *</label>
                                    <input
                                        required
                                        type="text"
                                        className="input w-full uppercase"
                                        placeholder="e.g. CS101"
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1">Department</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="e.g. Computer Science"
                                        value={newCourse.department}
                                        onChange={e => setNewCourse({ ...newCourse, department: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-navy-900 mb-1">Intake (Cohort)</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="e.g. Fall 2026"
                                        value={newCourse.intake}
                                        onChange={e => setNewCourse({ ...newCourse, intake: e.target.value })}
                                    />
                                </div>
                            </div>

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
                                    <label className="block text-xs font-semibold text-navy-900 mb-1">Lecturer (Optional)</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="e.g. Dr. Jane Doe"
                                        value={newCourse.lecturer}
                                        onChange={e => setNewCourse({ ...newCourse, lecturer: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={clsx(
                    "fixed bottom-8 right-8 px-5 py-3.5 rounded-lg shadow-xl text-sm font-semibold text-white z-[100] flex items-center gap-2 animate-in slide-in-from-bottom-5",
                    toast.type === 'success' ? 'bg-green-600 border border-green-700' : 'bg-red-600 border border-red-700'
                )}>
                    {toast.type === 'success' ? <Check size={16} /> : <AlertOctagon size={16} />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
