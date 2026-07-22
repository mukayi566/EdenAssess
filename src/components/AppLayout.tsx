import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from './NotificationPanel';
import { Menu, X, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-[#f5f7fa]">
            {/* Sidebar */}
            <Sidebar collapsed={!sidebarOpen} />

            {/* Main */}
            <div
                className="flex-1 flex flex-col min-h-screen"
                style={{ marginLeft: sidebarOpen ? 260 : 68, transition: 'margin-left 0.3s ease' }}
            >
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white border-b border-[#dbeeff] px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(v => !v)}
                            className="btn btn-ghost btn-icon text-[#0A2540]"
                            aria-label="Toggle sidebar"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="hidden sm:flex items-center gap-2 bg-[#f0f7ff] border border-[#dbeeff] rounded-lg px-3 py-1.5">
                            <Search size={15} className="text-[#94afcc]" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent text-sm outline-none text-[#0A2540] placeholder-[#94afcc] w-40"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationPanel />
                        <div className="flex items-center gap-2 pl-2 border-l border-[#dbeeff]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A2540] to-[#2172be] flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                    {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-semibold text-[#0A2540] leading-none">{user?.full_name}</p>
                                <p className="text-[10px] text-[#94afcc] capitalize">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-hidden h-full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
