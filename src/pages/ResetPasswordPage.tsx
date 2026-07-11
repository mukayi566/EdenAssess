import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
    current_password: z.string().min(1, 'Current password required'),
    new_password: z.string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Z]/, 'Include at least one uppercase letter')
        .regex(/[0-9]/, 'Include at least one number'),
    confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

const checks = [
    { label: '8+ characters', test: (v: string) => v.length >= 8 },
    { label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'Number', test: (v: string) => /[0-9]/.test(v) },
];

export function ResetPasswordPage() {
    const { refreshUser, user } = useAuth();
    const navigate = useNavigate();
    const [show, setShow] = useState({ cur: false, new: false, con: false });
    const [serverError, setServerError] = useState('');

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });
    const newPass = watch('new_password', '');

    const onSubmit = async (data: FormData) => {
        setServerError('');
        try {
            await authAPI.resetPassword(data.current_password, data.new_password);
            await refreshUser();
            navigate(user?.role === 'admin' ? '/admin' : '/lecturer', { replace: true });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            setServerError(e?.response?.data?.detail || 'Failed to reset password. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] p-6">
            <div className="w-full max-w-md animate-fade-in">
                <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#2172be] flex items-center justify-center shadow-lg">
                        <ShieldCheck size={28} className="text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-[#0A2540] mb-1" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    Set Your New Password
                </h2>
                <p className="text-center text-[#6b7280] text-sm mb-8">
                    For security, you must set a new password before continuing.
                </p>

                <div className="card p-6">
                    {serverError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
                            <AlertCircle size={15} className="shrink-0" />
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Current password */}
                        <div>
                            <label className="label">Temporary Password</label>
                            <div className="relative">
                                <input
                                    {...register('current_password')}
                                    type={show.cur ? 'text' : 'password'}
                                    className={`input pr-10 ${errors.current_password ? 'error' : ''}`}
                                    placeholder="Your temporary password"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, cur: !s.cur }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94afcc] hover:text-[#0A2540]">
                                    {show.cur ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.current_password && <p className="error-msg">{errors.current_password.message}</p>}
                        </div>

                        {/* New password */}
                        <div>
                            <label className="label">New Password</label>
                            <div className="relative">
                                <input
                                    {...register('new_password')}
                                    type={show.new ? 'text' : 'password'}
                                    className={`input pr-10 ${errors.new_password ? 'error' : ''}`}
                                    placeholder="Choose a strong password"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94afcc] hover:text-[#0A2540]">
                                    {show.new ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {/* Requirements checklist */}
                            {newPass && (
                                <div className="mt-2 space-y-1">
                                    {checks.map(c => (
                                        <div key={c.label} className="flex items-center gap-2 text-xs">
                                            <CheckCircle2 size={13} className={c.test(newPass) ? 'text-green-500' : 'text-[#dbeeff]'} />
                                            <span className={c.test(newPass) ? 'text-green-600' : 'text-[#94afcc]'}>{c.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.new_password && <p className="error-msg">{errors.new_password.message}</p>}
                        </div>

                        {/* Confirm */}
                        <div>
                            <label className="label">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    {...register('confirm_password')}
                                    type={show.con ? 'text' : 'password'}
                                    className={`input pr-10 ${errors.confirm_password ? 'error' : ''}`}
                                    placeholder="Repeat your new password"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, con: !s.con }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94afcc] hover:text-[#0A2540]">
                                    {show.con ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.confirm_password && <p className="error-msg">{errors.confirm_password.message}</p>}
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full mt-2" id="reset-password-btn">
                            {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Updating...</> : 'Update Password & Continue'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-[#94afcc] mt-6">Eden University — EdenAssess Portal</p>
            </div>
        </div>
    );
}
