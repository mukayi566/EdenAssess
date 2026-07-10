import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import type { CalendarEvent, AssessmentType } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Info, Clock, Square } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import clsx from 'clsx';

export function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<AssessmentType | 'all'>('all');

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await adminAPI.calendar();
                setEvents(data);
            } catch (err) {
                console.error('Error fetching calendar:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add padding days for clean grid offset matches
    const startDayOfWeek = monthStart.getDay(); // 0 is Sunday
    const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align to Monday first week

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const filteredEvents = events.filter(evt => {
        if (filterType === 'all') return true;
        return evt.type === filterType;
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Assessment Calendar</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        System-wide schedule of all exams, continuous assessment tests (CATs), and quizzes.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 bg-white border border-[#dbeeff] rounded-lg p-1.5 self-start">
                    <Filter size={14} className="text-gray-400 ml-2" />
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                        className="bg-transparent text-xs font-semibold text-navy-900 outline-none pr-6 cursor-pointer"
                    >
                        <option value="all">All Assessments</option>
                        <option value="exam">Curriculum Exams</option>
                        <option value="cat1">Continuous Assessment Test 1</option>
                        <option value="cat2">Continuous Assessment Test 2</option>
                        <option value="quiz">Weekly Quizzes</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Monthly Calendar */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="card p-6">
                        {/* Nav & Month Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-navy-900">
                                {format(currentDate, 'MMMM yyyy')}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevMonth} className="btn btn-secondary btn-icon">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary btn-sm">
                                    Today
                                </button>
                                <button onClick={handleNextMonth} className="btn btn-secondary btn-icon">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-px bg-gray-250 border border-gray-100 rounded-lg overflow-hidden">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-navy-900 border-b border-[#dbeeff]">
                                    {day}
                                </div>
                            ))}

                            {/* Padding */}
                            {[...Array(paddingDays)].map((_, i) => (
                                <div key={`p-${i}`} className="bg-white min-h-[100px] border-b border-r border-[#f0f7ff]/80" />
                            ))}

                            {/* Monthly Days */}
                            {loading ? (
                                <div className="col-span-7 bg-white p-12 text-center text-sm text-gray-500">
                                    Loading schedule details...
                                </div>
                            ) : (
                                days.map(day => {
                                    const dayEvents = filteredEvents.filter(evt => isSameDay(new Date(evt.start), day));
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <div
                                            key={day.toString()}
                                            className={clsx(
                                                'bg-white min-h-[100px] p-2 flex flex-col justify-between border-b border-r border-gray-100 transition-colors',
                                                isToday && 'bg-navy-50/20 ring-1 ring-navy-500 font-semibold'
                                            )}
                                        >
                                            <div className="text-xs text-gray-500 flex justify-between items-center">
                                                <span className={clsx(isToday && 'text-navy-950 font-bold bg-[#dbeeff] w-5 h-5 rounded-full flex items-center justify-center')}>{format(day, 'd')}</span>
                                                {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-navy-500 animate-pulse-ring" />}
                                            </div>

                                            <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px]">
                                                {dayEvents.slice(0, 3).map(evt => (
                                                    <div
                                                        key={evt.id}
                                                        className={clsx(
                                                            'text-[9px] px-1 py-0.5 rounded truncate font-medium border flex items-center gap-1',
                                                            evt.type === 'exam' && 'bg-red-50 border-red-200 text-red-700',
                                                            evt.type === 'cat1' && 'bg-amber-50 border-amber-200 text-amber-700',
                                                            evt.type === 'cat2' && 'bg-yellow-50 border-yellow-200 text-yellow-755',
                                                            evt.type === 'quiz' && 'bg-blue-50 border-blue-200 text-blue-700'
                                                        )}
                                                        title={`${evt.title} (${evt.course})`}
                                                    >
                                                        <Square size={6} className="fill-current shrink-0" />
                                                        <span className="truncate">{evt.title}</span>
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <p className="text-[8px] text-gray-400 text-center italic mt-0.5">+{dayEvents.length - 3} more</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Selected Day Events / Instructions */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card p-6 space-y-6">
                        <h3 className="text-lg font-bold text-navy-900">Agenda Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Clock className="text-navy-500 shrink-0 mt-0.5" size={17} />
                                <div>
                                    <p className="text-xs font-semibold text-navy-900">TimeZone</p>
                                    <p className="text-xs text-gray-500">Central Africa Time (CAT) · Africa/Lusaka</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 border-t pt-4">
                                <Info className="text-gold-550 shrink-0 mt-0.5" size={17} />
                                <div>
                                    <p className="text-xs font-semibold text-[#0A2540]">Auto Lockout Enforcement</p>
                                    <p className="text-xs text-gray-500">Assessments auto-locks from edits client-side the moment the start duration window commences.</p>
                                </div>
                            </div>
                        </div>

                        {/* Key codes */}
                        <div className="border-t pt-5 space-y-3">
                            <h4 className="text-xs font-semibold text-navy-900 uppercase">Assessment Types</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />
                                    <span>Curriculum Exam</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300" />
                                    <span>CAT 1</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300" />
                                    <span>CAT 2</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300" />
                                    <span>Quiz</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
