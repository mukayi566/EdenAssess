import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { studentsAPI } from '@/lib/api';
import type { Student, StudentCSVRow } from '@/types';
import {
    Upload, Check, AlertOctagon, RefreshCw, Send,
    Trash2, Mail, Phone, Search, Users, ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

export function StudentRoster() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // CSV parsing & preview states
    const [csvPreview, setCsvPreview] = useState<StudentCSVRow[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [uploadStats, setUploadStats] = useState({ total: 0, valid: 0, invalid: 0 });
    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [provisionedCredentials, setProvisionedCredentials] = useState<{ id: string; email: string; password: string } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const [newStudent, setNewStudent] = useState({
        student_id: '',
        full_name: '',
        program: '',
        year: '',
        email: '',
        phone: ''
    });

    // Password delivery states
    const [deliveryChannels, setDeliveryChannels] = useState<{ sms: boolean; email: boolean }>({ sms: true, email: true });
    const [delivering, setDelivering] = useState(false);
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await studentsAPI.list({ page, limit: 10, search });
            setStudents(data.items);
            setTotalPages(Math.ceil(data.total / 10));
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [page, search]);

    const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Validate rows client-side
                const seenIds = new Set<string>();
                const processed: StudentCSVRow[] = results.data.map((row: any) => {
                    const student_id = (row.student_id || row['Student ID'] || '').trim();
                    const full_name = (row.full_name || row['Full Name'] || '').trim();
                    const program = (row.program || row['Program'] || '').trim();
                    const year = String(row.year || row['Year'] || '').trim();
                    const email = (row.email || row['Email'] || '').trim();
                    const phone = (row.phone || row['Phone'] || '').trim();

                    const errors: string[] = [];

                    if (!student_id) errors.push('Missing Student ID');
                    if (!full_name) errors.push('Missing Full Name');
                    if (!program) errors.push('Missing Program');
                    if (!year) errors.push('Missing Year');
                    if (!email) {
                        errors.push('Missing Email');
                    } else if (!/\S+@\S+\.\S+/.test(email)) {
                        errors.push('Invalid Email Format');
                    }

                    let isDuplicate = false;
                    if (student_id) {
                        if (seenIds.has(student_id)) {
                            isDuplicate = true;
                            errors.push('Duplicate Student ID in file');
                        } else {
                            seenIds.add(student_id);
                        }
                    }

                    return {
                        student_id,
                        full_name,
                        program,
                        year,
                        email,
                        phone,
                        _errors: errors,
                        _isDuplicate: isDuplicate,
                    };
                });

                const validCount = processed.filter(r => r._errors!.length === 0).length;
                const invalidCount = processed.length - validCount;

                setCsvPreview(processed);
                setUploadStats({ total: processed.length, valid: validCount, invalid: invalidCount });
                setShowPreviewModal(true);
                // Clear input to allow uploading same file
                e.target.value = '';
            },
        });
    };

    const handleConfirmImport = async () => {
        setIsUploading(true);
        try {
            // Send only rows that have no errors
            const validRows = csvPreview.filter(r => r._errors!.length === 0);
            const res = await studentsAPI.bulkUpload(validRows);
            showToast(`Import complete. Successfully created ${res.created} student accounts.`);
            setShowPreviewModal(false);
            setCsvPreview([]);
            fetchStudents();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Import failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectStudent = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(students.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleBulkDeliver = async () => {
        if (selectedIds.length === 0) return;
        const channels: ('sms' | 'email')[] = [];
        if (deliveryChannels.sms) channels.push('sms');
        if (deliveryChannels.email) channels.push('email');

        if (channels.length === 0) {
            alert('Please select at least one delivery channel (SMS or Email).');
            return;
        }

        setDelivering(true);
        try {
            await studentsAPI.bulkDeliver(selectedIds, channels);
            showToast('Default passwords dispatched to delivery channels.');
            setSelectedIds([]);
            fetchStudents();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to trigger password delivery', 'error');
        } finally {
            setDelivering(false);
        }
    };

    const handleRetryDelivery = async (student_id: string, channel: 'sms' | 'email') => {
        try {
            await studentsAPI.retryDelivery(student_id, channel);
            showToast(`Retrying delivery of credentials via ${channel.toUpperCase()}...`);
            fetchStudents();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Retry failed', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student account? This action is irreversible.')) return;
        try {
            await studentsAPI.delete(id);
            showToast('Student deleted successfully.');
            fetchStudents();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to delete student', 'error');
        }
    };

    const handleAddSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            const result = await studentsAPI.create({
                ...newStudent,
                year: parseFloat(newStudent.year)
            });
            showToast('Student provisioned successfully.');
            setProvisionedCredentials({
                id: newStudent.student_id,
                email: newStudent.email,
                password: result.temp_password || 'Password stored securely'
            });
            setShowAddModal(false);
            setNewStudent({ student_id: '', full_name: '', program: '', year: '', email: '', phone: '' });
            fetchStudents();
        } catch (err: any) {
            showToast(err.response?.data?.detail || err.message || 'Failed to provision student', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Student Roster Provisioning</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Import student records via CSV and manage temporary password deployment.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Users size={16} />
                        <span>Add Student</span>
                    </button>
                    <label className="btn btn-primary cursor-pointer flex items-center gap-2">
                        <Upload size={16} />
                        <span>Bulk CSV Upload</span>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleCsvSelect}
                        />
                    </label>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Delivery Actions + List */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Controls Panel */}
                    <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by ID, name or email..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm w-full outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <span className="text-xs text-gray-500 font-semibold uppercase">
                                Channel Dispatch:
                            </span>
                            <label className="flex items-center gap-2 text-sm text-navy-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deliveryChannels.sms}
                                    onChange={e => setDeliveryChannels(c => ({ ...c, sms: e.target.checked }))}
                                    className="rounded border-[#dbeeff]"
                                />
                                <Phone size={14} className="text-navy-500" />
                                <span>SMS</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-navy-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deliveryChannels.email}
                                    onChange={e => setDeliveryChannels(c => ({ ...c, email: e.target.checked }))}
                                    className="rounded border-[#dbeeff]"
                                />
                                <Mail size={14} className="text-navy-500" />
                                <span>Email</span>
                            </label>

                            <button
                                disabled={selectedIds.length === 0 || delivering}
                                onClick={handleBulkDeliver}
                                className="btn btn-secondary btn-sm flex items-center gap-2"
                            >
                                <Send size={13} />
                                <span>Send Temporary Info ({selectedIds.length})</span>
                            </button>
                        </div>
                    </div>

                    {/* Roster Table */}
                    <div className="table-wrapper bg-white">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Loading student roster...</p>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Users size={40} className="mx-auto text-gray-300 mb-2" />
                                <p>No students found. Use Bulk CSV Upload to provision student accounts.</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input
                                                type="checkbox"
                                                checked={students.length > 0 && selectedIds.length === students.length}
                                                onChange={handleSelectAll}
                                                className="rounded border-[#dbeeff]"
                                            />
                                        </th>
                                        <th>Student ID / Name</th>
                                        <th>Program &amp; Year</th>
                                        <th>Contact Info</th>
                                        <th>SMS Delivery</th>
                                        <th>Email Delivery</th>
                                        <th>Reset Req.</th>
                                        <th className="w-10 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => {
                                        const isSelected = selectedIds.includes(student.id);
                                        return (
                                            <tr key={student.id} className={clsx(isSelected && 'bg-navy-50/30')}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectStudent(student.id)}
                                                        className="rounded border-[#dbeeff]"
                                                    />
                                                </td>
                                                <td>
                                                    <div>
                                                        <p className="font-semibold text-navy-900">{student.full_name}</p>
                                                        <p className="text-xs text-gray-400">{student.student_id}</p>
                                                    </div>
                                                </td>
                                                <td>
                                                    <p className="text-sm">{student.program}</p>
                                                    <p className="text-xs text-gray-400">Year {student.year}</p>
                                                </td>
                                                <td>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <Mail size={11} className="text-navy-300" />
                                                        {student.email}
                                                    </p>
                                                    {student.phone && (
                                                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                                            <Phone size={11} className="text-navy-300" />
                                                            {student.phone}
                                                        </p>
                                                    )}
                                                </td>
                                                {/* SMS Delivery Badge */}
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx('badge text-[10px]',
                                                            student.sms_status === 'sent' && 'badge-success',
                                                            student.sms_status === 'failed' && 'badge-danger',
                                                            student.sms_status === 'pending' && 'badge-warning'
                                                        )}>
                                                            {student.sms_status}
                                                        </span>
                                                        {student.sms_status === 'failed' && (
                                                            <button
                                                                onClick={() => handleRetryDelivery(student.id, 'sms')}
                                                                className="p-0.5 text-navy-600 hover:text-navy-900"
                                                                title="Retry SMS"
                                                            >
                                                                <RefreshCw size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Email Delivery Badge */}
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx('badge text-[10px]',
                                                            student.email_status === 'sent' && 'badge-success',
                                                            student.email_status === 'failed' && 'badge-danger',
                                                            student.email_status === 'pending' && 'badge-warning'
                                                        )}>
                                                            {student.email_status}
                                                        </span>
                                                        {student.email_status === 'failed' && (
                                                            <button
                                                                onClick={() => handleRetryDelivery(student.id, 'email')}
                                                                className="p-0.5 text-navy-600 hover:text-navy-900"
                                                                title="Retry Email"
                                                            >
                                                                <RefreshCw size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={clsx('badge text-[10px]',
                                                        student.must_reset_password ? 'badge-warning' : 'badge-success'
                                                    )}>
                                                        {student.must_reset_password ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleDelete(student.id)}
                                                        className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50/50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t pt-4">
                        <span className="text-xs text-gray-500">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="btn btn-secondary btn-sm"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="btn btn-secondary btn-sm"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Template details & info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-navy-900 mb-4">Credentials Delivery System</h2>
                        <p className="text-xs text-gray-500 leading-relaxed mb-4">
                            Temporary passwords are generated on-demand matching the patterns configured for the student. When sent:
                        </p>
                        <ul className="space-y-3 text-xs text-gray-600 border-b pb-4 mb-4">
                            <li className="flex items-start gap-2">
                                <Check size={14} className="text-success-500 shrink-0 mt-0.5" />
                                <span>Auto-hashes temporary password for first-time session checks</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check size={14} className="text-success-500 shrink-0 mt-0.5" />
                                <span>Dispatches text notifications with gateway verification status tracking</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check size={14} className="text-success-500 shrink-0 mt-0.5" />
                                <span>Forces <code>must_reset_password = true</code> verification middleware checks</span>
                            </li>
                        </ul>

                        <h3 className="text-xs font-semibold text-navy-900 uppercase mb-2">Message Template Preview</h3>
                        <div className="bg-navy-950 rounded-lg p-4 font-mono text-[10px] text-navy-100/90 leading-relaxed relative">
                            <div className="absolute top-2 right-2 flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            </div>
                            <p className="text-[#d4a015] border-b border-navy-800 pb-2 mb-2">To: [Student Phone/Email]</p>
                            <p>Welcome to Eden University!</p>
                            <p className="mt-1">Your EdenAssess account has been provisioned.</p>
                            <p className="mt-2 text-white">ID: <strong>{"{STUDENT_ID}"}</strong></p>
                            <p className="text-white">Temp Pass: <strong>{"{TEMP_PASS}"}</strong></p>
                            <p className="mt-2">Login: <span className="text-[#aed3f3] underline">edenassess.eden.edu.zm/login</span></p>
                            <p className="mt-2 text-warning-500">Note: You are required to update your temporary password immediately upon your first login attempt.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSV Preview & Validation Modal */}
            {showPreviewModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-4xl p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-navy-900">Pre-Import CSV Review</h3>
                                <p className="text-xs text-gray-500 mt-1">Review validation output and resolve malformed fields before database synchronization.</p>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="btn btn-ghost text-gray-500 hover:text-navy-900"
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Validation Metrics */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-[#f0f7ff] border border-[#dbeeff] rounded-lg p-3">
                                <p className="text-xs text-navy-900">Total Parsed</p>
                                <p className="text-xl font-bold text-navy-900">{uploadStats.total}</p>
                            </div>
                            <div className="bg-[#dcfce7] border border-green-200 rounded-lg p-3">
                                <p className="text-xs text-green-700">Valid Records (Import Ready)</p>
                                <p className="text-xl font-bold text-green-800">{uploadStats.valid}</p>
                            </div>
                            <div className="bg-[#fee2e2] border border-red-200 rounded-lg p-3">
                                <p className="text-xs text-red-700">Requires Correction (Skipped)</p>
                                <p className="text-xl font-bold text-red-800">{uploadStats.invalid}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="table-wrapper max-h-[300px] border">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Student ID</th>
                                        <th>Full Name</th>
                                        <th>Program</th>
                                        <th>Email</th>
                                        <th>Errors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvPreview.map((row, idx) => {
                                        const hasErr = row._errors!.length > 0;
                                        return (
                                            <tr key={idx} className={clsx(hasErr && 'bg-red-50/50')}>
                                                <td>
                                                    {hasErr ? (
                                                        <AlertOctagon size={16} className="text-red-500" />
                                                    ) : (
                                                        <Check size={16} className="text-green-500" />
                                                    )}
                                                </td>
                                                <td className="font-mono text-xs">{row.student_id || <span className="text-red-400 font-semibold">[MISSING]</span>}</td>
                                                <td>{row.full_name || <span className="text-red-400 font-semibold">[MISSING]</span>}</td>
                                                <td>{row.program || <span className="text-red-400 font-semibold">[MISSING]</span>}</td>
                                                <td>{row.email || <span className="text-red-400 font-semibold">[MISSING]</span>}</td>
                                                <td>
                                                    {hasErr ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {row._errors!.map((err, i) => (
                                                                <span key={i} className="text-[10px] text-red-650 bg-red-100/50 px-1.5 py-0.5 rounded font-medium">
                                                                    {err}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-green-600 font-semibold">Valid</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <p className="text-xs text-gray-500">
                                {uploadStats.valid === 0 ? 'No valid entries found to import.' : `Ready to import ${uploadStats.valid} students.`}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPreviewModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={uploadStats.valid === 0 || isUploading}
                                    onClick={handleConfirmImport}
                                    className="btn btn-primary"
                                >
                                    {isUploading ? 'Importing Roster...' : `Confirm Import Roster`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Single Student Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-lg p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-navy-900">Provision Student</h3>
                                <p className="text-xs text-gray-500 mt-1">Manually provision a student account and dispatch credentials.</p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="btn btn-ghost text-gray-500 hover:text-navy-900"
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleAddSingleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Student ID *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={newStudent.student_id}
                                        onChange={e => setNewStudent({ ...newStudent, student_id: e.target.value })}
                                        placeholder="e.g. EDS001"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={newStudent.full_name}
                                        onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Program *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={newStudent.program}
                                        onChange={e => setNewStudent({ ...newStudent, program: e.target.value })}
                                        placeholder="e.g. BSc Computer Science"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Year of Study *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        min="1"
                                        max="7"
                                        className="input w-full"
                                        value={newStudent.year}
                                        onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                                        placeholder="e.g. 1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        className="input w-full"
                                        value={newStudent.email}
                                        onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                        placeholder="student@example.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="input w-full"
                                        value={newStudent.phone}
                                        onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                                        placeholder="+260..."
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end mt-6 pt-4 border-t gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="btn btn-primary"
                                >
                                    {isUploading ? 'Provisioning...' : 'Provision Student Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div className={clsx(
                    "fixed bottom-8 right-8 px-5 py-3.5 rounded-lg shadow-xl text-sm font-semibold text-white z-[100] flex items-center gap-2 transition-all transform",
                    toastMessage.type === 'success' ? 'bg-green-600 border border-green-700' : 'bg-red-600 border border-red-700'
                )}>
                    {toastMessage.type === 'success' ? <Check size={16} /> : <AlertOctagon size={16} />}
                    <span>{toastMessage.message}</span>
                </div>
            )}

            {/* Post-Provisioning Credentials Modal */}
            {provisionedCredentials && (
                <div className="modal-overlay z-[200]">
                    <div className="modal-box max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={24} className="text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-navy-900 mb-2">Account Provisioned!</h3>
                        <p className="text-xs text-gray-500 mb-6">The student account is ready. Please share these default credentials with the student securely.</p>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Login</p>
                                <p className="font-mono text-sm text-navy-900 bg-white border px-2 py-1.5 rounded">{provisionedCredentials.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Default Temporary Password</p>
                                <div className="flex items-center justify-between font-mono text-base font-bold text-navy-900 bg-white border border-warning-200 px-3 py-2 rounded">
                                    {provisionedCredentials.password}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setProvisionedCredentials(null)}
                            className="btn btn-primary w-full"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
