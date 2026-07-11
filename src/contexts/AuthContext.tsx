import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Determine user profile from database
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (userData) {
                setUser({
                    id: userData.id,
                    email: userData.email,
                    full_name: userData.full_name,
                    role: userData.email === 'admin@gmail.com' ? 'admin' : 'lecturer',
                    must_reset_password: userData.is_first_login,
                });
            } else {
                // Fallback based on session info if public.users record is missing
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || 'User',
                    role: session.user.email === 'admin@gmail.com' ? 'admin' : 'lecturer',
                    must_reset_password: false,
                });
            }

            // Sync token with local storage to preserve backwards compatibility for interceptors temporarily
            localStorage.setItem('access_token', session.access_token);
        } catch (err) {
            console.error('Error refreshing user:', err);
            setUser(null);
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                localStorage.setItem('access_token', session.access_token);
            } else {
                localStorage.removeItem('access_token');
            }
            refreshUser();
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [refreshUser]);

    const login = async (username: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: username,
            password: password,
        });
        if (error) throw error;
        // onAuthStateChange will automatically trigger refreshUser
    };

    const logout = async () => {
        await supabase.auth.signOut();
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
