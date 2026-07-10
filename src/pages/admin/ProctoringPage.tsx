import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import type { ProctoringFlag } from '@/types';
import { AlertTriangle, ShieldCheck, Layers, CheckSquare, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function ProctoringPage() {
    const [flags, setFlags] = useState<ProctoringFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAnomaly, setFilterAnomaly] = useState<'all' | 'tab' | 'bg' | 'time'>('all');

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await adminAPI.proctoringFlags();
                setFlags(data);
            } catch (err) {
                console.error('Error fetching proctoring flags:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleClearFlag = (id: string) => {
        alert(`Flag ID #${id} marked as reviewed and cleared by Administrator.`);
        setFlags(prev => prev.filter(f => f.id !== id));
    };

    const filteredFlags = flags.filter(flag => {
        const textMatch =
            flag.student_name.toLowerCase().includes(search.toLowerCase()) ||
            flag.assessment_title.toLowerCase().includes(search.toLowerCase()) ||
            flag.course_name.toLowerCase().includes(search.toLowerCase());

        if (!textMatch) return false;

        if (filterAnomaly === 'tab') return flag.tab_switches > 3;
        if (filterAnomaly === 'bg') return flag.background_events > 0;
        if (filterAnomaly === 'time') return flag.timing_anomaly;
        return true;
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900 flex items-center gap-2">
                        <AlertTriangle className="text-danger-500" size={28} />
                        <span>Honesty &amp; Proctoring Logs</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Realtime audit log of flagged exam attempts (tab switches, screen minimizing, blur states and duration anomalies).
                    </p>
                </div>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-5 bg-red-50/50 border-red-150 flex items-center gap-4">
                    <div className="p-3 bg-red-100/80 rounded-xl text-red-700">
                        <Layers size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Flagged Sessions</p>
                        <p className="text-2xl font-bold text-navy-900 mt-1">{flags.length}</p>
                    </div>
                </div>
                <div className="card p-5 bg-amber-50/50 border-amber-150 flex items-center gap-4">
                    <div className="p-3 bg-amber-100/80 rounded-xl text-amber-700">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Active Verification Required</p>
                        <p className="text-2xl font-bold text-navy-900 mt-1">
                            {flags.filter(f => f.tab_switches > 5 || f.timing_anomaly).length}
                        </p>
                    </div>
                </div>
                <div className="card p-5 bg-green-50/50 border-green-150 flex items-center gap-4">
                    <div className="p-3 bg-green-100/80 rounded-xl text-green-700">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase font-mono">Secured Browser Ratio</p>
                        <p className="text-2xl font-bold text-navy-900 mt-1">98.4%</p>
                    </div>
                </div>
            </div>

            <div className="card p-6 space-y-4">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 py-2 w-full md:w-80">
                        <Search size={16} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student or assessment..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent text-sm w-full outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-white border border-[#dbeeff] rounded-lg p-1.5 self-start">
                        <Filter size={14} className="text-gray-400 ml-2" />
                        <select
                            value={filterAnomaly}
                            onChange={e => setFilterAnomaly(e.target.value as any)}
                            className="bg-transparent text-xs font-semibold text-navy-900 outline-none pr-6 cursor-pointer"
                        >
                            <option value="all">All Anomaly Types</option>
                            <option value="tab">High Tab Switches (&gt;3)</option>
                            <option value="bg">App Minimization Events</option>
                            <option value="time">Timing Anomalies</option>
                        </select>
                    </div>
                </div>

                {/* Flag list */}
                <div className="table-wrapper bg-white">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Retrieving flagged sessions...</p>
                        </div>
                    ) : filteredFlags.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <ShieldCheck size={40} className="mx-auto text-green-500 mb-2" />
                            <p>No proctoring violations requiring review. All sessions are compliant.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Assessment Detail</th>
                                    <th>Tab Switches</th>
                                    <th>Background Events</th>
                                    <th>Timing Anomaly</th>
                                    <th>Logged Date</th>
                                    <th className="w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFlags.map(flag => (
                                    <tr key={flag.id}>
                                        <td>
                                            <div>
                                                <p className="font-semibold text-navy-900">{flag.student_name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">ID: {flag.submission_id.slice(-8)}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-sm font-medium">{flag.assessment_title}</p>
                                            <p className="text-xs text-gray-400">{flag.course_name}</p>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px] font-bold',
                                                flag.tab_switches > 5 ? 'badge-danger' :
                                                    flag.tab_switches > 2 ? 'badge-warning' : 'badge-neutral'
                                            )}>
                                                {flag.tab_switches} switches
                                            </span>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px]',
                                                flag.background_events > 0 ? 'badge-danger' : 'badge-neutral'
                                            )}>
                                                {flag.background_events} blurs
                                            </span>
                                        </td>
                                        <td>
                                            <span className={clsx('badge text-[10px]',
                                                flag.timing_anomaly ? 'badge-danger' : 'badge-success'
                                            )}>
                                                {flag.timing_anomaly ? 'Flagged' : 'Pass'}
                                            </span>
                                        </td>
                                        <td className="text-xs text-gray-600">
                                            {format(new Date(flag.flagged_at), 'Pp')}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleClearFlag(flag.id)}
                                                    className="btn btn-ghost btn-icon text-green-600 hover:bg-green-50"
                                                    title="Verify / Clear Alert"
                                                >
                                                    <CheckSquare size={14} />
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
        </div>
    );
}
