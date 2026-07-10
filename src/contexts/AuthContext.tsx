import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) { setLoading(false); return; }
        try {
            const me = await authAPI.me();
            setUser(me);
        } catch {
            localStorage.removeItem('access_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    const login = async (username: string, password: string) => {
        const tokens = await authAPI.login(username, password);
        localStorage.setItem('access_token', tokens.access_token);
        await refreshUser();
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
