import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, ClipboardCheck, FileText, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
    id: string;
    type: 'grading' | 'flag' | 'assessment' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
    link?: string;
}

const typeConfig = {
    grading: { icon: ClipboardCheck, color: '#2172be', bg: '#e8f4ff' },
    flag: { icon: AlertTriangle, color: '#e53e3e', bg: '#fff5f5' },
    assessment: { icon: FileText, color: '#38a169', bg: '#f0fff4' },
    system: { icon: Info, color: '#805ad5', bg: '#faf5ff' },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const STORAGE_KEY = 'eden_read_notifications';

function getReadIds(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveReadIds(ids: Set<string>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function NotificationPanel() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const readIds = getReadIds();
        const items: Notification[] = [];

        try {
            if (user.role === 'lecturer') {
                // Pending grading submissions
                const { data: submissions } = await supabase
                    .from('submissions')
                    .select('id, submitted_at, grading_status')
                    .eq('grading_status', 'pending_review')
                    .order('submitted_at', { ascending: false })
                    .limit(5);

                if (submissions && submissions.length > 0) {
                    items.push({
                        id: `grading-batch-${submissions[0].id}`,
                        type: 'grading',
                        title: 'Submissions Awaiting Review',
                        message: `${submissions.length} submission${submissions.length > 1 ? 's' : ''} need${submissions.length === 1 ? 's' : ''} manual grading.`,
                        time: submissions[0].submitted_at,
                        read: readIds.has(`grading-batch-${submissions[0].id}`),
                    });
                }

                // Active assessments about to close (within 24h)
                const now = new Date().toISOString();
                const in24h = new Date(Date.now() + 86400000).toISOString();
                const { data: closing } = await supabase
                    .from('assessments')
                    .select('id, title, end_time')
                    .eq('status', 'active')
                    .gte('end_time', now)
                    .lte('end_time', in24h)
                    .order('end_time', { ascending: true })
                    .limit(3);

                if (closing) {
                    for (const a of closing) {
                        const nid = `assessment-closing-${a.id}`;
                        items.push({
                            id: nid,
                            type: 'assessment',
                            title: 'Assessment Closing Soon',
                            message: `"${a.title}" closes at ${new Date(a.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                            time: a.end_time,
                            read: readIds.has(nid),
                        });
                    }
                }
            } else if (user.role === 'admin') {
                // Proctoring flags
                const { data: flags } = await supabase
                    .from('proctoring_flags')
                    .select('id, flagged_at, student_name, assessment_title')
                    .order('flagged_at', { ascending: false })
                    .limit(5);

                if (flags && flags.length > 0) {
                    const nid = `flags-${flags[0].id}`;
                    items.push({
                        id: nid,
                        type: 'flag',
                        title: 'New Proctoring Flags',
                        message: `${flags.length} session${flags.length > 1 ? 's' : ''} flagged. Latest: ${flags[0].student_name} — ${flags[0].assessment_title}.`,
                        time: flags[0].flagged_at,
                        read: readIds.has(nid),
                    });
                }

                // Recent new students (last 24h)
                const since = new Date(Date.now() - 86400000).toISOString();
                const { data: newStudents } = await supabase
                    .from('students')
                    .select('id, created_at')
                    .gte('created_at', since);

                if (newStudents && newStudents.length > 0) {
                    const nid = `new-students-${since.slice(0, 10)}`;
                    items.push({
                        id: nid,
                        type: 'system',
                        title: 'New Student Registrations',
                        message: `${newStudents.length} new student${newStudents.length > 1 ? 's' : ''} added in the last 24 hours.`,
                        time: newStudents[0].created_at,
                        read: readIds.has(nid),
                    });
                }

                // Active assessments
                const now = new Date().toISOString();
                const in24h = new Date(Date.now() + 86400000).toISOString();
                const { data: closing } = await supabase
                    .from('assessments')
                    .select('id, title, end_time')
                    .eq('status', 'active')
                    .gte('end_time', now)
                    .lte('end_time', in24h)
                    .order('end_time', { ascending: true })
                    .limit(3);

                if (closing && closing.length > 0) {
                    const nid = `assessments-closing-${now.slice(0, 10)}`;
                    items.push({
                        id: nid,
                        type: 'assessment',
                        title: `${closing.length} Assessment${closing.length > 1 ? 's' : ''} Closing Soon`,
                        message: `Including "${closing[0].title}" closing at ${new Date(closing[0].end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                        time: closing[0].end_time,
                        read: readIds.has(nid),
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }

        // Sort: unread first, then by time
        items.sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.time).getTime() - new Date(a.time).getTime();
        });

        setNotifications(items);
        setLoading(false);
    }, [user]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Fetch when panel opens
    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        const readIds = getReadIds();
        notifications.forEach(n => readIds.add(n.id));
        saveReadIds(readIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markOneRead = (id: string) => {
        const readIds = getReadIds();
        readIds.add(id);
        saveReadIds(readIds);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                id="notification-bell-btn"
                onClick={() => setOpen(v => !v)}
                className="btn btn-ghost btn-icon"
                aria-label="Notifications"
                style={{ position: 'relative' }}
            >
                <Bell size={18} className="text-[#0A2540]" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#e53e3e',
                        border: '2px solid white',
                    }} />
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div
                    id="notification-panel"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: 360,
                        background: 'white',
                        borderRadius: 16,
                        boxShadow: '0 8px 40px rgba(10,37,64,0.14)',
                        border: '1px solid #dbeeff',
                        zIndex: 200,
                        overflow: 'hidden',
                        animation: 'notif-fade-in 0.18s ease',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px 10px',
                        borderBottom: '1px solid #f0f7ff',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bell size={16} style={{ color: '#2172be' }} />
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#0A2540' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{
                                    background: '#e53e3e',
                                    color: 'white',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    padding: '1px 6px',
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    title="Mark all as read"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#2172be',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: '4px 6px',
                                        borderRadius: 6,
                                    }}
                                >
                                    <CheckCheck size={13} />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94afcc', padding: 2 }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                                <Loader2 size={22} style={{ color: '#2172be', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <Bell size={32} style={{ color: '#c8dff0', margin: '0 auto 10px' }} />
                                <p style={{ fontSize: 13, color: '#94afcc', fontWeight: 500 }}>You're all caught up!</p>
                                <p style={{ fontSize: 11, color: '#b0c8de' }}>No new notifications right now.</p>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const cfg = typeConfig[n.type];
                                const Icon = cfg.icon;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => markOneRead(n.id)}
                                        style={{
                                            display: 'flex',
                                            gap: 12,
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            background: n.read ? 'white' : '#f5f9ff',
                                            borderBottom: '1px solid #f0f7ff',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'white' : '#f5f9ff')}
                                    >
                                        <div style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 10,
                                            background: cfg.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <Icon size={17} style={{ color: cfg.color }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                                                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0A2540', lineHeight: 1.3 }}>{n.title}</p>
                                                {!n.read && (
                                                    <span style={{
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: '50%',
                                                        background: '#2172be',
                                                        flexShrink: 0,
                                                        marginTop: 4,
                                                    }} />
                                                )}
                                            </div>
                                            <p style={{ fontSize: 11.5, color: '#4a6b8a', marginTop: 2, lineHeight: 1.5 }}>{n.message}</p>
                                            <p style={{ fontSize: 10, color: '#94afcc', marginTop: 4 }}>{timeAgo(n.time)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && notifications.length > 0 && (
                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid #f0f7ff',
                            textAlign: 'center',
                        }}>
                            <button
                                onClick={() => { markAllRead(); setOpen(false); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2172be',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Dismiss all
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes notif-fade-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
