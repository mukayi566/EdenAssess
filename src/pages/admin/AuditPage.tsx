import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import type { AuditEvent, ProvisionLog } from '@/types';
import { ShieldCheck, Calendar, Users, Eye, HelpCircle, History, Clock, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function AuditPage() {
    const [logs, setLogs] = useState<AuditEvent[]>([]);
    const [provisions, setProvisions] = useState<ProvisionLog[]>([]);
    const [activeTab, setActiveTab] = useState<'system' | 'provision'>('system');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [auditRes, provisionRes] = await Promise.all([
                    adminAPI.auditLog(),
                    adminAPI.provisionLog(),
                ]);
                setLogs(auditRes);
                setProvisions(provisionRes);
            } catch (err) {
                console.error('Error fetching logs:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900 flex items-center gap-2">
                        <ShieldCheck className="text-navy-500" size={28} />
                        <span>Audit &amp; Accountability Logs</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track user account provisioning, role operations, and credential dispatch transactions.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-list">
                <button
                    onClick={() => setActiveTab('system')}
                    className={clsx('tab-item flex items-center gap-2', activeTab === 'system' && 'active')}
                >
                    <History size={16} />
                    <span>System Operation Log</span>
                </button>
                <button
                    onClick={() => setActiveTab('provision')}
                    className={clsx('tab-item flex items-center gap-2', activeTab === 'provision' && 'active')}
                >
                    <FileSpreadsheet size={16} />
                    <span>Roster Provision Activity</span>
                </button>
            </div>

            {/* Tables container */}
            <div className="card p-6">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading audit records...</p>
                    </div>
                ) : activeTab === 'system' ? (
                    /* System Audit Tab */
                    <div className="table-wrapper bg-white">
                        {logs.length === 0 ? (
                            <p className="text-center text-gray-400 p-12">No system audit records available.</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Executed By</th>
                                        <th>Action Details</th>
                                        <th>Event Target</th>
                                        <th>Logged Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td>
                                                <span className={clsx('badge text-[9px] font-bold uppercase tracking-wider',
                                                    log.event_type === 'auth' && 'badge-success',
                                                    log.event_type === 'create' && 'badge-info',
                                                    log.event_type === 'delete' && 'badge-danger',
                                                    log.event_type === 'course' && 'badge-warning',
                                                    'badge-neutral'
                                                )}>
                                                    {log.event_type}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="font-semibold text-navy-900">{log.actor_name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">Actor ID: {log.actor_id}</div>
                                            </td>
                                            <td className="text-sm text-gray-700 max-w-xs truncate" title={log.details}>
                                                {log.details}
                                            </td>
                                            <td className="text-sm">
                                                {log.target_name ? (
                                                    <div>
                                                        <span className="font-medium text-navy-900">{log.target_name}</span>
                                                        {log.target_id && <span className="text-[10px] text-gray-400 block font-mono">Target ID: {log.target_id}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">None</span>
                                                )}
                                            </td>
                                            <td className="text-xs text-gray-500 font-mono">
                                                {format(new Date(log.created_at), 'Pp')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    /* Provision Logs Tab */
                    <div className="table-wrapper bg-white">
                        {provisions.length === 0 ? (
                            <p className="text-center text-gray-400 p-12">No provision transactions recorded.</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Provisioned By</th>
                                        <th>User ID</th>
                                        <th>Full Name</th>
                                        <th>Account Type</th>
                                        <th>SMS Delivery</th>
                                        <th>Email Delivery</th>
                                        <th>Logged Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {provisions.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <span className="font-semibold text-navy-900">{p.provisioned_by}</span>
                                            </td>
                                            <td className="font-mono text-xs">{p.target_id}</td>
                                            <td className="text-sm font-medium">{p.target_name}</td>
                                            <td>
                                                <span className={clsx('badge text-[9px] uppercase font-bold',
                                                    p.target_type === 'student' ? 'badge-info' : 'badge-warning'
                                                )}>
                                                    {p.target_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={clsx('badge text-[10px]',
                                                    p.sms_status === 'sent' && 'badge-success',
                                                    p.sms_status === 'failed' && 'badge-danger',
                                                    p.sms_status === 'pending' && 'badge-warning'
                                                )}>
                                                    {p.sms_status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={clsx('badge text-[10px]',
                                                    p.email_status === 'sent' && 'badge-success',
                                                    p.email_status === 'failed' && 'badge-danger',
                                                    p.email_status === 'pending' && 'badge-warning'
                                                )}>
                                                    {p.email_status}
                                                </span>
                                            </td>
                                            <td className="text-xs text-gray-500 font-mono">
                                                {format(new Date(p.created_at), 'Pp')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
