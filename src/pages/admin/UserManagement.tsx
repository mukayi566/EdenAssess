import { useState, useEffect, useCallback } from 'react';
import { adminsAPI, lecturersAPI } from '@/lib/api';
import type { Lecturer } from '@/types';
import {
    UserCog, Users, Trash2, Plus, X, Search, AlertCircle,
    ShieldCheck, GraduationCap, RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminRecord {
    id: string;
    staff_id: string;
    full_name: string;
    email: string;
    phone?: string;
    department?: string;
    created_at?: string;
}

type Tab = 'admins' | 'lecturers';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const adminSchema = z.object({
    staff_id: z.string().min(1, 'Staff ID is required'),
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    department: z.string().optional(),
});
type AdminForm = z.infer<typeof adminSchema>;

const lecturerSchema = z.object({
    staff_id: z.string().min(1, 'Staff ID is required'),
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
});
type LecturerForm = z.infer<typeof lecturerSchema>;

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
    label: string; value: number; icon: React.ReactNode; color: string;
}) {
    return (
        <div className={`card p-5 flex items-center gap-4 border-l-4 ${color}`}>
            <div className="p-2.5 bg-white/80 rounded-xl shadow-sm">{icon}</div>
            <div>
                <p className="text-2xl font-bold text-navy-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function UserManagement() {
    const [activeTab, setActiveTab] = useState<Tab>('admins');
    const [admins, setAdmins] = useState<AdminRecord[]>([]);
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState<'admin' | 'lecturer' | null>(null);
    const [formError, setFormError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // ── Admin form ──
    const adminForm = useForm<AdminForm>({ resolver: zodResolver(adminSchema) });
    // ── Lecturer form ──
    const lecturerForm = useForm<LecturerForm>({ resolver: zodResolver(lecturerSchema) });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [adminsData, lecturersData] = await Promise.all([
                adminsAPI.list(),
                lecturersAPI.list(),
            ]);
            setAdmins(adminsData as AdminRecord[]);
            setLecturers(lecturersData);
        } catch (err) {
            console.error('Failed to load user management data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Show flash message ──
    const flash = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    // ── Submit: create admin ──
    const onSubmitAdmin = async (data: AdminForm) => {
        setFormError('');
        try {
            await adminsAPI.create(data);
            adminForm.reset();
            setShowModal(null);
            flash('Admin account provisioned successfully.');
            fetchData();
        } catch (err: unknown) {
            const e = err as { message?: string };
            setFormError(e?.message || 'Failed to create admin account.');
        }
    };

    // ── Submit: create lecturer ──
    const onSubmitLecturer = async (data: LecturerForm) => {
        setFormError('');
        try {
            await lecturersAPI.create(data);
            lecturerForm.reset();
            setShowModal(null);
            flash('Lecturer account provisioned successfully.');
            fetchData();
        } catch (err: unknown) {
            const e = err as { message?: string };
            setFormError(e?.message || 'Failed to create lecturer account.');
        }
    };

    // ── Delete admin ──
    const handleDeleteAdmin = async (id: string, name: string) => {
        if (!confirm(`Remove admin account for "${name}"? This action cannot be undone.`)) return;
        try {
            await adminsAPI.delete(id);
            flash('Admin account removed.');
            fetchData();
        } catch (err: unknown) {
            const e = err as { message?: string };
            alert(e?.message || 'Failed to remove admin.');
        }
    };

    // ── Delete lecturer ──
    const handleDeleteLecturer = async (id: string, name: string) => {
        if (!confirm(`Remove lecturer account for "${name}"? This will prevent portal login.`)) return;
        try {
            await lecturersAPI.delete(id);
            flash('Lecturer account removed.');
            fetchData();
        } catch (err: unknown) {
            const e = err as { message?: string };
            alert(e?.message || 'Failed to remove lecturer.');
        }
    };

    const openModal = (type: 'admin' | 'lecturer') => {
        setFormError('');
        adminForm.reset();
        lecturerForm.reset();
        setShowModal(type);
    };

    // ── Filtered lists ──
    const filteredAdmins = admins.filter(a =>
        a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLecturers = lecturers.filter(l =>
        l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Provision and manage administrator and lecturer accounts across the platform.
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={() => openModal('lecturer')}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <GraduationCap size={15} />
                        <span>Add Lecturer</span>
                    </button>
                    <button
                        onClick={() => openModal('admin')}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <ShieldCheck size={15} />
                        <span>Add Admin</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                    label="Total Administrators"
                    value={admins.length}
                    icon={<ShieldCheck size={22} className="text-indigo-600" />}
                    color="border-indigo-500"
                />
                <StatCard
                    label="Total Lecturers"
                    value={lecturers.length}
                    icon={<GraduationCap size={22} className="text-emerald-600" />}
                    color="border-emerald-500"
                />
            </div>

            {/* Success flash */}
            {successMsg && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm font-medium animate-fade-in">
                    <span>✓</span> {successMsg}
                </div>
            )}

            {/* Tabs + Search */}
            <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-gray-100">
                    <div className="flex gap-0">
                        {(['admins', 'lecturers'] as Tab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSearch(''); }}
                                className={clsx(
                                    'px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors capitalize',
                                    activeTab === tab
                                        ? 'border-navy-900 text-navy-900'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                )}
                            >
                                {tab === 'admins' ? 'Administrators' : 'Lecturers'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pb-2">
                        <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-1.5 w-64">
                            <Search size={14} className="text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-transparent text-sm w-full outline-none"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            className="btn btn-ghost btn-icon"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={clsx(loading && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper bg-white">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading accounts...</p>
                        </div>
                    ) : activeTab === 'admins' ? (
                        filteredAdmins.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <UserCog size={40} className="mx-auto text-gray-300 mb-2" />
                                <p>No administrator accounts found.</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Staff ID</th>
                                        <th>Full Name</th>
                                        <th>Contact</th>
                                        <th>Department</th>
                                        <th>Joined</th>
                                        <th className="w-20 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAdmins.map(admin => (
                                        <tr key={admin.id}>
                                            <td className="font-mono text-sm">{admin.staff_id}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                                        {admin.full_name?.[0] || 'A'}
                                                    </div>
                                                    <span className="font-semibold text-navy-900">{admin.full_name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-xs text-gray-600">{admin.email}</p>
                                                {admin.phone && <p className="text-[10px] text-gray-400 mt-0.5">{admin.phone}</p>}
                                            </td>
                                            <td>
                                                {admin.department ? (
                                                    <span className="badge badge-info text-[10px]">{admin.department}</span>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">Not set</span>
                                                )}
                                            </td>
                                            <td className="text-xs text-gray-400">
                                                {admin.created_at
                                                    ? new Date(admin.created_at).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => handleDeleteAdmin(admin.id, admin.full_name)}
                                                    className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50/50"
                                                    title="Remove admin"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    ) : (
                        /* Lecturers tab */
                        filteredLecturers.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Users size={40} className="mx-auto text-gray-300 mb-2" />
                                <p>No lecturer accounts found.</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Staff ID</th>
                                        <th>Full Name</th>
                                        <th>Contact</th>
                                        <th>Password Reset?</th>
                                        <th>Joined</th>
                                        <th className="w-20 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLecturers.map(lec => (
                                        <tr key={lec.id}>
                                            <td className="font-mono text-sm">{lec.staff_id}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                                                        {lec.full_name?.[0] || 'L'}
                                                    </div>
                                                    <span className="font-semibold text-navy-900">{lec.full_name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-xs text-gray-600">{lec.email}</p>
                                                {lec.phone && <p className="text-[10px] text-gray-400 mt-0.5">{lec.phone}</p>}
                                            </td>
                                            <td>
                                                <span className={clsx(
                                                    'badge text-[10px]',
                                                    lec.must_reset_password ? 'badge-warning' : 'badge-success'
                                                )}>
                                                    {lec.must_reset_password ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="text-xs text-gray-400">
                                                {lec.created_at
                                                    ? new Date(lec.created_at).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => handleDeleteLecturer(lec.id, lec.full_name)}
                                                    className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50/50"
                                                    title="Remove lecturer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>

            {/* ── Modal: Create Admin ── */}
            {showModal === 'admin' && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-md p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-5">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-600" />
                                <h3 className="text-lg font-bold text-navy-900">Create Administrator</h3>
                            </div>
                            <button onClick={() => setShowModal(null)} className="btn btn-ghost text-gray-500 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">
                                <AlertCircle size={14} className="shrink-0" />
                                {formError}
                            </div>
                        )}

                        <form onSubmit={adminForm.handleSubmit(onSubmitAdmin)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label">Staff ID</label>
                                    <input
                                        {...adminForm.register('staff_id')}
                                        className={`input ${adminForm.formState.errors.staff_id ? 'error' : ''}`}
                                        placeholder="e.g. ADM001"
                                    />
                                    {adminForm.formState.errors.staff_id && (
                                        <p className="error-msg">{adminForm.formState.errors.staff_id.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Department (Optional)</label>
                                    <input
                                        {...adminForm.register('department')}
                                        className="input"
                                        placeholder="e.g. Registry"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    {...adminForm.register('full_name')}
                                    className={`input ${adminForm.formState.errors.full_name ? 'error' : ''}`}
                                    placeholder="e.g. Jane Phiri"
                                />
                                {adminForm.formState.errors.full_name && (
                                    <p className="error-msg">{adminForm.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <input
                                    {...adminForm.register('email')}
                                    type="email"
                                    className={`input ${adminForm.formState.errors.email ? 'error' : ''}`}
                                    placeholder="e.g. j.phiri@edenassess.co.zm"
                                />
                                {adminForm.formState.errors.email && (
                                    <p className="error-msg">{adminForm.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Phone (Optional)</label>
                                <input
                                    {...adminForm.register('phone')}
                                    className="input"
                                    placeholder="e.g. +26097xxxxxxx"
                                />
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
                                <strong>Note:</strong> The new admin will have full access to the portal. Ensure this is intentional before proceeding.
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(null)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adminForm.formState.isSubmitting}
                                    className="btn btn-primary"
                                >
                                    <Plus size={14} className="mr-1" />
                                    {adminForm.formState.isSubmitting ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Create Lecturer ── */}
            {showModal === 'lecturer' && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-md p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-5">
                            <div className="flex items-center gap-2">
                                <GraduationCap size={18} className="text-emerald-600" />
                                <h3 className="text-lg font-bold text-navy-900">Provision Lecturer</h3>
                            </div>
                            <button onClick={() => setShowModal(null)} className="btn btn-ghost text-gray-500 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-xs font-medium">
                                <AlertCircle size={14} className="shrink-0" />
                                {formError}
                            </div>
                        )}

                        <form onSubmit={lecturerForm.handleSubmit(onSubmitLecturer)} className="space-y-4">
                            <div>
                                <label className="label">Staff ID</label>
                                <input
                                    {...lecturerForm.register('staff_id')}
                                    className={`input ${lecturerForm.formState.errors.staff_id ? 'error' : ''}`}
                                    placeholder="e.g. LEC045"
                                />
                                {lecturerForm.formState.errors.staff_id && (
                                    <p className="error-msg">{lecturerForm.formState.errors.staff_id.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    {...lecturerForm.register('full_name')}
                                    className={`input ${lecturerForm.formState.errors.full_name ? 'error' : ''}`}
                                    placeholder="e.g. Dr. Mukie Zgambo"
                                />
                                {lecturerForm.formState.errors.full_name && (
                                    <p className="error-msg">{lecturerForm.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <input
                                    {...lecturerForm.register('email')}
                                    type="email"
                                    className={`input ${lecturerForm.formState.errors.email ? 'error' : ''}`}
                                    placeholder="e.g. m.zgambo@edenassess.co.zm"
                                />
                                {lecturerForm.formState.errors.email && (
                                    <p className="error-msg">{lecturerForm.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="label">Phone (Optional)</label>
                                <input
                                    {...lecturerForm.register('phone')}
                                    className="input"
                                    placeholder="e.g. +26097xxxxxxx"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(null)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={lecturerForm.formState.isSubmitting}
                                    className="btn btn-primary"
                                >
                                    <Plus size={14} className="mr-1" />
                                    {lecturerForm.formState.isSubmitting ? 'Provisioning...' : 'Provision Lecturer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
