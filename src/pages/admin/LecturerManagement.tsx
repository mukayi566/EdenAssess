import { useState, useEffect } from 'react';
import { lecturersAPI, coursesAPI } from '@/lib/api';
import type { Lecturer, Course } from '@/types';
import {
    Users, Trash2, Plus, Edit3, X, Check, Search, AlertCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

const schema = z.object({
    staff_id: z.string().min(1, 'Staff ID is required'),
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function LecturerManagement() {
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals / forms
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
    const [error, setError] = useState('');

    // Course assignments
    const [showAssignModal, setShowAssignModal] = useState<Lecturer | null>(null);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [lecturersData, coursesData] = await Promise.all([
                lecturersAPI.list(),
                coursesAPI.list(),
            ]);
            setLecturers(lecturersData);
            setCourses(coursesData);
        } catch (err) {
            console.error('Error fetching lecturer data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenAdd = () => {
        reset();
        setError('');
        setEditingLecturer(null);
        setShowAddModal(true);
    };

    const handleOpenEdit = (lecturer: Lecturer) => {
        reset();
        setError('');
        setEditingLecturer(lecturer);
        setValue('staff_id', lecturer.staff_id);
        setValue('full_name', lecturer.full_name);
        setValue('email', lecturer.email);
        setValue('phone', lecturer.phone || '');
        setShowAddModal(true);
    };

    const handleOpenAssign = (lecturer: Lecturer) => {
        setSelectedCourses(lecturer.courses || []);
        setShowAssignModal(lecturer);
    };

    const onSubmit = async (data: FormData) => {
        setError('');
        try {
            if (editingLecturer) {
                await lecturersAPI.update(editingLecturer.id, data);
                alert('Lecturer account updated successfully.');
            } else {
                await lecturersAPI.create(data);
                alert('Lecturer provisioned successfully. Credential delivery queued.');
            }
            setShowAddModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit form.');
        }
    };

    const handleSaveAssignments = async () => {
        if (!showAssignModal) return;
        try {
            await lecturersAPI.assignCourses(showAssignModal.id, selectedCourses);
            alert('Course assignments updated.');
            setShowAssignModal(null);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to assign courses');
        }
    };

    const toggleCourseSelection = (courseCode: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseCode) ? prev.filter(c => c !== courseCode) : [...prev, courseCode]
        );
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this lecturer? This prevents portal login.')) return;
        try {
            await lecturersAPI.delete(id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete lecturer');
        }
    };

    const filteredLecturers = lecturers.filter(lec =>
        lec.full_name.toLowerCase().includes(search.toLowerCase()) ||
        lec.staff_id.toLowerCase().includes(search.toLowerCase()) ||
        lec.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Lecturer Accounts</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Provision academic staff, update profiles, and allocate lecturers to courses.
                    </p>
                </div>
                <button onClick={handleOpenAdd} className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    <span>Provision Lecturer</span>
                </button>
            </div>

            {/* Main content table */}
            <div className="card p-5 space-y-4">
                <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, ID or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none"
                    />
                </div>

                <div className="table-wrapper bg-white">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading lecturer accounts...</p>
                        </div>
                    ) : filteredLecturers.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Users size={40} className="mx-auto text-gray-300 mb-2" />
                            <p>No lecturers matching your requirements.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Staff ID</th>
                                    <th>Full Name</th>
                                    <th>Contact info</th>
                                    <th>Courses Assigned</th>
                                    <th>Need Password Reset</th>
                                    <th className="w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLecturers.map(lec => (
                                    <tr key={lec.id}>
                                        <td className="font-mono text-sm">{lec.staff_id}</td>
                                        <td className="font-semibold text-navy-900">{lec.full_name}</td>
                                        <td>
                                            <p className="text-xs text-gray-600">{lec.email}</p>
                                            {lec.phone && <p className="text-[10px] text-gray-400 mt-0.5">{lec.phone}</p>}
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {lec.courses && lec.courses.length > 0 ? (
                                                    lec.courses.map(code => (
                                                        <span key={code} className="badge badge-info text-[9px] font-semibold">
                                                            {code}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">None</span>
                                                )}
                                                <button
                                                    onClick={() => handleOpenAssign(lec)}
                                                    className="text-[10px] text-navy-600 hover:text-navy-900 font-bold ml-1 hover:underline"
                                                >
                                                    Modify
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px]',
                                                lec.must_reset_password ? 'badge-warning' : 'badge-success'
                                            )}>
                                                {lec.must_reset_password ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleOpenEdit(lec)}
                                                    className="btn btn-ghost btn-icon text-navy-600 hover:bg-navy-50/50"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lec.id)}
                                                    className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50/50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add / Edit Lecturer Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-md p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h3 className="text-lg font-bold text-navy-900">
                                {editingLecturer ? 'Edit Academic Profile' : 'Configure Lecturer Account'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-ghost text-gray-500 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">
                                <AlertCircle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="label">Staff ID</label>
                                <input
                                    {...register('staff_id')}
                                    className={`input ${errors.staff_id ? 'error' : ''}`}
                                    placeholder="e.g. LEC045"
                                    disabled={!!editingLecturer}
                                />
                                {errors.staff_id && <p className="error-msg">{errors.staff_id.message}</p>}
                            </div>

                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    {...register('full_name')}
                                    className={`input ${errors.full_name ? 'error' : ''}`}
                                    placeholder="e.g. Dr. Mukie Zgambo"
                                />
                                {errors.full_name && <p className="error-msg">{errors.full_name.message}</p>}
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <input
                                    {...register('email')}
                                    className={`input ${errors.email ? 'error' : ''}`}
                                    placeholder="e.g. m.zgambo@edenassess.co.zm"
                                />
                                {errors.email && <p className="error-msg">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="label">Phone Contact (Optional)</label>
                                <input
                                    {...register('phone')}
                                    className={`input ${errors.phone ? 'error' : ''}`}
                                    placeholder="e.g. +26097xxxxxxx"
                                />
                                {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary"
                                >
                                    {isSubmitting ? 'Processing...' : editingLecturer ? 'Save Profile' : 'Provision Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Courses Modal */}
            {showAssignModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-lg p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-navy-900">Map Lecturers to Courses</h3>
                                <p className="text-xs text-gray-500 mt-1">Assign {showAssignModal.full_name} to teach curriculum courses.</p>
                            </div>
                            <button onClick={() => setShowAssignModal(null)} className="btn btn-ghost text-gray-500 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {courses.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center p-4">No curriculums configured in directory.</p>
                            ) : (
                                courses.map(course => {
                                    const isSelected = selectedCourses.includes(course.code);
                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => toggleCourseSelection(course.code)}
                                            className={clsx(
                                                'flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors',
                                                isSelected ? 'bg-navy-50/50 border-navy-500' : 'hover:bg-gray-50 border-gray-200'
                                            )}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-navy-900">{course.code} - {course.name}</p>
                                                <p className="text-[11px] text-gray-400">{course.department || course.intake || ''}</p>
                                            </div>
                                            <div className={clsx(
                                                'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                                                isSelected ? 'bg-navy-900 border-[#0A2540] text-[#d40]' : 'border-gray-300'
                                            )}>
                                                {isSelected && <Check size={12} className="text-[#d4a015]" />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t mt-6">
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAssignments}
                                className="btn btn-primary"
                            >
                                Confirm Allocation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
