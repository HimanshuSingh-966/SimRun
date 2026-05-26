import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Send, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

interface AssignmentRow {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description: string | null;
  due_date: string | null;
  course_title?: string;
}

interface QuestionRow {
  id: string;
  question_type: 'mcq' | 'msq' | 'short_answer' | 'long_answer';
  prompt: string;
  choices: string[];
  points: number;
  sort_order: number;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  status: string | null;
  submitted_at: string | null;
  score: number | null;
}

interface AnswerDraft {
  questionId: string;
  type: 'mcq' | 'msq' | 'short_answer' | 'long_answer';
  mcqIndex: number | null;
  msqIndices: number[];
  textAnswer: string;
}

const StudentAssignments = () => {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, SubmissionRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (authLoading || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const { data: enrollments, error: eErr } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('status', 'active');
      if (eErr) throw eErr;
      const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);
      if (courseIds.length === 0) {
        if (!cancelled) { setAssignments([]); setSubmissions(new Map()); }
        return;
      }
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);
      const courseMap = new Map<string, string>((coursesData || []).map((c: any) => [c.id, c.title]));

      const { data: assignmentData, error: aErr } = await supabase
        .from('assignments')
        .select('id, course_id, week_number, title, description, due_date')
        .in('course_id', courseIds)
        .order('due_date', { ascending: true, nullsFirst: true });
      if (aErr) throw aErr;
      const enriched = (assignmentData || []).map((a: any) => ({
        ...a,
        course_title: courseMap.get(a.course_id) || 'Unknown Course',
      }));
      if (!cancelled) setAssignments(enriched);

      const assignmentIds = enriched.map((a: any) => a.id);
      if (assignmentIds.length > 0) {
        const { data: subData } = await supabase
          .from('submissions')
          .select('id, assignment_id, status, submitted_at, score')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds);
        const subMap = new Map<string, SubmissionRow>();
        (subData || []).forEach((s: any) => subMap.set(s.assignment_id, s as SubmissionRow));
        if (!cancelled) setSubmissions(subMap);
      }
    } catch (e: unknown) {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load assignments.');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const openAssignment = async (assignmentId: string) => {
    setActiveAssignmentId(assignmentId);
    setSubmitMsg(null);
    setSubmitErr(null);
    setLoadingQuestions(true);
    setQuestions([]);
    setAnswers([]);
    try {
      const { data, error: qErr } = await supabase
        .from('assignment_questions')
        .select('id, question_type, prompt, choices, points, sort_order')
        .eq('assignment_id', assignmentId)
        .order('sort_order', { ascending: true });
      if (qErr) throw qErr;
      const qs = (data || []) as QuestionRow[];
      setQuestions(qs);
      setAnswers(qs.map((q) => ({
        questionId: q.id,
        type: q.question_type,
        mcqIndex: null,
        msqIndices: [],
        textAnswer: '',
      })));
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Failed to load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const updateAnswer = (questionId: string, update: Partial<AnswerDraft>) => {
    setAnswers((prev) => prev.map((a) => a.questionId === questionId ? { ...a, ...update } : a));
  };

  const submitAssignment = async () => {
    if (!user?.id || !activeAssignmentId) return;
    setSubmitting(true);
    setSubmitMsg(null);
    setSubmitErr(null);
    try {
      const existing = submissions.get(activeAssignmentId);
      if (existing) {
        setSubmitErr('You have already submitted this assignment.');
        setSubmitting(false);
        return;
      }
      const responseAnswers = answers.map((a) => {
        if (a.type === 'mcq') return { question_id: a.questionId, selected_indices: a.mcqIndex !== null ? [a.mcqIndex] : [], text_answer: null };
        if (a.type === 'msq') return { question_id: a.questionId, selected_indices: a.msqIndices, text_answer: null };
        return { question_id: a.questionId, selected_indices: [], text_answer: a.textAnswer };
      });
      const { error: sErr } = await supabase.from('submissions').insert({
        student_id: user.id,
        assignment_id: activeAssignmentId,
        status: 'submitted',
        answers: responseAnswers,
      });
      if (sErr) throw sErr;
      setSubmitMsg('Assignment submitted successfully!');
      await loadAssignments();
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (assignmentId: string) => {
    const sub = submissions.get(assignmentId);
    if (!sub) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: 9999 }}><Clock size={12} />Pending</span>;
    if (sub.status === 'graded' || sub.score !== null) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#166534', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: 9999 }}><CheckCircle size={12} />Graded{sub.score !== null ? ` - ${sub.score}` : ''}</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#1e40af', background: '#dbeafe', padding: '0.2rem 0.6rem', borderRadius: 9999 }}><Send size={12} />Submitted</span>;
  };

  if (loading) {
    return <div className={styles.dashboardWrapper}><p style={{ color: 'var(--color-text-muted)' }}>Loading assignments...</p></div>;
  }

  return (
    <div className={styles.dashboardWrapper}>
      {!activeAssignmentId ? (
        <div className={styles.approvalsCard}>
          <div className={styles.approvalsHeader}>
            <h3>My Assignments</h3>
          </div>
          {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}
          {assignments.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No assignments found for your enrolled courses.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {assignments.map((a) => (
                <div
                  key={a.id}
                  style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', background: '#fff' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong>{a.title}</strong>
                        {getStatusBadge(a.id)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        {a.course_title} &middot; Week {a.week_number || 1}
                        {a.due_date && ` | Due: ${new Date(a.due_date).toLocaleString()}`}
                      </div>
                      {a.description && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>{a.description}</p>
                      )}
                    </div>
                    {!submissions.get(a.id) ? (
                      <button
                        type="button"
                        className={styles.submitBtn}
                        style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        onClick={() => openAssignment(a.id)}
                      >
                        <Send size={14} style={{ marginRight: 4 }} /> Submit
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                        onClick={() => openAssignment(a.id)}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.approvalsCard}>
          <button
            type="button"
            onClick={() => { setActiveAssignmentId(null); setQuestions([]); setAnswers([]); setSubmitMsg(null); setSubmitErr(null); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            ← Back to assignments
          </button>
          <div className={styles.approvalsHeader} style={{ marginBottom: '1rem' }}>
            <h3>{assignments.find((a) => a.id === activeAssignmentId)?.title || 'Assignment'}</h3>
            {getStatusBadge(activeAssignmentId)}
          </div>

          {submitMsg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{submitMsg}</div>}
          {submitErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{submitErr}</div>}

          {loadingQuestions ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading questions...</p>
          ) : questions.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>This assignment has no questions yet.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {questions.map((q, idx) => {
                  const ans = answers.find((a) => a.questionId === q.id);
                  if (!ans) return null;
                  return (
                    <div key={q.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase' }}>
                          {q.question_type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{q.points} pt(s)</span>
                      </div>
                      <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{idx + 1}. {q.prompt}</p>

                      {submissions.get(activeAssignmentId) ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          {ans.type === 'mcq' && ans.mcqIndex !== null ? `Your answer: ${q.choices[ans.mcqIndex] || `Option ${ans.mcqIndex + 1}`}` :
                           ans.type === 'msq' && ans.msqIndices.length > 0 ? `Your answers: ${ans.msqIndices.map(i => q.choices[i] || `Option ${i + 1}`).join(', ')}` :
                           ans.type === 'short_answer' || ans.type === 'long_answer' ? `Your answer: ${ans.textAnswer || '(none)'}` :
                           'No answer recorded'}
                        </p>
                      ) : (
                        <>
                          {(q.question_type === 'mcq') && (q.choices || []).map((choice, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                              <input
                                type="radio"
                                name={`mcq-${q.id}`}
                                checked={ans.mcqIndex === i}
                                onChange={() => updateAnswer(q.id, { mcqIndex: i })}
                              />
                              {choice}
                            </label>
                          ))}
                          {(q.question_type === 'msq') && (q.choices || []).map((choice, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={ans.msqIndices.includes(i)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...ans.msqIndices, i].sort()
                                    : ans.msqIndices.filter((x) => x !== i);
                                  updateAnswer(q.id, { msqIndices: next });
                                }}
                              />
                              {choice}
                            </label>
                          ))}
                          {(q.question_type === 'short_answer') && (
                            <input
                              type="text"
                              value={ans.textAnswer}
                              onChange={(e) => updateAnswer(q.id, { textAnswer: e.target.value })}
                              placeholder="Type your answer..."
                              style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
                            />
                          )}
                          {(q.question_type === 'long_answer') && (
                            <textarea
                              value={ans.textAnswer}
                              onChange={(e) => updateAnswer(q.id, { textAnswer: e.target.value })}
                              placeholder="Type your answer..."
                              rows={5}
                              style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', resize: 'vertical' }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {!submissions.get(activeAssignmentId) && (
                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={submitting}
                  onClick={submitAssignment}
                  style={{ justifySelf: 'start' }}
                >
                  <Send size={16} style={{ marginRight: 6 }} />
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
