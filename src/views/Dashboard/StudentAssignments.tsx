import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Send, CheckCircle, Clock, ZoomIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
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
  question_type: string;
  prompt: string;
  choices: string[];
  correct_indices: number[];
  image_url: string | null;
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

interface OsceAnswer {
  questionId: string;
  selectedIndex: number | null;
}

const StudentAssignments = () => {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, SubmissionRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<OsceAnswer[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

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
      const courseIds = (enrollments || []).map((e: { course_id: string }) => e.course_id).filter(Boolean);
      if (courseIds.length === 0) {
        if (!cancelled) { setAssignments([]); setSubmissions(new Map()); }
        return;
      }
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);
      const courseMap = new Map<string, string>((coursesData || []).map((c: { id: string; title: string }) => [c.id, c.title]));

      const { data: assignmentData, error: aErr } = await supabase
        .from('assignments')
        .select('id, course_id, week_number, title, description, due_date')
        .in('course_id', courseIds)
        .order('due_date', { ascending: true, nullsFirst: true });
      if (aErr) throw aErr;
    const enriched = ((assignmentData || []) as AssignmentRow[]).map((a) => ({
      ...a,
      course_title: courseMap.get(a.course_id) || 'Unknown Course',
    }));
    if (!cancelled) setAssignments(enriched);

    const assignmentIds = enriched.map((a) => a.id);
      if (assignmentIds.length > 0) {
        const { data: subData } = await supabase
          .from('submissions')
          .select('id, assignment_id, status, submitted_at, score')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds);
        const subMap = new Map<string, SubmissionRow>();
        ((subData || []) as SubmissionRow[]).forEach((s) => subMap.set(s.assignment_id, s));
        if (!cancelled) setSubmissions(subMap);
      }
    } catch (e: unknown) {
      if (!cancelled) setError(sanitizeError(e));
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
        .select('id, question_type, prompt, choices, correct_indices, image_url, points, sort_order')
        .eq('assignment_id', assignmentId)
        .order('sort_order', { ascending: true });
      if (qErr) throw qErr;
      const qs = (data || []) as QuestionRow[];
      setQuestions(qs);

      // Check if student already has a submission with saved answers
      const sub = submissions.get(assignmentId);
      if (sub) {
        // Load saved answers from the submission
        const { data: subDetail } = await supabase
          .from('submissions')
          .select('answers')
          .eq('id', sub.id)
          .single();
      const savedAnswers = (subDetail as { answers?: { question_id: string; selected_indices?: number[] }[] } | null)?.answers || [];
      setAnswers(qs.map((q) => {
        const saved = savedAnswers.find((a: { question_id: string }) => a.question_id === q.id);
          return {
            questionId: q.id,
            selectedIndex: saved?.selected_indices?.length ? saved.selected_indices[0] : null,
          };
        }));
      } else {
        setAnswers(qs.map((q) => ({ questionId: q.id, selectedIndex: null })));
      }
    } catch (e: unknown) {
      setSubmitErr(sanitizeError(e));
    } finally {
      setLoadingQuestions(false);
    }
  };

  const updateAnswer = (questionId: string, index: number) => {
    setAnswers((prev) => prev.map((a) => a.questionId === questionId ? { ...a, selectedIndex: index } : a));
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

      // Build response answers for OSCE
      const responseAnswers = answers.map((a) => ({
        question_id: a.questionId,
        selected_indices: a.selectedIndex !== null ? [a.selectedIndex] : [],
        text_answer: null,
      }));

      // Auto-grade: sum points where student selected correct index
      let totalScore = 0;
      answers.forEach((a) => {
        if (a.selectedIndex !== null) {
          const q = questions.find((q) => q.id === a.questionId);
          if (q && q.correct_indices.includes(a.selectedIndex)) {
            totalScore += q.points;
          }
        }
      });

      const { error: sErr } = await supabase.from('submissions').insert({
        student_id: user.id,
        assignment_id: activeAssignmentId,
        status: 'graded',
        answers: responseAnswers,
        score: totalScore,
      });
      if (sErr) throw sErr;

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      setSubmitMsg(`OSCE submitted and auto-graded! Score: ${totalScore} / ${maxScore}`);
      await loadAssignments();
    } catch (e: unknown) {
      setSubmitErr(sanitizeError(e));
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
            <h3>My Assessments</h3>
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
                        <BookOpen size={14} style={{ marginRight: 4 }} /> Take OSCE
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
            <h3>{assignments.find((a) => a.id === activeAssignmentId)?.title || 'OSCE'}</h3>
            {getStatusBadge(activeAssignmentId)}
          </div>

          {submitMsg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{submitMsg}</div>}
          {submitErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{submitErr}</div>}

          {loadingQuestions ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading checklist...</p>
          ) : questions.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>This OSCE has no checklist items yet.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {questions.map((q, idx) => {
                  const ans = answers.find((a) => a.questionId === q.id);
                  if (!ans) return null;
                  const isSubmitted = !!submissions.get(activeAssignmentId!);
                  return (
                    <div key={q.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase' }}>
                          Item {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{q.points} pt(s)</span>
                      </div>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{idx + 1}. {q.prompt}</p>

                      {/* Image hint */}
                      {q.image_url && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <img
                            src={q.image_url}
                            alt="Hint"
                            style={{ maxWidth: 100, maxHeight: 75, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setExpandedImage(q.image_url)}
                          />
                          <button
                            type="button"
                            onClick={() => setExpandedImage(q.image_url)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, verticalAlign: 'bottom' }}
                          >
                            <ZoomIn size={14} /> View
                          </button>
                        </div>
                      )}

                      {/* Dynamic Options (Radio Buttons) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(q.choices || []).map((choice, cIdx) => (
                          <label
                            key={cIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: ans.selectedIndex === cIdx ? '2px solid var(--theme-primary)' : '1px solid var(--color-border)',
                              background: ans.selectedIndex === cIdx ? '#f0f9ff' : 'white',
                              cursor: isSubmitted ? 'default' : 'pointer',
                              opacity: isSubmitted && ans.selectedIndex !== cIdx ? 0.6 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={ans.selectedIndex === cIdx}
                              onChange={() => updateAnswer(q.id, cIdx)}
                              disabled={isSubmitted}
                              style={{ cursor: isSubmitted ? 'default' : 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: ans.selectedIndex === cIdx ? 'var(--color-navy)' : 'var(--color-text-muted)', fontWeight: ans.selectedIndex === cIdx ? 600 : 400 }}>
                              {choice}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!submissions.get(activeAssignmentId!) && (
                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={submitting}
                  onClick={submitAssignment}
                  style={{ justifySelf: 'start' }}
                >
                  <Send size={16} style={{ marginRight: 6 }} />
                  {submitting ? 'Submitting...' : 'Submit OSCE'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Expanded image lightbox */}
      {expandedImage && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'pointer' }}
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded hint"
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
