import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentsAPI, coursesAPI, questionsAPI } from '@/lib/api';
import type { Course, Question, Assessment, AssessmentType, LatePolicy } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, ArrowRight, Check, Shield, Info, AlertOctagon, X
} from 'lucide-react';
import clsx from 'clsx';

export function CreateAssessment() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Wizard state
    const [step, setStep] = useState(1);
    const steps = ['Details', 'Scheduling', 'Questions', 'Security & Rules', 'Review'];

    // Form states
    const [title, setTitle] = useState('');
    const [courseId, setCourseId] = useState('');
    const [type, setType] = useState<AssessmentType>('quiz');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);

    // Question selection states
    const [selectionMode, setSelectionMode] = useState<'manual' | 'random'>('manual');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [randomCount, setRandomCount] = useState(5);
    const [randomTopic, setRandomTopic] = useState('');
    const [randomDifficulty, setRandomDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');

    // Rules states
    const [attemptLimit, setAttemptLimit] = useState(1);
    const [latePolicy, setLatePolicy] = useState<LatePolicy>('deny');
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [tabSwitchLogging, setTabSwitchLogging] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [coursesData, questionsData] = await Promise.all([
                    coursesAPI.list(),
                    questionsAPI.list(),
                ]);

                let availableCourses = coursesData;
                let availableQuestions = questionsData;
                if (user?.role === 'lecturer') {
                    // Try to get their lecturer ID
                    try {
                        const { data: lecProfile } = await supabase
                            .from('lecturers')
                            .select('id, email')
                            .or(`email.eq.${user.email},id.eq.${user.id}`)
                            .maybeSingle();

                        if (lecProfile) {
                            const { data: mappings } = await supabase
                                .from('lecturer_courses')
                                .select('course_id')
                                .eq('lecturer_id', lecProfile.id);

                            if (mappings && mappings.length > 0) {
                                const allowedCourseIds = mappings.map((m: any) => m.course_id);
                                availableCourses = coursesData.filter(c => allowedCourseIds.includes(c.id));
                                availableQuestions = questionsData.filter(q => allowedCourseIds.includes(q.course_id));
                            } else {
                                // Strictly empty if no allocations
                                availableCourses = [];
                                availableQuestions = [];
                            }
                        } else {
                            // If user is lecturer but not in lecturers table, fallback to legacy
                            availableCourses = coursesData.filter(c => c.lecturer_id === user.id);
                            availableQuestions = questionsData.filter(q => availableCourses.some(c => c.id === q.course_id));
                        }
                    } catch (e) {
                        console.error('Error fetching lecturer courses:', e);
                        // Safe fallback
                        availableCourses = [];
                        availableQuestions = [];
                    }
                }

                setCourses(availableCourses);
                setQuestions(availableQuestions);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            load();
        }
    }, [user?.id, user?.email, user?.role]);

    const handleNext = () => {
        if (step === 1 && (!title || !courseId)) {
            showToast('Please fill out title and select course curriculum before proceeding.', 'error');
            return;
        }
        if (step === 2 && (!startTime || !endTime)) {
            showToast('Please select both start and end availability window times.', 'error');
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            showToast('Start availability window must precede end availability lockouts.', 'error');
            return;
        }
        if (step === 3 && selectionMode === 'manual' && selectedQuestionIds.length === 0) {
            showToast('Please select at least one question item from the Manual Question Store List.', 'error');
            return;
        }
        if (step === 3 && selectionMode === 'random' && !randomTopic) {
            showToast('Please enter a target topic tags keyword to randomize questions from.', 'error');
            return;
        }
        setStep(s => s + 1);
    };

    const handlePrev = () => setStep(s => s - 1);

    const toggleQuestionSelection = (id: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
        );
    };

    const handleRandomizeSelect = async () => {
        if (!courseId) {
            showToast('Please select a course in Step 1 before matching topic questions.', 'error');
            return;
        }
        try {
            const matched = await assessmentsAPI.randomQuestions({
                course_id: courseId,
                topic: randomTopic,
                count: randomCount,
                difficulty: randomDifficulty === 'all' ? undefined : randomDifficulty,
            });

            if (matched.length === 0) {
                showToast('No questions matching this course topic tags found in the store.', 'error');
                return;
            }
            setSelectedQuestionIds(matched.map(q => q.id));
            showToast(`Success! Generated random selection of ${matched.length} question packages.`);
        } catch (err: any) {
            showToast(err.message || 'Randomization generation failed', 'error');
        }
    };

    const handleSubmitAssessment = async (publishImmediate: boolean) => {
        try {
            const payload: Partial<Assessment> = {
                title,
                course_id: courseId,
                type,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                duration_minutes: durationMinutes,
                attempt_limit: attemptLimit,
                late_policy: latePolicy,
                shuffle_questions: shuffleQuestions,
                tab_switch_logging: tabSwitchLogging,
                question_ids: selectedQuestionIds,
                status: publishImmediate ? 'published' : 'draft',
                created_by: user?.id
            };

            await assessmentsAPI.create(payload);
            showToast(`Assessment saved as ${publishImmediate ? 'PUBLISHED' : 'DRAFT'}`);
            setTimeout(() => navigate('/lecturer/assessments'), 1500);
        } catch (err: any) {
            console.error('Submission error:', err);
            showToast(err.message || 'Failed to create assessment', 'error');
        }
    };

    const selectedQuestionsDetails = questions.filter(q => selectedQuestionIds.includes(q.id));
    const calculatedTotalMarks = selectedQuestionsDetails.reduce((sum, q) => sum + q.marks, 0);

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            {/* Back button */}
            <div>
                <button
                    onClick={() => navigate('/lecturer/assessments')}
                    className="btn btn-ghost btn-sm flex items-center gap-1.5 text-gray-500 hover:text-navy-900"
                >
                    <ArrowLeft size={14} />
                    <span>Back to Assessments</span>
                </button>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-3xl font-bold text-navy-900">Compile Assessment</h1>
                <p className="text-sm text-gray-500 mt-1">Multi-step wizard configuration for CAT tests, quizzes and exams.</p>
            </div>

            {/* Wizard Steps indicator */}
            <div className="flex items-center justify-between border-b pb-4">
                {steps.map((label, idx) => {
                    const stepNum = idx + 1;
                    const isActive = step === stepNum;
                    const isCompleted = step > stepNum;
                    return (
                        <div key={label} className="flex-1 flex items-center gap-2">
                            <div className={clsx(
                                'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-offset-2 transition-colors',
                                isActive && 'bg-[#0A2540] text-white ring-navy-500',
                                isCompleted && 'bg-green-500 text-white ring-green-500',
                                !isActive && !isCompleted && 'bg-gray-100 text-gray-400 ring-transparent'
                            )}>
                                {isCompleted ? <Check size={14} /> : stepNum}
                            </div>
                            <span className={clsx('text-xs font-semibold hidden md:inline',
                                isActive ? 'text-navy-900' : 'text-gray-400'
                            )}>
                                {label}
                            </span>
                            {stepNum < steps.length && <div className="hidden md:block flex-1 h-0.5 bg-gray-200 mx-4" />}
                        </div>
                    );
                })}
            </div>

            {/* Main card wizard container */}
            <div className="card p-6 bg-white">
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Loading resources...</p>
                    </div>
                ) : (
                    <>
                        {/* Step 1: Details */}
                        {step === 1 && (
                            <div className="space-y-5 animate-fade-in">
                                <h3 className="text-lg font-bold text-[#0A2540]">Step 1: Assessment Basics</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Assessment Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="input"
                                            placeholder="e.g. Midterm General Chemistry Exam"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Target Curriculum Course</label>
                                            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="input">
                                                <option value="">Select Allocated Course</option>
                                                {courses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Evaluation Taxonomy Type</label>
                                            <select value={type} onChange={e => setType(e.target.value as any)} className="input text-xs">
                                                <option value="quiz">Weekly Quiz</option>
                                                <option value="cat1">Continuous Assessment Test 1 (CAT 1)</option>
                                                <option value="cat2">Continuous Assessment Test 2 (CAT 2)</option>
                                                <option value="exam">Standard Curriculum Exam</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Scheduling */}
                        {step === 2 && (
                            <div className="space-y-5 animate-fade-in">
                                <h3 className="text-lg font-bold text-[#0A2540]">Step 2: Availability Schedule</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Availability Start Time (Gate Open)</label>
                                            <input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={e => setStartTime(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Lockout End Time (Gate Closed)</label>
                                            <input
                                                type="datetime-local"
                                                value={endTime}
                                                onChange={e => setEndTime(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">Attempt Duration Window (Minutes)</label>
                                        <input
                                            type="number"
                                            value={durationMinutes}
                                            onChange={e => setDurationMinutes(Number(e.target.value))}
                                            className="input"
                                            placeholder="e.g. 120"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            Once a student clicks start attempt, the server will strictly log out the user after this threshold, regardless of remaining gate window hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Question selections */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <h3 className="text-lg font-bold text-[#0A2540]">Step 3: Question allocation</h3>
                                    <div className="flex bg-[#f0f7ff] rounded-lg p-1 border">
                                        <button
                                            onClick={() => setSelectionMode('manual')}
                                            className={clsx('px-3 py-1 text-xs font-semibold rounded-md transition-colors',
                                                selectionMode === 'manual' ? 'bg-[#0A2540] text-white shadow' : 'text-navy-900'
                                            )}
                                        >
                                            Retrieve Manually
                                        </button>
                                        <button
                                            onClick={() => setSelectionMode('random')}
                                            className={clsx('px-3 py-1 text-xs font-semibold rounded-md transition-colors',
                                                selectionMode === 'random' ? 'bg-[#0A2540] text-white shadow' : 'text-navy-900'
                                            )}
                                        >
                                            Autogenerate Random Pool
                                        </button>
                                    </div>
                                </div>

                                {selectionMode === 'manual' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs text-gray-500">Pick from total questions bank matching this course. ({selectedQuestionIds.length} chosen)</p>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {questions.filter(q => q.course_id === courseId).map(q => {
                                                const isChosen = selectedQuestionIds.includes(q.id);
                                                return (
                                                    <div
                                                        key={q.id}
                                                        onClick={() => toggleQuestionSelection(q.id)}
                                                        className={clsx('p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-colors',
                                                            isChosen ? 'bg-navy-50/50 border-navy-500' : 'hover:bg-gray-50 border-gray-200'
                                                        )}
                                                    >
                                                        <div className="flex-1 pr-4">
                                                            <p className="text-sm font-semibold">{q.text}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={clsx('badge text-[9px]',
                                                                    q.type === 'mcq' && 'badge-success',
                                                                    q.type === 'one_word' && 'badge-info',
                                                                    q.type === 'short_answer' && 'badge-warning',
                                                                    q.type === 'essay' && 'badge-danger'
                                                                )}>{q.type.replace('_', ' ').toUpperCase()}</span>
                                                                <span className="badge badge-info text-[9px]">{q.difficulty}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">Topic: {q.topic}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-bold text-navy-900">{q.marks} Marks</span>
                                                            <div className={clsx(
                                                                'w-5 h-5 rounded border flex items-center justify-center',
                                                                isChosen ? 'bg-navy-900 text-[#d40] border-[#0A2540]' : 'border-gray-200'
                                                            )}>
                                                                {isChosen && <Check size={12} className="text-[#d4a015]" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="label">Target Topic tag</label>
                                                <input
                                                    type="text"
                                                    value={randomTopic}
                                                    onChange={e => setRandomTopic(e.target.value)}
                                                    className="input text-xs"
                                                    placeholder="e.g. Vectors"
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Required Count</label>
                                                <input
                                                    type="number"
                                                    value={randomCount}
                                                    onChange={e => setRandomCount(Number(e.target.value))}
                                                    className="input text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Question difficulty</label>
                                                <select
                                                    value={randomDifficulty}
                                                    onChange={e => setRandomDifficulty(e.target.value as any)}
                                                    className="input text-xs"
                                                >
                                                    <option value="all">All Difficulties</option>
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <button
                                                type="button"
                                                onClick={handleRandomizeSelect}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Execute Random Generation
                                            </button>
                                        </div>
                                        {selectedQuestionIds.length > 0 && (
                                            <div className="bg-[#f0f7ff] border border-[#dbeeff] p-4 rounded-lg flex items-center gap-2">
                                                <Check size={16} className="text-green-500 shrink-0" />
                                                <span className="text-xs text-navy-900 font-semibold">
                                                    Pool assembled successfully. Selected {selectedQuestionIds.length} random items (Sum: {calculatedTotalMarks} marks).
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Rules */}
                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-[#0A2540]">Step 4: Attempt Policy &amp; Security Rules</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Rules */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label">Maximum Attempts per Student</label>
                                            <input
                                                type="number"
                                                value={attemptLimit}
                                                onChange={e => setAttemptLimit(Number(e.target.value))}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Late Submission Policy</label>
                                            <select value={latePolicy} onChange={e => setLatePolicy(e.target.value as any)} className="input text-xs">
                                                <option value="deny">Deny (Hard Lockout - Instant zero after end time)</option>
                                                <option value="allow">Allow (Permissive submissions after check date)</option>
                                                <option value="deduct">Deduct points automatically for overdue submissions</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right: Security options */}
                                    <div className="bg-gray-50 border p-5 rounded-lg space-y-4">
                                        <h4 className="text-xs font-semibold text-navy-900 uppercase flex items-center gap-1">
                                            <Shield size={14} className="text-navy-500" />
                                            <span>Security &amp; Proctoring Rules</span>
                                        </h4>

                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tabSwitchLogging}
                                                onChange={e => setTabSwitchLogging(e.target.checked)}
                                                className="rounded border-[#dbeeff] text-navy-500 mt-1"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-[#0A2540]">Integrity Tab Monitor</p>
                                                <p className="text-xs text-gray-500">Track and log client tab switches, minimized windows and application blur timeouts.</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer border-t pt-4">
                                            <input
                                                type="checkbox"
                                                checked={shuffleQuestions}
                                                onChange={e => setShuffleQuestions(e.target.checked)}
                                                className="rounded border-[#dbeeff] text-navy-500 mt-1"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-[#0A2540]">Shuffle Question Orders</p>
                                                <p className="text-xs text-gray-500">Randomize question orders uniquely per student attempt node.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {step === 5 && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-[#0A2540]">Step 5: Final Review</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-4 border-b grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Title</p>
                                            <p className="text-sm font-bold text-navy-990">{title}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Evaluation Type</p>
                                            <p className="text-sm font-semibold text-navy-990 capitalize">{type}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Availability Limit</p>
                                            <p className="text-sm font-semibold text-navy-990">{durationMinutes} Minutes</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-semibold uppercase">Security Flags</p>
                                            <span className={clsx('badge text-[9px]',
                                                tabSwitchLogging ? 'badge-success' : 'badge-neutral'
                                            )}>
                                                Proctoring {tabSwitchLogging ? 'On' : 'Off'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Summary marks */}
                                    <div className="p-4 bg-navy-50 flex items-center justify-between border-b">
                                        <div>
                                            <p className="text-xs text-navy-900 font-medium">Assembled Test Questions</p>
                                            <p className="text-[11px] text-gray-500">Review total questions matching this assessment before deployment.</p>
                                        </div>
                                        <p className="text-xl font-bold text-[#0A2540]">
                                            {selectedQuestionIds.length} Questions ({calculatedTotalMarks} Marks)
                                        </p>
                                    </div>

                                    {/* Questions list preview */}
                                    <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto">
                                        {selectedQuestionsDetails.map((q, idx) => (
                                            <div key={q.id} className="text-xs flex justify-between items-start gap-4">
                                                <p className="text-gray-700">
                                                    <strong>{idx + 1}.</strong> {q.text}
                                                </p>
                                                <span className="font-bold text-[#0A2540] shrink-0 font-mono">{q.marks} Marks</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[#fef3c7] border border-amber-200 p-4 rounded-lg flex items-center gap-3">
                                    <Info className="text-amber-700 shrink-0" size={18} />
                                    <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                                        Verification Warning: Assessments will lock from editing the moment active students commence attempts. Ensure spelling and marks weights are verified.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Nav controls */}
                        <div className="flex justify-between items-center pt-6 mt-6 border-t">
                            {step > 1 ? (
                                <button onClick={handlePrev} className="btn btn-secondary flex items-center gap-2">
                                    <ArrowLeft size={16} />
                                    <span>Previous Step</span>
                                </button>
                            ) : <div />}

                            <div className="flex gap-3">
                                {step < steps.length ? (
                                    <button onClick={handleNext} className="btn btn-primary flex items-center gap-2">
                                        <span>Proceed Next</span>
                                        <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleSubmitAssessment(false)}
                                            className="btn btn-secondary"
                                        >
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={() => handleSubmitAssessment(true)}
                                            className="btn btn-primary"
                                        >
                                            Publish Exam
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Toast Notification */}
            {toast && (
                <div className={clsx(
                    'fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300',
                    toast.type === 'success' ? 'bg-green-600 border border-green-700' : 'bg-red-600 border border-red-700'
                )}>
                    <div className="text-white">
                        {toast.type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertOctagon size={18} strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-sm tracking-wide">
                            {toast.type === 'success' ? 'SYSTEM NOTIFICATION' : 'ACTION ERROR'}
                        </span>
                        <span className="text-white/90 text-xs font-medium uppercase tracking-wider">
                            {toast.message}
                        </span>
                    </div>
                    <button
                        onClick={() => setToast(null)}
                        className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={14} className="text-white/70" />
                    </button>
                </div>
            )}
        </div>
    );
}
