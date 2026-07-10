import { useState, useEffect } from 'react';
import { gradingAPI } from '@/lib/api';
import type { Submission, SubmissionAnswer } from '@/types';
import {
    ClipboardCheck, Search, Filter, ShieldAlert, Award, ChevronRight, X, ArrowLeft, ArrowRight, Save, CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function GradingQueue() {
    const [queue, setQueue] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'graded'>('all');
    const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);

    // Split View Modal details
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [gradingAnswers, setGradingAnswers] = useState<SubmissionAnswer[]>([]);
    const [manualMarks, setManualMarks] = useState<Record<string, number>>({});
    const [savingGrades, setSavingGrades] = useState(false);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const data = await gradingAPI.queue();
            setQueue(data);
        } catch (err) {
            console.error('Error fetching grading queue:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleOpenGrading = async (sub: Submission) => {
        try {
            const res = await gradingAPI.submission(sub.id);
            setGradingSubmission(res.submission);
            setGradingAnswers(res.answers);

            // Pre-fill existing marks if any
            const tempMarks: Record<string, number> = {};
            res.answers.forEach(ans => {
                if (ans.question_type !== 'mcq') {
                    tempMarks[ans.question_id] = ans.manual_marks || 0;
                }
            });
            setManualMarks(tempMarks);
        } catch (err) {
            alert('Failed to load submission sheets.');
        }
    };

    const handleScoreChange = (qId: string, val: string, maxMarks: number) => {
        const num = Math.min(maxMarks, Math.max(0, Number(val) || 0));
        setManualMarks(prev => ({ ...prev, [qId]: num }));
    };

    const handleSaveGrades = async () => {
        if (!gradingSubmission) return;
        setSavingGrades(true);
        try {
            const gradesPayload = Object.entries(manualMarks).map(([qId, marks]) => ({
                question_id: qId,
                marks,
            }));
            await gradingAPI.grade(gradingSubmission.id, gradesPayload);
            alert('Scores saved to submission.');
            setGradingSubmission(null);
            fetchQueue();
        } catch (err) {
            alert('Failed to save scores.');
        } finally {
            setSavingGrades(false);
        }
    };

    const toggleSelectSubmission = (id: string) => {
        setSelectedSubmissionIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSubmissionIds(filteredSubmissions.map(s => s.id));
        } else {
            setSelectedSubmissionIds([]);
        }
    };

    const handleBulkRelease = async () => {
        if (selectedSubmissionIds.length === 0) return;
        if (!confirm(`Are you sure you want to release grades for ${selectedSubmissionIds.length} submissions? Students will receive notifications.`)) return;

        try {
            await gradingAPI.bulkRelease(selectedSubmissionIds);
            alert('Grades published to students.');
            setSelectedSubmissionIds([]);
            fetchQueue();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Bulk release failed');
        }
    };

    const filteredSubmissions = queue.filter(sub => {
        const term = search.toLowerCase();
        const textMatch =
            sub.student_name?.toLowerCase().includes(term) ||
            sub.assessment_title?.toLowerCase().includes(term) ||
            sub.student_id.toLowerCase().includes(term);

        if (!textMatch) return false;

        if (filterStatus === 'pending_review') return sub.grading_status === 'pending_review';
        if (filterStatus === 'graded') return ['graded', 'auto_graded'].includes(sub.grading_status);
        return true;
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Grading Queue</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review student answers, apply score rubrics, and release assessment results.
                    </p>
                </div>
            </div>

            <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student, ID, or quiz..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="input text-xs w-44"
                    >
                        <option value="all">All Grading Statuses</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="graded">Graded / Auto-Graded</option>
                    </select>

                    <button
                        disabled={selectedSubmissionIds.length === 0}
                        onClick={handleBulkRelease}
                        className="btn btn-primary btn-sm flex items-center gap-1.5"
                    >
                        <Award size={13} />
                        <span>Release Selected ({selectedSubmissionIds.length})</span>
                    </button>
                </div>
            </div>

            {/* Queue items */}
            <div className="table-wrapper bg-white">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Retrieving grading submissions...</p>
                    </div>
                ) : filteredSubmissions.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-2" />
                        <p>No submissions awaiting evaluation.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <input
                                        type="checkbox"
                                        checked={filteredSubmissions.length > 0 && selectedSubmissionIds.length === filteredSubmissions.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-[#dbeeff]"
                                    />
                                </th>
                                <th>Student ID / Name</th>
                                <th>Assessment &amp; Date</th>
                                <th>Grading KPI</th>
                                <th>Tab Switches</th>
                                <th>Final Marks</th>
                                <th className="w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubmissions.map(sub => {
                                const isSelected = selectedSubmissionIds.includes(sub.id);
                                return (
                                    <tr key={sub.id} className={clsx(isSelected && 'bg-navy-50/30')}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectSubmission(sub.id)}
                                                className="rounded border-[#dbeeff]"
                                            />
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-semibold text-navy-900">{sub.student_name}</p>
                                                <p className="text-xs text-gray-400">{sub.student_id}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-sm font-medium">{sub.assessment_title}</p>
                                            <p className="text-xs text-gray-400">Submitted: {format(new Date(sub.submitted_at), 'Pp')}</p>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px]',
                                                sub.grading_status === 'pending_review' && 'badge-danger',
                                                sub.grading_status === 'graded' && 'badge-success',
                                                sub.grading_status === 'auto_graded' && 'badge-info',
                                                sub.grading_status === 'released' && 'badge-neutral'
                                            )}>
                                                {sub.grading_status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px]',
                                                sub.tab_switches > 3 ? 'badge-danger' : 'badge-neutral'
                                            )}>
                                                {sub.tab_switches} switches
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold text-navy-900 font-mono">
                                                {sub.final_score !== null ? `${sub.final_score} Points` : 'Awaiting Review'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => handleOpenGrading(sub)}
                                                className="btn btn-secondary btn-sm flex items-center gap-1 ml-auto"
                                            >
                                                <span>Evaluate</span>
                                                <ChevronRight size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Split-View evaluation Modal */}
            {gradingSubmission && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-5xl p-0 h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b p-5 bg-navy-900 text-white select-none">
                            <div>
                                <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold">{gradingSubmission.assessment_title}</p>
                                <h3 className="text-lg font-bold">Grading Sheet: {gradingSubmission.student_name} ({gradingSubmission.student_id})</h3>
                            </div>
                            <button onClick={() => setGradingSubmission(null)} className="text-white hover:text-gold-300">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Main content grid */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left pane: Questions and student answers */}
                            <div className="w-2/3 overflow-y-auto p-6 space-y-6 border-r border-[#dbeeff]">
                                <h4 className="text-xs font-bold text-navy-900 uppercase">Student Response Sheets</h4>
                                {gradingAnswers.map((ans, idx) => (
                                    <div key={ans.question_id} className="border border-navy-50 rounded-lg p-4 space-y-3 bg-white">
                                        <div className="flex justify-between items-start gap-4">
                                            <p className="text-sm font-semibold text-navy-950">
                                                <strong>Q{idx + 1}.</strong> {ans.question_text}
                                            </p>
                                            <span className="badge badge-neutral text-[9px] uppercase font-mono">{ans.question_type.replace('_', ' ')}</span>
                                        </div>

                                        <div className="bg-navy-50/50 border rounded-lg p-3 text-xs">
                                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Student Answer:</p>
                                            <p className="text-[#0A2540] font-medium whitespace-pre-wrap">{ans.student_answer || 'No answer submitted.'}</p>
                                        </div>

                                        {ans.rubric && (
                                            <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
                                                <p className="text-[10px] font-bold uppercase mb-1">Model Answer / Rubric Details:</p>
                                                <p className="whitespace-pre-wrap">{ans.rubric}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Right pane: Marks input panel */}
                            <div className="w-1/3 overflow-y-auto p-6 bg-gray-50 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-navy-900 uppercase">Evaluation Panel</h4>

                                    <div className="space-y-4">
                                        {gradingAnswers.map((ans, idx) => {
                                            const max = 10; // Simple mockup max
                                            if (ans.question_type === 'mcq') {
                                                return (
                                                    <div key={ans.question_id} className="bg-white border rounded-lg p-3 flex justify-between items-center text-xs">
                                                        <span className="font-semibold">Q{idx + 1} Score (Auto)</span>
                                                        <span className="font-bold text-green-700">{ans.auto_marks} / {ans.auto_marks} Marks</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={ans.question_id} className="bg-white border rounded-lg p-3 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-semibold text-navy-900">Q{idx + 1} Manual Grading</label>
                                                        <span className="text-[10px] text-gray-400">Max: {max} Marks</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={max}
                                                            value={manualMarks[ans.question_id] !== undefined ? manualMarks[ans.question_id] : ''}
                                                            onChange={e => handleScoreChange(ans.question_id, e.target.value, max)}
                                                            className="input py-1 px-2 text-xs"
                                                        />
                                                        <span className="text-xs text-gray-500 font-semibold">/ {max}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t pt-4 mt-6">
                                    <button
                                        disabled={savingGrades}
                                        onClick={handleSaveGrades}
                                        className="btn btn-primary w-full flex items-center justify-center gap-1.5"
                                    >
                                        <Save size={15} />
                                        <span>{savingGrades ? 'Saving Evaluation...' : 'Save Assessment Scores'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
