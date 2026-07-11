import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import type { AdminStats, CalendarEvent, AuditEvent } from '@/types';
import { GraduationCap, Users, Calendar, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [recentAudits, setRecentAudits] = useState<AuditEvent[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            try {
                const [statsData, audits, events] = await Promise.all([
                    adminAPI.stats(),
                    adminAPI.auditLog().then(res => res.slice(0, 5)),
                    adminAPI.calendar().then(res => res.slice(0, 5)),
                ]);
                setStats(statsData);
                setRecentAudits(audits);
                setUpcomingEvents(events);
            } catch (err) {
                console.error('Error fetching admin dashboard data:', err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="h-8 w-48 skeleton rounded" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 skeleton rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-96 skeleton rounded-xl" />
                    <div className="h-96 skeleton rounded-xl" />
                </div>
            </div>
        );
    }

    const statItems = [
        {
            title: 'Total Students',
            value: stats?.total_students || 0,
            icon: <GraduationCap className="text-navy-500" size={24} />,
            bg: 'bg-navy-50',
            link: '/admin/students',
        },
        {
            title: 'Total Lecturers',
            value: stats?.total_lecturers || 0,
            icon: <Users className="text-gold-500" size={24} />,
            bg: 'bg-gold-100',
            link: '/admin/lecturers',
        },
        {
            title: 'Active Assessments',
            value: stats?.active_assessments || 0,
            icon: <Calendar className="text-success-500" size={24} />,
            bg: 'bg-success-100',
            link: '/admin/calendar',
        },
        {
            title: 'Flagged Sessions Today',
            value: stats?.flagged_sessions_today || 0,
            icon: <AlertTriangle className="text-danger-500" size={24} />,
            bg: 'bg-danger-100',
            link: '/admin/flags',
        },
    ];

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Admin Portal Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        System health, audit logging, and student roster provisioning.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs bg-white border border-[#dbeeff] rounded-lg px-3 py-2 text-gray-500">
                    <Clock size={14} />
                    <span>System Status: <strong className="text-success-500">Operational</strong></span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((item, idx) => (
                    <div key={idx} className="card p-6 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.title}</p>
                                <p className="text-3xl font-bold text-navy-900 mt-2">{item.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${item.bg}`}>
                                {item.icon}
                            </div>
                        </div>
                        <Link to={item.link} className="flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-950 mt-4 transition-colors">
                            <span>View Details</span>
                            <ArrowRight size={12} />
                        </Link>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Flagged and Upcoming events */}
                <div className="card p-6 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-lg font-bold text-navy-900">System Assessment Calendar</h2>
                        <Link to="/admin/calendar" className="text-xs font-semibold text-navy-600 hover:underline">
                            Full Calendar
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No assessments scheduled.</p>
                        ) : (
                            upcomingEvents.map((evt) => (
                                <div key={evt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-navy-50/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-navy-900">{evt.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{evt.course} · {format(new Date(evt.start), 'PPP p')}</p>
                                    </div>
                                    <span className={`badge ${evt.status === 'active' ? 'badge-success' :
                                            evt.status === 'published' ? 'badge-info' : 'badge-neutral'
                                        }`}>
                                        {evt.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Audit Log */}
                <div className="card p-6 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-lg font-bold text-navy-900">Recent Audit Log</h2>
                        <Link to="/admin/audit" className="text-xs font-semibold text-navy-600 hover:underline">
                            Full Log
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentAudits.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No recent activity logged.</p>
                        ) : (
                            recentAudits.map((event) => (
                                <div key={event.id} className="flex items-start gap-3 text-xs">
                                    <div className="p-1 px-2 bg-navy-100 rounded text-navy-600 mt-0.5 font-bold uppercase tracking-wider text-[9px]">
                                        {event.event_type}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-navy-900 font-medium">
                                            {event.actor_name} <span className="text-gray-500 font-normal">{event.details}</span>
                                        </p>
                                        <p className="text-gray-400 text-[10px] mt-0.5">
                                            {format(new Date(event.created_at), 'Pp')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
