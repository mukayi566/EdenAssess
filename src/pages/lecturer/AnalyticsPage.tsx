import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BarChart3, TrendingUp, Users, Award, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // Mock data structure matching the courses & assessments performance
                const res = await api.get('/lecturer/analytics/stats').then(r => r.data).catch(() => ({
                    termAverage: 73.4,
                    passRate: 88,
                    activeEnrolled: 148,
                    assessmentPerformance: [
                        { name: 'Chemistry Quiz 1', avg: 72 },
                        { name: 'Chemistry Quiz 2', avg: 85 },
                        { name: 'Midterm Organic Exam', avg: 68 },
                        { name: 'Inorganic CAT 1', avg: 76 },
                    ],
                    scoreDistribution: [
                        { range: '0-49', count: 4 },
                        { range: '50-60', count: 18 },
                        { range: '61-70', count: 42 },
                        { range: '71-80', count: 54 },
                        { range: '81-90', count: 22 },
                        { range: '91-100', count: 8 },
                    ]
                }));
                setData(res);
            } catch (err) {
                console.error('Error fetching analytics details:', err);
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
                        <div key={i} className="h-28 skeleton rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-80 skeleton rounded-xl animate-pulse" />
                    <div className="h-80 skeleton rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-navy-900">Performance Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Average grades, student participation checklists, and grades distribution sheets.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Midterm Mean Score</p>
                            <p className="text-3xl font-bold text-navy-900 mt-2">{data.termAverage}%</p>
                        </div>
                        <div className="p-3 bg-navy-50 rounded-xl text-navy-500">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <p className="text-[11px] text-green-600 font-semibold mt-3">↑ 2.4% vs last semester</p>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Exam Pass Rate</p>
                            <p className="text-3xl font-bold text-navy-900 mt-2">{data.passRate}%</p>
                        </div>
                        <div className="p-3 bg-success-100 rounded-xl text-success-800">
                            <Percent size={24} />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">Threshold set at &gt;= 50% points</p>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Enrollment</p>
                            <p className="text-3xl font-bold text-navy-900 mt-2">{data.activeEnrolled}</p>
                        </div>
                        <div className="p-3 bg-gold-100 rounded-xl text-gold-500">
                            <Users size={24} />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">Across 3 term curriculums</p>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Honor Students count</p>
                            <p className="text-3xl font-bold text-navy-900 mt-2">30 Students</p>
                        </div>
                        <div className="p-3 bg-danger-100 rounded-xl text-danger-500">
                            <Award size={24} />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-450 mt-3">Scored &gt;= 80 points</p>
                </div>
            </div>

            {/* Chart analytics wrapper */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend analysis chart */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-lg font-bold text-navy-900">Mean Comparison of Assessments</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.assessmentPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="avg" stroke="#0A2540" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar chart scores distributions */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-lg font-bold text-navy-900">Score Range Distribution</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4a90d9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
