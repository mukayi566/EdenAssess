import { useState, useEffect } from 'react';
import { lecturersAPI, coursesAPI } from '@/lib/api';
import type { Lecturer, Course } from '@/types';
import {
    Users, Trash2, Plus, Edit3, X, Check, Search, AlertCircle, RefreshCw,
    CheckCircle2, AlertOctagon, Send
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

// Generates a unique staff ID: LEC-{YY}{3-digit index based on ms}
// e.g. LEC-260047  (year 2026, millisecond-derived suffix)
function generateStaffId(): string {
    const year = new Date().getFullYear().toString().slice(2); // "26"
    const suffix = String(Math.floor((Date.now() % 100000) / 100)).padStart(3, '0');
    return `LEC-${year}${suffix}`;
}

const schema = z.object({
    staff_id: z.string().min(1, 'Staff ID is required'),
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Success Notification Modal ─────────────────────────────────────────────────
interface SuccessModalProps {
    title: string;
    message: string;
    details?: { label: string; value: string }[];
    onClose: () => void;
}

function SuccessModal({ title, message, details, onClose }: SuccessModalProps) {
    return (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
            <div className="modal-box max-w-md p-0 overflow-hidden">
                {/* Green header strip */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/30">
                        <CheckCircle2 size={36} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-sm text-green-100 mt-1">{message}</p>
                </div>

                {/* Detail rows */}
                {details && details.length > 0 && (
                    <div className="px-6 py-4 space-y-3 bg-gray-50 border-b">
                        {details.map(d => (
                            <div key={d.label} className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.label}</span>
                                <span className="text-sm font-semibold text-navy-900 font-mono">{d.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delivery queued notice */}
                <div className="px-6 py-4 flex items-start gap-3 bg-blue-50 border-b border-blue-100">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Send size={13} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-blue-800">Credential Delivery Queued</p>
                        <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                            Login credentials will be delivered to the lecturer via email and SMS.
                            They can use their staff ID and the default password to sign in.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Check size={15} />
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Error Notification Popup ───────────────────────────────────────────────────
interface ErrorModalProps {
    message: string;
    onClose: () => void;
}

function ErrorModal({ message, onClose }: ErrorModalProps) {
    return (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
            <div className="modal-box max-w-sm p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/30">
                        <AlertOctagon size={36} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Action Failed</h3>
                    <p className="text-sm text-red-100 mt-1">{message}</p>
                </div>
                <div className="px-6 py-4 flex justify-end">
                    <button onClick={onClose} className="btn btn-secondary">Dismiss</button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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

    // Notification popups
    const [successPopup, setSuccessPopup] = useState<{
        title: string;
        message: string;
        details?: { label: string; value: string }[];
    } | null>(null);
    const [errorPopup, setErrorPopup] = useState<string | null>(null);

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
        setValue('staff_id', generateStaffId());
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
                setShowAddModal(false);
                setSuccessPopup({
                    title: 'Profile Updated',
                    message: 'Lecturer account has been updated successfully.',
                    details: [
                        { label: 'Staff ID', value: data.staff_id },
                        { label: 'Name', value: data.full_name },
                        { label: 'Email', value: data.email },
                    ],
                });
            } else {
                await lecturersAPI.create(data);
                setShowAddModal(false);
                setSuccessPopup({
                    title: 'Lecturer Provisioned Successfully',
                    message: 'The lecturer account has been created and credentials are queued for delivery.',
                    details: [
                        { label: 'Staff ID', value: data.staff_id },
                        { label: 'Name', value: data.full_name },
                        { label: 'Email', value: data.email },
                    ],
                });
            }
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to submit form.');
        }
    };

    const handleSaveAssignments = async () => {
        if (!showAssignModal) return;
        try {
            await lecturersAPI.assignCourses(showAssignModal.id, selectedCourses);
            setShowAssignModal(null);
            setSuccessPopup({
                title: 'Courses Assigned',
                message: `${showAssignModal.full_name}'s course allocations have been updated.`,
                details: [
                    { label: 'Courses assigned', value: selectedCourses.length === 0 ? 'None' : selectedCourses.join(', ') },
                ],
            });
            fetchData();
        } catch (err: any) {
            setErrorPopup(err.response?.data?.detail || err.message || 'Failed to assign courses.');
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
            setErrorPopup(err.response?.data?.detail || err.message || 'Failed to delete lecturer.');
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label">Staff ID</label>
                                    {!editingLecturer && (
                                        <button
                                            type="button"
                                            onClick={() => setValue('staff_id', generateStaffId())}
                                            className="flex items-center gap-1 text-[10px] text-navy-600 hover:text-navy-900 font-semibold transition-colors"
                                            title="Generate a new ID"
                                        >
                                            <RefreshCw size={11} />
                                            Regenerate
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        {...register('staff_id')}
                                        className={`input pr-20 font-mono tracking-wider ${errors.staff_id ? 'error' : ''} ${!editingLecturer ? 'bg-[#f0f7ff] text-navy-900' : ''}`}
                                        placeholder="e.g. LEC-26001"
                                        readOnly={!!editingLecturer}
                                    />
                                    {!editingLecturer && (
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-navy-100 text-navy-700 text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                                            AUTO
                                        </span>
                                    )}
                                </div>
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
                                                <p className="text-[11px] text-gray-400">
                                                    {course.school_name || course.department || ''}{course.degree_name ? ` · ${course.degree_name}` : ''}
                                                </p>
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

            {/* ── Success Popup ──────────────────────────────────────────────── */}
            {successPopup && (
                <SuccessModal
                    title={successPopup.title}
                    message={successPopup.message}
                    details={successPopup.details}
                    onClose={() => setSuccessPopup(null)}
                />
            )}

            {/* ── Error Popup ────────────────────────────────────────────────── */}
            {errorPopup && (
                <ErrorModal
                    message={errorPopup}
                    onClose={() => setErrorPopup(null)}
                />
            )}
        </div>
    );
}
