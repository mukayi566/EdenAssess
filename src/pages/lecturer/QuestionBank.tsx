import { useState, useEffect } from 'react';
import { questionsAPI, coursesAPI } from '@/lib/api';
import type { Question, Course } from '@/types';
import {
    Plus, Trash2, Edit3, X, HelpCircle, Check, Trash
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

const schema = z.object({
    course_id: z.string().min(1, 'Course allocation is required'),
    topic: z.string().min(1, 'Topic tagging is required'),
    type: z.enum(['mcq', 'short_answer', 'essay']),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    text: z.string().min(10, 'Question text must contain at least 10 characters'),
    marks: z.number().min(1, 'Marks must be positive'),
    model_answer: z.string().optional(),
    options: z.array(z.object({
        text: z.string().min(1, 'Option text is required'),
        is_correct: z.boolean(),
    })).optional(),
});
type FormData = z.infer<typeof schema>;

export function QuestionBank() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');

    // Modals / forms
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: 'mcq',
            difficulty: 'medium',
            marks: 5,
            options: [
                { text: 'Option A', is_correct: true },
                { text: 'Option B', is_correct: false },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'options',
    });

    const currentType = watch('type');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [questionsData, coursesData] = await Promise.all([
                questionsAPI.list(),
                coursesAPI.list(),
            ]);
            setQuestions(questionsData);
            setCourses(coursesData);
        } catch (err) {
            console.error('Error fetching questions bank details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenAdd = () => {
        reset({
            type: 'mcq',
            difficulty: 'medium',
            marks: 5,
            options: [
                { text: '', is_correct: false },
                { text: '', is_correct: false },
            ],
        });
        setEditingQuestion(null);
        setShowAddModal(true);
    };

    const handleOpenEdit = (q: Question) => {
        setEditingQuestion(q);
        reset({
            course_id: q.course_id,
            topic: q.topic,
            type: q.type,
            difficulty: q.difficulty,
            text: q.text,
            marks: q.marks,
            model_answer: q.model_answer || '',
            options: q.options || [],
        });
        setShowAddModal(true);
    };

    const onSubmit = async (data: FormData) => {
        try {
            const payload = {
                ...data,
                // Strip options if not MCQ
                options: data.type === 'mcq' ? data.options : undefined,
                model_answer: data.type !== 'mcq' ? data.model_answer : undefined,
            };

            if (editingQuestion) {
                await questionsAPI.update(editingQuestion.id, payload as any);
                alert('Question updated in database.');
            } else {
                await questionsAPI.create(payload as any);
                alert('Question saved to database.');
            }
            setShowAddModal(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to persist question');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question from the bank? It will remove it from all draft assessments.')) return;
        try {
            await questionsAPI.delete(id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete question');
        }
    };

    const filteredQuestions = questions.filter(q => {
        if (selectedCourse !== 'all' && q.course_id !== selectedCourse) return false;
        if (selectedType !== 'all' && q.type !== selectedType) return false;
        if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
        return true;
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900">Question Store</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Build and manage reusable assessment items categorized by taxonomy and difficulty scale.
                    </p>
                </div>
                <button onClick={handleOpenAdd} className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    <span>New Question</span>
                </button>
            </div>

            {/* Filters row */}
            <div className="card p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div>
                    <label className="label">Course Curriculum</label>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="input text-xs">
                        <option value="all">All Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label">Complexity Tag</label>
                    <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="input text-xs">
                        <option value="all font-medium">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className="label">Question Format</label>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="input text-xs">
                        <option value="all">All Styles</option>
                        <option value="mcq">Multiple Choice Question (MCQ)</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="essay">Comprehensive Essay</option>
                    </select>
                </div>
                <div className="sm:pt-5 text-right">
                    <span className="text-xs font-semibold text-gray-400">
                        Total Query Items: <strong className="text-navy-900 text-sm font-bold ml-1">{filteredQuestions.length}</strong>
                    </span>
                </div>
            </div>

            {/* Questions list */}
            <div className="space-y-4">
                {loading ? (
                    <div className="card p-12 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">Indexing question entries...</p>
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="card p-12 text-center text-gray-400">
                        <HelpCircle size={40} className="mx-auto text-gray-300 mb-2" />
                        <p>No questions configured for this filter combination. Click 'New Question' to begin.</p>
                    </div>
                ) : (
                    filteredQuestions.map(q => (
                        <div key={q.id} className="card p-6 flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="flex-1 space-y-3">
                                {/* Meta details */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="badge badge-info text-[9px] font-semibold">{q.course_name || 'Generic Course'}</span>
                                    <span className="badge badge-neutral text-[9px] font-mono">Topic: {q.topic}</span>
                                    <span className={clsx('badge text-[9px]',
                                        q.type === 'mcq' && 'badge-success',
                                        q.type === 'short_answer' && 'badge-warning',
                                        q.type === 'essay' && 'badge-danger'
                                    )}>
                                        {q.type === 'mcq' ? 'MCQ' : q.type === 'short_answer' ? 'Short Answer' : 'Essay'}
                                    </span>
                                    <span className={clsx('badge text-[9px] font-semibold',
                                        q.difficulty === 'easy' && 'badge-success',
                                        q.difficulty === 'medium' && 'badge-warning',
                                        q.difficulty === 'hard' && 'badge-danger'
                                    )}>
                                        {q.difficulty}
                                    </span>
                                    <span className="text-xs font-bold text-[#0A2540] ml-2">{q.marks} Marks Allocated</span>
                                </div>

                                {/* Prompt */}
                                <p className="text-navy-950 font-semibold text-sm leading-relaxed whitespace-pre-wrap">{q.text}</p>

                                {/* Question specifics */}
                                {q.type === 'mcq' && q.options && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                        {q.options.map((opt, i) => (
                                            <div
                                                key={i}
                                                className={clsx(
                                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs',
                                                    opt.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-150 text-gray-600'
                                                )}
                                            >
                                                <span className="font-bold">{String.fromCharCode(65 + i)})</span>
                                                <span className="flex-1">{opt.text}</span>
                                                {opt.is_correct && <Check size={12} className="text-green-600 font-bold shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type !== 'mcq' && q.model_answer && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-150 text-xs text-gray-600 mt-2">
                                        <strong className="text-navy-900 block mb-1">Grading Rubric / Model Answer:</strong>
                                        <p className="whitespace-pre-wrap">{q.model_answer}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 shrink-0 self-end md:self-start">
                                <button
                                    onClick={() => handleOpenEdit(q)}
                                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                                >
                                    <Edit3 size={12} />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(q.id)}
                                    className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50/50"
                                    title="Remove question"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Editor Modal Overlay */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-box max-w-2xl p-6">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h3 className="text-lg font-bold text-navy-900">
                                {editingQuestion ? 'Modify Question Profile' : 'Configure Assessment Question'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-ghost text-gray-500 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Course ID</label>
                                    <select {...register('course_id')} className={`input ${errors.course_id ? 'error' : ''}`}>
                                        <option value="">Select Target Course</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                    {errors.course_id && <p className="error-msg">{errors.course_id.message}</p>}
                                </div>
                                <div>
                                    <label className="label">Topic tag</label>
                                    <input
                                        {...register('topic')}
                                        className={`input ${errors.topic ? 'error' : ''}`}
                                        placeholder="e.g. Loops, Rents, Matrices"
                                    />
                                    {errors.topic && <p className="error-msg">{errors.topic.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Question Type</label>
                                    <select {...register('type')} className="input">
                                        <option value="mcq">Multiple Choice</option>
                                        <option value="short_answer">Short Answer</option>
                                        <option value="essay">Comprehensive Essay</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Taxonomy difficulty</label>
                                    <select {...register('difficulty')} className="input">
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Marks Allocated</label>
                                    <input
                                        type="number"
                                        {...register('marks', { valueAsNumber: true })}
                                        className={`input ${errors.marks ? 'error' : ''}`}
                                    />
                                    {errors.marks && <p className="error-msg">{errors.marks.message}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="label">Question text / Prompt</label>
                                <textarea
                                    {...register('text')}
                                    rows={3}
                                    className={`input min-h-[80px] py-2 ${errors.text ? 'error' : ''}`}
                                    placeholder="Outline the core question prompt clearly..."
                                />
                                {errors.text && <p className="error-msg">{errors.text.message}</p>}
                            </div>

                            {/* Conditional Inputs */}
                            {currentType === 'mcq' && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <label className="label mb-0">Multiple Choice Options</label>
                                        <button
                                            type="button"
                                            onClick={() => append({ text: '', is_correct: false })}
                                            className="text-xs text-navy-600 hover:text-navy-950 font-bold hover:underline"
                                        >
                                            + Add Option Option
                                        </button>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                        {fields.map((field, idx) => (
                                            <div key={field.id} className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    {...register(`options.${idx}.is_correct` as const)}
                                                    className="rounded border-[#dbeeff] text-navy-500"
                                                />
                                                <input
                                                    {...register(`options.${idx}.text` as const)}
                                                    placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                                                    className="input flex-1 py-1.5 text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={fields.length <= 2}
                                                    onClick={() => remove(idx)}
                                                    className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentType !== 'mcq' && (
                                <div>
                                    <label className="label">Model Answer / Evaluation Rubric</label>
                                    <textarea
                                        {...register('model_answer')}
                                        rows={4}
                                        className="input min-h-[100px] py-2"
                                        placeholder="Provide standard model feedback, grading criteria, or sample solution..."
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Save Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
