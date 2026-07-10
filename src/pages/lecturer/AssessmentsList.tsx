import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentsAPI } from '@/lib/api';
import type { Assessment, AssessmentType } from '@/types';
import {
    FileText, Plus, Search, Trash2, Edit3, X, HelpCircle, Save, Check, Filter, Calendar, Users, BarChart3, Radio
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function AssessmentsList() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<AssessmentType | 'all'>('all');

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const data = await assessmentsAPI.list();
            setAssessments(data);
        } catch (err) {
            console.error('Error fetching assessments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssessments();
    }, []);

    const handlePublish = async (id: string) => {
        if (!confirm('Are you sure you want to publish this assessment? Students will see it in their calendars and apps immediately.')) return;
        try {
            await assessmentsAPI.publish(id);
            alert('Assessment successfully published.');
            fetchAssessments();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to publish assessment');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assessment? All associated configurations will be removed.')) return;
        try {
            await assessmentsAPI.delete(id);
            fetchAssessments();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete assessment');
        }
    };

    const filteredAssessments = assessments.filter(ast => {
        if (filterType === 'all') return true;
        return ast.type === filterType;
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Manage Assessments</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Build midterm assessments, quizzes, and standard exams for courses.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/lecturer/assessments/new')}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>New Assessment</span>
                </button>
            </div>

            {/* Filter and stats */}
            <div className="card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 bg-white border border-[#dbeeff] rounded-lg p-1.5 self-start">
                    <Filter size={14} className="text-gray-400 ml-2" />
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                        className="bg-transparent text-xs font-semibold text-navy-900 outline-none pr-6 cursor-pointer"
                    >
                        <option value="all">All Styles</option>
                        <option value="exam">Standard Exam</option>
                        <option value="cat1">Continuous Assessment Test 1</option>
                        <option value="cat2">Continuous Assessment Test 2</option>
                        <option value="quiz">Weekly Quiz</option>
                    </select>
                </div>
                <div className="text-xs font-semibold text-gray-400">
                    Listed Assessments: <strong className="text-navy-900 text-sm font-bold ml-1">{filteredAssessments.length}</strong>
                </div>
            </div>

            {/* Grid of assessments */}
            {loading ? (
                <div className="card p-12 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading assessments list...</p>
                </div>
            ) : filteredAssessments.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                    <FileText size={40} className="mx-auto text-gray-300 mb-2" />
                    <p>No assessments scheduled. Click 'New Assessment' to initialize a setup.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAssessments.map(ast => (
                        <div key={ast.id} className="card p-6 flex flex-col justify-between gap-4">
                            <div>
                                <div className="flex items-start justify-between border-b pb-3 mb-3">
                                    <div>
                                        <span className="badge badge-info text-[9px] font-semibold">{ast.course_name}</span>
                                        <h2 className="text-base font-bold text-navy-900 mt-1">{ast.title}</h2>
                                    </div>
                                    <span className={clsx('badge text-[9px] uppercase font-bold',
                                        ast.status === 'published' && 'badge-success',
                                        ast.status === 'active' && 'badge-danger',
                                        ast.status === 'draft' && 'badge-neutral',
                                        ast.status === 'closed' && 'badge-warning'
                                    )}>
                                        {ast.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-2">
                                    <p className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-gray-400" />
                                        <span>Start: {format(new Date(ast.start_time), 'PPp')}</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-gray-400" />
                                        <span>End: {format(new Date(ast.end_time), 'PPp')}</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Users size={13} className="text-gray-400" />
                                        <span>Duration: {ast.duration_minutes} Mins</span>
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <Radio size={13} className="text-gray-400" />
                                        <span>Proctoring: {ast.tab_switch_logging ? 'Enabled' : 'Disabled'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-3 mt-auto">
                                <span className="text-xs font-bold text-navy-900">
                                    {ast.question_ids?.length || 0} Questions ({ast.total_marks || 0} Marks)
                                </span>
                                <div className="flex gap-2">
                                    {ast.status === 'draft' && (
                                        <>
                                            <button
                                                onClick={() => handlePublish(ast.id)}
                                                className="btn btn-primary btn-sm flex items-center gap-1"
                                            >
                                                <Check size={11} />
                                                <span>Publish</span>
                                            </button>
                                            <button
                                                disabled={ast.status === 'active' || ast.status === 'closed'}
                                                onClick={() => handleDelete(ast.id)}
                                                className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50"
                                                title="Delete"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    )}
                                    {ast.status !== 'draft' && (
                                        <span className="text-[10px] text-gray-400 italic">Locked from Edits</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
