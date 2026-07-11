import { useEffect, useState } from 'react';
import { gradingAPI } from '@/lib/api';
import type { LecturerStats } from '@/types';
import { FileText, ClipboardCheck, ArrowRight, TrendingUp, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LecturerDashboard() {
    const [stats, setStats] = useState<LecturerStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await gradingAPI.lecturerStats();
                setStats(res);
            } catch (err) {
                console.error('Error fetching lecturer stats:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="h-8 w-48 skeleton rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 skeleton rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-80 skeleton rounded-xl animate-pulse" />
            </div>
        );
    }

    const statItems = [
        {
            title: 'Question Bank Size',
            value: stats?.total_questions || 0,
            detail: 'Questions created across your courses',
            icon: <HelpCircle className="text-navy-500" size={24} />,
            bg: 'bg-navy-50',
            link: '/lecturer/questions',
        },
        {
            title: 'Active Assessments',
            value: stats?.active_assessments || 0,
            detail: 'Live exams & quiz sessions right now',
            icon: <FileText className="text-gold-550" size={24} />,
            bg: 'bg-gold-100',
            link: '/lecturer/assessments',
        },
        {
            title: 'Grading Queue Tasks',
            value: stats?.pending_grading || 0,
            detail: 'Essays & short answers checking work',
            icon: <ClipboardCheck className="text-danger-500" size={24} />,
            bg: 'bg-danger-100',
            link: '/lecturer/grading',
        },
        {
            title: 'Total Submissions Received',
            value: stats?.total_submissions || 0,
            detail: 'Cumulative student responses logged',
            icon: <TrendingUp className="text-success-800" size={24} />,
            bg: 'bg-success-100',
            link: '/lecturer/analytics',
        },
    ];

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome info */}
            <div>
                <h1 className="text-3xl font-bold text-navy-900" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    Educator Workboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage questions bank, compile exams, review proctored sessions and grade essay outcomes.
                </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map(item => (
                    <div key={item.title} className="card p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.title}</p>
                                    <p className="text-3xl font-bold text-navy-900 mt-2">{item.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${item.bg}-500/10 ${item.bg}`}>
                                    {item.icon}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{item.detail}</p>
                        </div>
                        <Link to={item.link} className="flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-950 mt-4 transition-colors">
                            <span>Enter Tool</span>
                            <ArrowRight size={12} />
                        </Link>
                    </div>
                ))}
            </div>

            {/* Info card guidelines */}
            <div className="card p-6 bg-navy-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-lg font-bold text-gold-400">Continuous Assessment (CAT) &amp; Term Exam Guides</h2>
                    <p className="text-sm text-navy-100/80 max-w-2xl leading-relaxed">
                        Ensure questions have correct marks allocated before combining them into final assessments. Randomization topic pools require sufficient question indexes (we recommend minimum of 5 questions per configured topic topic tags).
                    </p>
                </div>
                <Link to="/lecturer/questions" className="btn btn-secondary text-white border-white bg-transparent hover:bg-white/10 shrink-0">
                    Populate Question Bank
                </Link>
            </div>
        </div>
    );
}
