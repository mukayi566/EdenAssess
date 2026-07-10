import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface Props {
    children: React.ReactNode;
    roles?: UserRole[];
}

export function RequireAuth({ children, roles }: Props) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#dbeeff] border-t-[#0A2540] rounded-full animate-spin" />
                    <p className="text-[#0A2540] font-medium text-sm">Loading EdenAssess...</p>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

    if (user.must_reset_password && location.pathname !== '/reset-password') {
        return <Navigate to="/reset-password" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/lecturer'} replace />;
    }

    return <>{children}</>;
}
