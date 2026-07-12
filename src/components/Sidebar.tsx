import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, FileText, ClipboardCheck,
    AlertTriangle, Calendar, LogOut, ChevronRight, ShieldCheck, BarChart3, Layers, UserCog,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

interface NavItem {
    label: string;
    to: string;
    icon: React.ReactNode;
}

const adminNav: NavItem[] = [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Student Roster', to: '/admin/students', icon: <GraduationCap size={18} /> },
    { label: 'Lecturers', to: '/admin/lecturers', icon: <Users size={18} /> },
    { label: 'Courses', to: '/admin/courses', icon: <BookOpen size={18} /> },
    { label: 'Add School and Program', to: '/admin/schools', icon: <Layers size={18} /> },
    { label: 'Calendar', to: '/admin/calendar', icon: <Calendar size={18} /> },
    { label: 'Proctoring Flags', to: '/admin/flags', icon: <AlertTriangle size={18} /> },
    { label: 'Audit Log', to: '/admin/audit', icon: <ShieldCheck size={18} /> },
    { label: 'User Management', to: '/admin/users', icon: <UserCog size={18} /> },
];

const lecturerNav: NavItem[] = [
    { label: 'Dashboard', to: '/lecturer', icon: <LayoutDashboard size={18} /> },
    { label: 'Question Bank', to: '/lecturer/questions', icon: <BookOpen size={18} /> },
    { label: 'Assessments', to: '/lecturer/assessments', icon: <FileText size={18} /> },
    { label: 'Grading Queue', to: '/lecturer/grading', icon: <ClipboardCheck size={18} /> },
    { label: 'Analytics', to: '/lecturer/analytics', icon: <BarChart3 size={18} /> },
];

interface Props {
    collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: Props) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const navItems = user?.role === 'admin' ? adminNav : lecturerNav;

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <aside
            className="sidebar"
            style={{ width: collapsed ? 68 : 260 }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
                {!collapsed && (
                    <div>
                        <p className="text-white font-semibold text-sm leading-none" style={{ fontFamily: 'var(--font-family-heading)' }}>
                            EdenAssess
                        </p>
                        <p className="text-white/40 text-[10px] mt-0.5 uppercase tracking-wider">
                            {user?.role === 'admin' ? 'Admin Portal' : 'Educator Portal'}
                        </p>
                    </div>
                )}
            </div>


            {/* Nav */}
            <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/admin' || item.to === '/lecturer'}
                        className={({ isActive }) =>
                            clsx('nav-item', isActive && 'active', collapsed && 'justify-center px-0 mx-2')
                        }
                    >
                        <span className="nav-icon flex-shrink-0">{item.icon}</span>
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && <ChevronRight size={13} className="opacity-30" />}
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="border-t border-white/10 p-4">
                {!collapsed && (
                    <div className="mb-3 px-1">
                        <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                        <p className="text-white/40 text-xs truncate">{user?.email}</p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={clsx(
                        'nav-item w-full text-red-300 hover:bg-red-500/10 hover:text-red-200',
                        collapsed && 'justify-center px-0'
                    )}
                >
                    <LogOut size={17} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
