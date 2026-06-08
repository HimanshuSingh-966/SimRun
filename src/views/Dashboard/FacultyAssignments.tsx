import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, BookOpen, ClipboardList, Download, Eye, FileText, Image, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import FacultyChecklistBuilder from './FacultyChecklistBuilder';
import FacultyChecklistManagement from './FacultyChecklistManagement';
import styles from './Admin.module.css';

interface CourseRow {
  id: string;
  title: string;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  week_number: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string | null;
}

interface ChecklistRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  is_peer_evaluation_enabled: boolean;
  created_at: string | null;
}

interface QuestionRow {
  id: string;
  assignment_id: string;
  question_type: string;
  prompt: string;
  choices: string[];
  correct_indices: number[];
  image_url: string | null;
  points: number;
  sort_order: number;
}

interface ResultRow {
  studentName: string;
  regNo: string;
  course: string;
  semester: string;
  marks: number | null;
  submittedAt: string | null;
  status: string | null;
}

type View = 'courses' | 'courseAssessments' | 'osceBuilder' | 'checklistBuilder' | 'checklistManagement' | 'results';

const FacultyAssignments = () => {
  const { user, loading: authLoading } = useAuth();

  // View state
  const [view, setView] = useState<View>('courses');

  // Course list
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [errorCourses, setErrorCourses] = useState<string | null>(null);

  // Selected course
  const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);

  // Assignments for selected course
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // OSCE builder state
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeAssignmentTitle, setActiveAssignmentTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [asgWeek, setAsgWeek] = useState('1');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [qPrompt, setQPrompt] = useState('');
  const [qImageFile, setQImageFile] = useState<File | null>(null);
  const [qPoints, setQPoints] = useState('1');

  // Checklist management state
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);

  const [qOptions, setQOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Results view state
  const [resultsAssignment, setResultsAssignment] = useState<AssignmentRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');

  // Question counts for the course assessments view
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());

  // ─── Load faculty courses ─────────────────────────
  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;
    setLoadingCourses(true);
    setErrorCourses(null);
    (async () => {
      try {
        const { data: contribData } = await supabase
          .from('course_contributors')
          .select('course_id')
          .eq('faculty_id', user.id);
        
        const contribIds = (contribData || []).map((row) => row.course_id);

        let query = supabase
          .from('courses')
          .select('id, title')
          .order('title');

        if (contribIds.length > 0) {
          query = query.or(`faculty_id.eq.${user.id},id.in.(${contribIds.join(',')})`);
        } else {
          query = query.eq('faculty_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setCourses((data as CourseRow[]) || []);
      } catch (e: unknown) {
        if (!cancelled) setErrorCourses(sanitizeError(e));
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  // ─── Load assignments for a course ────────────────
  const loadCourseAssignments = useCallback(async (courseId: string) => {
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, course_id, week_number, title, description, due_date, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data as AssignmentRow[]) || [];
      setAssignments(rows);

      // Load question counts
      const aIds = rows.map(a => a.id);
      if (aIds.length > 0) {
        const { data: qRows } = await supabase
          .from('assignment_questions')
          .select('assignment_id')
          .in('assignment_id', aIds);
        const counts = new Map<string, number>();
        (qRows || []).forEach((q: { assignment_id: string }) => {
          counts.set(q.assignment_id, (counts.get(q.assignment_id) || 0) + 1);
        });
        setQuestionCounts(counts);
      } else {
        setQuestionCounts(new Map());
      }

      // Load checklists
      const { data: clData, error: clErr } = await supabase
        .from('checklists')
        .select('id, course_id, title, description, objectives, is_peer_evaluation_enabled, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (!clErr) {
        setChecklists((clData as ChecklistRow[]) || []);
      }

    } catch {
      setAssignments([]);
      setChecklists([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  // ─── Load questions for an assignment ─────────────
  const refreshQuestions = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('assignment_questions')
      .select('id, assignment_id, question_type, prompt, choices, correct_indices, image_url, points, sort_order')
      .eq('assignment_id', assignmentId)
      .order('sort_order', { ascending: true });
    if (!error) setQuestions((data as QuestionRow[]) || []);
  }, []);

  // ─── Navigate to course ───────────────────────────
  const openCourse = (course: CourseRow) => {
    setSelectedCourse(course);
    setView('courseAssessments');
    loadCourseAssignments(course.id);
  };

  // ─── Navigate to OSCE builder ─────────────────────
  const openOsceBuilder = () => {
    setActiveAssignmentId(null);
    setActiveAssignmentTitle('');
    setQuestions([]);
    setAsgWeek('1');
    setAsgTitle('');
    setAsgDesc('');
    setAsgDue('');
    setQPrompt('');
    setQImageFile(null);
    setQPoints('1');
    setQOptions(['Option 1', 'Option 2']);
    setQCorrectIndex(0);
    setMsg(null);
    setErr(null);
    setView('osceBuilder');
  };

  // ─── Navigate to Checklist builder ────────────────
  const openChecklistBuilder = () => {
    setActiveAssignmentId(null); // Not used for checklists in this view, but good to reset
    setView('checklistBuilder');
  };

  const openChecklistManagement = (c: ChecklistRow) => {
    setActiveChecklistId(c.id);
    setView('checklistManagement');
  };

  const editOsce = (a: AssignmentRow) => {
    setActiveAssignmentId(a.id);
    setActiveAssignmentTitle(a.title);
    setMsg(null);
    setErr(null);
    setQPrompt('');
    setQImageFile(null);
    setQPoints('1');
    setQOptions(['Option 1', 'Option 2']);
    setQCorrectIndex(0);
    refreshQuestions(a.id);
    setView('osceBuilder');
  };

  // ─── Create OSCE assignment ───────────────────────
  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !asgTitle.trim()) return;
    setErr(null);
    setMsg(null);
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        course_id: selectedCourse.id,
        week_number: Math.max(1, Number(asgWeek) || 1),
        title: asgTitle.trim(),
        description: asgDesc.trim() || null,
        due_date: asgDue ? new Date(asgDue).toISOString() : null,
      })
      .select('id')
      .single();
    if (error) { setErr(sanitizeError(error)); return; }
    setAsgTitle('');
    setAsgDesc('');
    setAsgDue('');
    setActiveAssignmentId(data.id);
    setActiveAssignmentTitle(asgTitle.trim());
    setMsg('OSCE created. Add questions below.');
  };

  // ─── Upload question image ────────────────────────
  const uploadQuestionImage = async (file: File): Promise<string | null> => {
    if (!selectedCourse || !user?.id) return null;
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50) || 'img';
    const path = `${user.id}/${selectedCourse.id}/${Date.now()}_${safeBase}.${ext}`;
    const { error: upErr } = await supabase.storage.from('assignment-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('assignment-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // ─── Add question ─────────────────────────────────
  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignmentId || !qPrompt.trim()) return;
    setErr(null);
    setMsg(null);
    try {
      let imageUrl: string | null = null;
      if (qImageFile) {
        imageUrl = await uploadQuestionImage(qImageFile);
      }
      const pts = Math.max(0, Number(qPoints) || 1);
      const nextOrder = questions.length ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
      const { error } = await supabase.from('assignment_questions').insert({
        assignment_id: activeAssignmentId,
        question_type: 'osce',
        prompt: qPrompt.trim(),
        choices: qOptions,
        correct_indices: [qCorrectIndex],
        model_answer: null,
        image_url: imageUrl,
        points: pts,
        sort_order: nextOrder,
      });
      if (error) return setErr(sanitizeError(error));
      setQPrompt('');
      setQImageFile(null);
      setQOptions(['Option 1', 'Option 2']);
      setQCorrectIndex(0);
      setMsg('OSCE question added.');
      await refreshQuestions(activeAssignmentId);
} catch (e: unknown) {
    setErr(sanitizeError(e));
    }
  };

  const removeQuestion = async (qId: string) => {
    if (!activeAssignmentId) return;
    if (!window.confirm('Delete this question? Any associated student answers will also be removed. This cannot be undone.')) return;
    const { error } = await supabase.from('assignment_questions').delete().eq('id', qId);
    if (error) setErr(sanitizeError(error));
    else await refreshQuestions(activeAssignmentId);
  };

  // ─── View Results ─────────────────────────────────
  const viewResults = async (assignment: AssignmentRow) => {
    setResultsAssignment(assignment);
    setLoadingResults(true);
    setResultsError(null);
    setResults([]);
    setShowExportModal(false);
    setView('results');

    try {
      const { data: subs, error: sErr } = await supabase
        .from('submissions')
        .select('student_id, status, submitted_at, score')
        .eq('assignment_id', assignment.id);
      if (sErr) throw sErr;

      const submissions = (subs || []) as { student_id: string; status: string | null; submitted_at: string | null; score: number | null }[];
      if (submissions.length === 0) {
        setResults([]);
        setLoadingResults(false);
        return;
      }

      const studentIds = submissions.map(s => s.student_id);
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', studentIds);
      const profileMap = new Map<string, string>(
        ((profilesData || []) as { id: string; full_name: string }[]).map(p => [p.id, p.full_name])
      );
      const { data: spData } = await supabase.from('student_profiles').select('id, reg_number, semester').in('id', studentIds);
      const spMap = new Map<string, { reg_number: string | null; semester: string | null }>(
        ((spData || []) as { id: string; reg_number: string | null; semester: string | null }[]).map(sp => [sp.id, { reg_number: sp.reg_number, semester: sp.semester }])
      );

      const resultRows: ResultRow[] = submissions.map(sub => {
        const sp = spMap.get(sub.student_id);
        return {
          studentName: profileMap.get(sub.student_id) || 'Unknown',
          regNo: sp?.reg_number || '—',
          course: selectedCourse?.title || '',
          semester: sp?.semester || '—',
          marks: sub.score,
          submittedAt: sub.submitted_at,
          status: sub.status,
        };
      });
      resultRows.sort((a, b) => a.studentName.localeCompare(b.studentName));
      setResults(resultRows);
    } catch (e: unknown) {
      setResultsError(sanitizeError(e));
    } finally {
      setLoadingResults(false);
    }
  };

  const openExportModal = () => {
    if (!resultsAssignment) return;
    setExportFilename(`${resultsAssignment.title.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')}_results`);
    setShowExportModal(true);
  };

  const downloadCsv = () => {
    if (results.length === 0) return;
    const headers = ['Student Name', 'Reg No', 'Course', 'Semester', 'Marks'];
    const csvRows = [
      headers.join(','),
      ...results.map(r => [
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        `"${(r.regNo || '').replace(/"/g, '""')}"`,
        `"${(r.course || '').replace(/"/g, '""')}"`,
        `"${(r.semester || '').replace(/"/g, '""')}"`,
        r.marks !== null ? r.marks : '',
      ].join(',')),
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename || 'results'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // ─── Back helpers ─────────────────────────────────
  const goBackToCourses = () => {
    setSelectedCourse(null);
    setAssignments([]);
    setView('courses');
  };

  const goBackToCourseAssessments = () => {
    if (selectedCourse) loadCourseAssignments(selectedCourse.id);
    setActiveAssignmentId(null);
    setQuestions([]);
    setMsg(null);
    setErr(null);
    setView('courseAssessments');
  };

  // ─── RENDER ───────────────────────────────────────
  return (
    <div className={styles.dashboardWrapper}>

      {/* ═══════════════════════════════════════════════ */}
      {/* VIEW 1: COURSE LIST                            */}
      {/* ═══════════════════════════════════════════════ */}
      {view === 'courses' && (
        <div className={styles.approvalsCard}>
          <div className={styles.approvalsHeader}>
            <h3>Assessment</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Select a course to create or manage assessments.
          </p>

          {errorCourses && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{errorCourses}</p>}

          {loadingCourses ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading courses...</p>
          ) : courses.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No courses found. Create a course first from &ldquo;My Courses&rdquo;.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCourse(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--theme-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: 'var(--theme-primary-light)', color: 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-navy)' }}>{c.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Click to manage assessments →</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* VIEW 2: COURSE ASSESSMENTS                     */}
      {/* ═══════════════════════════════════════════════ */}
      {view === 'courseAssessments' && selectedCourse && (
        <div className={styles.approvalsCard}>
          <button
            type="button"
            onClick={goBackToCourses}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to courses
          </button>

          <div className={styles.approvalsHeader} style={{ marginBottom: '0.5rem' }}>
            <h3>{selectedCourse.title}</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Create or manage OSCE and Checklist assessments for this course.
          </p>

          {/* Create buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openOsceBuilder}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--theme-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Create OSCE
            </button>
            <button
              type="button"
              onClick={openChecklistBuilder}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--theme-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <ClipboardList size={16} /> Create Checklist
            </button>
          </div>

          {/* Existing Assessments */}
          <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--color-navy)' }}>Existing Assessments</h4>
          {loadingAssignments ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading assessments...</p>
          ) : assignments.length === 0 && checklists.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No assessments created yet for this course.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {/* OSCEs */}
              {assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem',
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        OSCE &middot; Week {a.week_number || 1} &middot; {questionCounts.get(a.id) || 0} question(s)
                        {a.due_date ? ` | Due: ${new Date(a.due_date).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => viewResults(a)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#16a34a', background: 'none', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} /> View Results
                      </button>
                      <button
                        type="button"
                        onClick={() => editOsce(a)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--theme-primary)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <FileText size={14} /> Edit
                      </button>
                    </div>
                  </div>
                  {a.description && (
                    <p style={{ marginTop: '0.45rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      {a.description}
                    </p>
                  )}
                </div>
              ))}

              {/* Checklists */}
              {checklists.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem',
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Checklist &middot; {c.is_peer_evaluation_enabled ? 'Peer Evaluation Enabled' : 'Faculty Evaluation Only'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => openChecklistManagement(c)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                      >
                        <Eye size={16} /> View & Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* VIEW 3: OSCE BUILDER                           */}
      {/* ═══════════════════════════════════════════════ */}
      {view === 'osceBuilder' && selectedCourse && (
        <div className={styles.approvalsCard}>
          <button
            type="button"
            onClick={goBackToCourseAssessments}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to {selectedCourse.title}
          </button>

          {msg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{msg}</div>}
          {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{err}</div>}

          {/* Step 1: Create the OSCE assignment if not yet created */}
          {!activeAssignmentId ? (
            <>
              <div className={styles.approvalsHeader} style={{ marginBottom: '0.75rem' }}>
                <h3>Create New OSCE</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                For course: <strong>{selectedCourse.title}</strong>
              </p>
              <form onSubmit={addAssignment} style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input type="number" min={1} value={asgWeek} onChange={(e) => setAsgWeek(e.target.value)} placeholder="Week" style={{ width: 120, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  <input value={asgTitle} onChange={(e) => setAsgTitle(e.target.value)} placeholder="OSCE title" required style={{ flex: 1, minWidth: 220, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
                <textarea value={asgDesc} onChange={(e) => setAsgDesc(e.target.value)} rows={3} placeholder="Instructions (optional)" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Due (optional)
                  <input type="datetime-local" value={asgDue} onChange={(e) => setAsgDue(e.target.value)} style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                </label>
                <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }}>Create OSCE</button>
              </form>
            </>
          ) : (
            /* Step 2: Add questions to the created OSCE */
            <>
              <div className={styles.approvalsHeader} style={{ marginBottom: '0.75rem' }}>
                <h3>{activeAssignmentTitle || 'OSCE'} — Questions</h3>
              </div>

              {/* Existing questions */}
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No questions yet. Add your first OSCE question below.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase' }}>Question {idx + 1}</span>
                          <p style={{ marginTop: '0.25rem', fontWeight: 600 }}>{q.prompt}</p>
                          {q.image_url && (
                            <img src={q.image_url} alt="Question hint" style={{ marginTop: '0.5rem', maxWidth: 120, maxHeight: 90, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', objectFit: 'cover', cursor: 'pointer' }} onClick={() => { if (q.image_url) window.open(q.image_url, '_blank', 'noopener,noreferrer'); }} />
                          )}
                          <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Options: {(q.choices || []).join(', ')} &middot; Correct: {q.choices?.[q.correct_indices?.[0]] || '—'} &middot; {q.points} pt(s)
                          </div>
                        </div>
                        <button type="button" onClick={() => removeQuestion(q.id)} style={{ border: 'none', background: 'transparent', color: '#b91c1c', alignSelf: 'flex-start', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add question form */}
              <form onSubmit={addQuestion} style={{ display: 'grid', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Add a new OSCE question. Add custom options and select the correct answer.</p>
                <textarea value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} rows={3} required placeholder="Question prompt (e.g. 'Performed hand hygiene')" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <Image size={16} /> Hint image (optional)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setQImageFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </label>
                  {qImageFile && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{qImageFile.name}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-navy)' }}>Options (Select the correct one)</label>
                  {qOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="correctIndex"
                        checked={qCorrectIndex === i}
                        onChange={() => setQCorrectIndex(i)}
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const n = [...qOptions];
                          n[i] = e.target.value;
                          setQOptions(n);
                        }}
                        required
                        placeholder={`Option ${i + 1}`}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                      {qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const n = [...qOptions];
                            n.splice(i, 1);
                            setQOptions(n);
                            if (qCorrectIndex >= n.length) setQCorrectIndex(Math.max(0, n.length - 1));
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQOptions([...qOptions, `Option ${qOptions.length + 1}`])}
                    style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, background: 'white', cursor: 'pointer', marginTop: '0.5rem' }}
                  >
                    <Plus size={14} /> Add option
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Points
                    <input type="number" min={0} step={0.5} value={qPoints} onChange={(e) => setQPoints(e.target.value)} style={{ marginLeft: '0.5rem', width: 100, padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  </label>
                </div>
                <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }}><BookOpen size={16} style={{ marginRight: 6 }} />Add question</button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* VIEW 4: RESULTS                                */}
      {/* ═══════════════════════════════════════════════ */}
      {view === 'checklistBuilder' && selectedCourse && (
        <FacultyChecklistBuilder courseId={selectedCourse.id} onBack={goBackToCourseAssessments} />
      )}

      {view === 'checklistManagement' && activeChecklistId && (
        <FacultyChecklistManagement checklistId={activeChecklistId} onBack={goBackToCourseAssessments} />
      )}

      {view === 'results' && resultsAssignment && (
        <div className={styles.approvalsCard}>
          <button
            type="button"
            onClick={goBackToCourseAssessments}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to assessments
          </button>

          <div className={styles.approvalsHeader} style={{ marginBottom: '0.5rem' }}>
            <h3>Results: {resultsAssignment.title}</h3>
            {results.length > 0 && (
              <button
                type="button"
                onClick={openExportModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Download size={14} /> Export Results
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {selectedCourse?.title} &middot; Week {resultsAssignment.week_number || 1}
          </p>

          {resultsError && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{resultsError}</p>}

          {loadingResults ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading results...</p>
          ) : results.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No submissions yet for this assessment.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Student Name</th>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Reg No</th>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Course</th>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Semester</th>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Marks</th>
                    <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-navy)' }}>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.studentName}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.regNo}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.course}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.semester}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 700, fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af' }}>
                          {r.marks !== null ? r.marks : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                Total submissions: <strong>{results.length}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Prompt Modal */}
      {showExportModal && resultsAssignment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowExportModal(false)}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1.5rem', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowExportModal(false)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>

            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Export Results</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Export <strong>{results.length}</strong> student result{results.length !== 1 ? 's' : ''} for &ldquo;{resultsAssignment.title}&rdquo;?
            </p>

            <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>CSV Columns:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['Student Name', 'Reg No', 'Course', 'Semester', 'Marks'].map(col => (
                  <span key={col} style={{ padding: '0.2rem 0.6rem', background: '#dbeafe', color: '#1e40af', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>Filename (optional)</span>
              <input
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="results"
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>.csv</span>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={14} /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAssignments;
