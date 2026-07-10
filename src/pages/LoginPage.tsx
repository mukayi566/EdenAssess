import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
    const { user, login } = useAuth();

    const [showPass, setShowPass] = useState(false);
    const [serverError, setServerError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    if (user && !user.must_reset_password) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/lecturer'} replace />;
    }

    const onSubmit = async (data: FormData) => {
        setServerError('');
        try {
            await login(data.username, data.password);
            // RequireAuth will handle the redirect
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            setServerError(e?.response?.data?.detail || 'Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0A2540] p-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a015] to-[#e8b820] flex items-center justify-center">
                        <span className="text-[#0A2540] font-bold text-lg">E</span>
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'var(--font-family-heading)' }}>EdenAssess</p>
                        <p className="text-white/40 text-xs uppercase tracking-wider">Eden University</p>
                    </div>
                </div>

                <div>
                    <h1 className="text-white text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-family-heading)' }}>
                        Educator &amp; Admin<br />Portal
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                        Manage students, question banks, assessments, and grading all in one secure platform.
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-4">
                        {[
                            { label: 'Students Managed', value: '2,400+' },
                            { label: 'Assessments Created', value: '340+' },
                            { label: 'Active Lecturers', value: '48' },
                            { label: 'Success Rate', value: '94%' },
                        ].map(s => (
                            <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <p className="text-[#d4a015] text-2xl font-bold">{s.value}</p>
                                <p className="text-white/50 text-xs mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-white/30 text-xs">
                    <BookOpen size={14} />
                    <span>Eden University · Zambia · {new Date().getFullYear()}</span>
                </div>
            </div>

            {/* Right: form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#f5f7fa]">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-[#0A2540] flex items-center justify-center">
                            <span className="text-[#d4a015] font-bold text-base">E</span>
                        </div>
                        <span className="text-[#0A2540] font-bold text-lg" style={{ fontFamily: 'var(--font-family-heading)' }}>EdenAssess</span>
                    </div>

                    <h2 className="text-3xl font-bold text-[#0A2540] mb-1" style={{ fontFamily: 'var(--font-family-heading)' }}>
                        Welcome back
                    </h2>
                    <p className="text-[#6b7280] mb-8">Sign in to your portal account</p>

                    {serverError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="label" htmlFor="username">Username / Staff ID</label>
                            <input
                                id="username"
                                {...register('username')}
                                className={`input ${errors.username ? 'error' : ''}`}
                                placeholder="e.g. staff001 or U2024001"
                                autoComplete="username"
                            />
                            {errors.username && <p className="error-msg">{errors.username.message}</p>}
                        </div>

                        <div>
                            <label className="label" htmlFor="password">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    className={`input pr-10 ${errors.password ? 'error' : ''}`}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94afcc] hover:text-[#0A2540] transition-colors"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="error-msg">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary btn-lg w-full mt-2"
                            id="login-submit-btn"
                        >
                            {isSubmitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                            ) : (
                                'Sign in to Portal'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-[#f0f7ff] border border-[#dbeeff] rounded-lg">
                        <p className="text-xs text-[#0A2540] font-semibold mb-1">First time signing in?</p>
                        <p className="text-xs text-[#6b7280]">
                            Use the temporary password sent to your email or phone. You'll be prompted to set a new password immediately after.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
