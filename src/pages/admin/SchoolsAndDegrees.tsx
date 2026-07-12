import React, { useState, useEffect } from 'react';
import { schoolsAPI, degreesAPI } from '@/lib/api';
import type { School, Degree } from '@/types';
import {
    Plus, Trash2, Building2, GraduationCap, Check, AlertOctagon, Search, Layers
} from 'lucide-react';
import clsx from 'clsx';

export function SchoolsAndDegrees() {
    /* ── Schools state ────────────────────────────── */
    const [schools, setSchools] = useState<School[]>([]);
    const [schoolSearch, setSchoolSearch] = useState('');
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [newSchool, setNewSchool] = useState({ name: '', code: '', description: '' });
    const [schoolLoading, setSchoolLoading] = useState(true);

    /* ── Degrees state ────────────────────────────── */
    const [degrees, setDegrees] = useState<Degree[]>([]);
    const [degreeSearch, setDegreeSearch] = useState('');
    const [showDegreeModal, setShowDegreeModal] = useState(false);
    const [newDegree, setNewDegree] = useState({ name: '', code: '', school_id: '', level: 'Undergraduate' as Degree['level'] });
    const [degreeLoading, setDegreeLoading] = useState(true);

    /* ── Shared ───────────────────────────────────── */
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'schools' | 'degrees'>('schools');

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    /* ── Fetch ────────────────────────────────────── */
    const fetchSchools = async () => {
        setSchoolLoading(true);
        try { setSchools(await schoolsAPI.list()); }
        catch (err) { console.error(err); }
        finally { setSchoolLoading(false); }
    };

    const fetchDegrees = async () => {
        setDegreeLoading(true);
        try { setDegrees(await degreesAPI.list()); }
        catch (err) { console.error(err); }
        finally { setDegreeLoading(false); }
    };

    useEffect(() => { fetchSchools(); fetchDegrees(); }, []);

    /* ── Create School ────────────────────────────── */
    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await schoolsAPI.create(newSchool);
            showToast('School added successfully.');
            setShowSchoolModal(false);
            setNewSchool({ name: '', code: '', description: '' });
            fetchSchools();
        } catch (err: any) {
            showToast(err.message || 'Failed to add school', 'error');
        } finally { setSaving(false); }
    };

    /* ── Delete School ────────────────────────────── */
    const handleDeleteSchool = async (id: string) => {
        if (!confirm('Delete this school? All associated degrees will also be removed.')) return;
        try {
            await schoolsAPI.delete(id);
            showToast('School deleted.');
            fetchSchools();
            fetchDegrees();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete school', 'error');
        }
    };

    /* ── Create Degree ────────────────────────────── */
    const handleCreateDegree = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDegree.school_id) { showToast('Please select a school first.', 'error'); return; }
        setSaving(true);
        try {
            await degreesAPI.create(newDegree);
            showToast('Degree programme added successfully.');
            setShowDegreeModal(false);
            setNewDegree({ name: '', code: '', school_id: '', level: 'Undergraduate' });
            fetchDegrees();
        } catch (err: any) {
            showToast(err.message || 'Failed to add degree', 'error');
        } finally { setSaving(false); }
    };

    /* ── Delete Degree ────────────────────────────── */
    const handleDeleteDegree = async (id: string) => {
        if (!confirm('Delete this degree programme?')) return;
        try {
            await degreesAPI.delete(id);
            showToast('Degree deleted.');
            fetchDegrees();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete degree', 'error');
        }
    };

    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(schoolSearch.toLowerCase())
    );

    const filteredDegrees = degrees.filter(d =>
        d.name.toLowerCase().includes(degreeSearch.toLowerCase()) ||
        d.code.toLowerCase().includes(degreeSearch.toLowerCase())
    );

    const levelBadge: Record<string, string> = {
        Undergraduate: 'badge-primary',
        Postgraduate: 'badge-warning',
        Diploma: 'badge-info',
        Certificate: 'badge-neutral',
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900 flex items-center gap-2">
                        <Layers className="text-navy-500" size={28} />
                        Schools &amp; Degree Programmes
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure the institutional schools and degree programmes used when provisioning students.
                    </p>
                </div>
                <button
                    onClick={() => activeTab === 'schools' ? setShowSchoolModal(true) : setShowDegreeModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>{activeTab === 'schools' ? 'Add School' : 'Add Degree'}</span>
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-[#f0f7ff] border border-[#dbeeff] rounded-xl px-5 py-4 flex items-start gap-3">
                <GraduationCap className="text-navy-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-navy-700 leading-relaxed">
                    Data entered here populates the <strong>School</strong> and <strong>Degree Programme</strong> dropdowns in the
                    Provision Student form on the Student Roster page. Add all schools before creating their degree programmes.
                </p>
            </div>

            {/* Tabs */}
            <div className="tab-list">
                <button
                    onClick={() => setActiveTab('schools')}
                    className={clsx('tab-item flex items-center gap-2', activeTab === 'schools' && 'active')}
                >
                    <Building2 size={15} />
                    <span>Schools / Faculties</span>
                    <span className="ml-1 text-[10px] font-bold bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded-full">
                        {schools.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('degrees')}
                    className={clsx('tab-item flex items-center gap-2', activeTab === 'degrees' && 'active')}
                >
                    <GraduationCap size={15} />
                    <span>Degree Programmes</span>
                    <span className="ml-1 text-[10px] font-bold bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded-full">
                        {degrees.length}
                    </span>
                </button>
            </div>

            {/* ── SCHOOLS TAB ─────────────────────────────── */}
            {activeTab === 'schools' && (
                <div className="card p-6 space-y-5">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                        <Search size={15} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search schools..."
                            value={schoolSearch}
                            onChange={e => setSchoolSearch(e.target.value)}
                            className="bg-transparent text-sm w-full outline-none"
                        />
                    </div>

                    <div className="table-wrapper">
                        {schoolLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Loading schools...</p>
                            </div>
                        ) : filteredSchools.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Building2 size={40} className="mx-auto text-gray-300 mb-2" />
                                <p>No schools configured. Click "Add School" to get started.</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>School / Faculty Name</th>
                                        <th>Description</th>
                                        <th>Degree Programmes</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchools.map(school => (
                                        <tr key={school.id}>
                                            <td className="font-mono font-bold text-navy-900 uppercase">{school.code}</td>
                                            <td className="font-semibold text-navy-800">{school.name}</td>
                                            <td className="text-sm text-gray-500 max-w-xs truncate" title={school.description}>
                                                {school.description || <span className="italic text-gray-300">—</span>}
                                            </td>
                                            <td>
                                                <span className="badge badge-info text-[10px]">
                                                    {degrees.filter(d => d.school_id === school.id).length} programmes
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => handleDeleteSchool(school.id)}
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
            )}

            {/* ── DEGREES TAB ─────────────────────────────── */}
            {activeTab === 'degrees' && (
                <div className="card p-6 space-y-5">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                        <Search size={15} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search degrees..."
                            value={degreeSearch}
                            onChange={e => setDegreeSearch(e.target.value)}
                            className="bg-transparent text-sm w-full outline-none"
                        />
                    </div>

                    <div className="table-wrapper">
                        {degreeLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Loading degree programmes...</p>
                            </div>
                        ) : filteredDegrees.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <GraduationCap size={40} className="mx-auto text-gray-300 mb-2" />
                                <p>No degree programmes configured. Add schools first, then add degrees.</p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Degree Programme Name</th>
                                        <th>School / Faculty</th>
                                        <th>Level</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDegrees.map(degree => {
                                        const school = schools.find(s => s.id === degree.school_id);
                                        return (
                                            <tr key={degree.id}>
                                                <td className="font-mono font-bold text-navy-900 uppercase">{degree.code}</td>
                                                <td className="font-semibold text-navy-800">{degree.name}</td>
                                                <td>
                                                    {school ? (
                                                        <span className="flex items-center gap-1.5 text-sm">
                                                            <Building2 size={13} className="text-navy-400" />
                                                            {school.name}
                                                        </span>
                                                    ) : (
                                                        <span className="italic text-gray-400">Unknown</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={clsx('badge text-[10px]', levelBadge[degree.level] || 'badge-neutral')}>
                                                        {degree.level}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleDeleteDegree(degree.id)}
                                                        className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50"
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
                </div>
            )}

            {/* ── ADD SCHOOL MODAL ────────────────────────── */}
            {showSchoolModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-md p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-5">
                            <div>
                                <h3 className="text-xl font-bold text-navy-900">Add School / Faculty</h3>
                                <p className="text-xs text-gray-500 mt-0.5">This will appear as a selectable school when provisioning students.</p>
                            </div>
                            <button onClick={() => setShowSchoolModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>

                        <form onSubmit={handleCreateSchool} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">School Code</label>
                                    <input
                                        required
                                        type="text"
                                        className="input w-full uppercase"
                                        placeholder="e.g. SICT"
                                        value={newSchool.code}
                                        onChange={e => setNewSchool({ ...newSchool, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-navy-900">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="input w-full"
                                        placeholder="e.g. School of ICT"
                                        value={newSchool.name}
                                        onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-navy-900">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                                <textarea
                                    rows={2}
                                    className="input w-full resize-none"
                                    placeholder="Brief description of the school or faculty..."
                                    value={newSchool.description}
                                    onChange={e => setNewSchool({ ...newSchool, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowSchoolModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">
                                    {saving ? 'Saving...' : 'Add School'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ADD DEGREE MODAL ────────────────────────── */}
            {showDegreeModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-md p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-5">
                            <div>
                                <h3 className="text-xl font-bold text-navy-900">Add Degree Programme</h3>
                                <p className="text-xs text-gray-500 mt-0.5">This will appear in the Degree dropdown when provisioning students.</p>
                            </div>
                            <button onClick={() => setShowDegreeModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>

                        <form onSubmit={handleCreateDegree} className="space-y-4">
                            {schools.length === 0 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
                                    ⚠ No schools configured yet. Please add a school first before creating degree programmes.
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-navy-900">School / Faculty *</label>
                                        <select
                                            required
                                            className="input w-full"
                                            value={newDegree.school_id}
                                            onChange={e => setNewDegree({ ...newDegree, school_id: e.target.value })}
                                        >
                                            <option value="">— Select School —</option>
                                            {schools.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-navy-900">Degree Code *</label>
                                            <input
                                                required
                                                type="text"
                                                className="input w-full uppercase"
                                                placeholder="e.g. BSCS"
                                                value={newDegree.code}
                                                onChange={e => setNewDegree({ ...newDegree, code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-navy-900">Level *</label>
                                            <select
                                                className="input w-full"
                                                value={newDegree.level}
                                                onChange={e => setNewDegree({ ...newDegree, level: e.target.value as Degree['level'] })}
                                            >
                                                <option value="Undergraduate">Undergraduate</option>
                                                <option value="Postgraduate">Postgraduate</option>
                                                <option value="Diploma">Diploma</option>
                                                <option value="Certificate">Certificate</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-navy-900">Full Programme Name *</label>
                                        <input
                                            required
                                            type="text"
                                            className="input w-full"
                                            placeholder="e.g. Bachelor of Science in Computer Science"
                                            value={newDegree.name}
                                            onChange={e => setNewDegree({ ...newDegree, name: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowDegreeModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving || schools.length === 0} className="btn btn-primary">
                                    {saving ? 'Saving...' : 'Add Degree Programme'}
                                </button>
                            </div>
                        </form>
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
