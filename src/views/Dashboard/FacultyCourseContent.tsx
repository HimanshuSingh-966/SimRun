import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardList, ExternalLink, FileText, Plus, Trash2 } from 'lucide-react';
import { materialTypeFromFile } from '../../lib/materialFile';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

type MaterialType = 'reading' | 'video' | 'link' | 'file' | 'audio';
type QuestionType = 'mcq' | 'msq' | 'short_answer' | 'long_answer';

interface MaterialRow {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description: string | null;
  material_type: MaterialType;
  content: string | null;
  markdown_content: string | null;
  external_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string | null;
}

interface QuestionRow {
  id: string;
  assignment_id: string;
  question_type: QuestionType;
  prompt: string;
  choices: string[];
  correct_indices: number[];
  model_answer: string | null;
  points: number;
  sort_order: number;
}

const groupByWeek = <T extends { week_number: number }>(items: T[]) => {
  const grouped = new Map<number, T[]>();
  items.forEach((item) => {
    const key = item.week_number || 1;
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  });
  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
};

const FacultyCourseContent = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [courseTitle, setCourseTitle] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'self_paced' | 'timeline'>('self_paced');
  const [courseOk, setCourseOk] = useState(false);
  const [tab, setTab] = useState<'materials' | 'assignments'>('materials');

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [loadingPage, setLoadingPage] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [matWeek, setMatWeek] = useState('1');
  const [matFile, setMatFile] = useState<File | null>(null);
  /** Draft week inputs per material id while editing (cleared after successful move). */
  const [materialWeekDrafts, setMaterialWeekDrafts] = useState<Record<string, string>>({});

  const [asgWeek, setAsgWeek] = useState('1');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDue, setAsgDue] = useState('');

  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qOptions, setQOptions] = useState('Option A\nOption B\nOption C\nOption D');
  const [qCorrectMcq, setQCorrectMcq] = useState(0);
  const [qCorrectMsq, setQCorrectMsq] = useState<Record<number, boolean>>({ 0: true });
  const [qModel, setQModel] = useState('');
  const [qPoints, setQPoints] = useState('1');

  const materialWeeks = useMemo(() => groupByWeek(materials), [materials]);
  const assignmentWeeks = useMemo(() => groupByWeek(assignments), [assignments]);

  const parseOptions = () =>
    qOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const refreshMaterials = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('week_number', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    setMaterials(((data as unknown as MaterialRow[]) || []).map((row) => ({ ...row, week_number: row.week_number || 1 })));
  }, [courseId]);

  const refreshAssignments = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('week_number', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    setAssignments(((data as unknown as AssignmentRow[]) || []).map((row) => ({ ...row, week_number: row.week_number || 1 })));
  }, [courseId]);

  const refreshQuestions = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map((row: any) => ({
      ...row,
      choices: Array.isArray(row.choices) ? row.choices : JSON.parse(JSON.stringify(row.choices || [])),
      correct_indices: Array.isArray(row.correct_indices)
        ? row.correct_indices
        : JSON.parse(JSON.stringify(row.correct_indices || [])),
    })) as QuestionRow[];
    setQuestions(mapped);
  }, []);

  useEffect(() => {
    if (authLoading || !courseId || !userId) {
      if (!authLoading && !userId) setLoadingPage(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingPage(true);
      setErr(null);
      try {
        const { data: course, error: cErr } = await supabase
          .from('courses')
          .select('id, title, faculty_id, delivery_mode')
          .eq('id', courseId)
          .single();
        if (cErr) throw cErr;
        if (!course || (course as any).faculty_id !== userId) {
          if (!cancelled) {
            setCourseOk(false);
            setCourseTitle('');
          }
          return;
        }
        if (!cancelled) {
          setCourseOk(true);
          setCourseTitle((course as any).title || '');
          setDeliveryMode(((course as any).delivery_mode || 'self_paced') as 'self_paced' | 'timeline');
          await refreshMaterials();
          await refreshAssignments();
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Could not load course.');
          setCourseOk(false);
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, courseId, userId, refreshMaterials, refreshAssignments]);

  useEffect(() => {
    if (activeAssignmentId) {
      refreshQuestions(activeAssignmentId);
    } else {
      setQuestions([]);
    }
  }, [activeAssignmentId, refreshQuestions]);

  const uploadMaterialFile = async (file: File) => {
    if (!courseId || !userId) return null;
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const base = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name;
    const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const path = `${userId}/${courseId}/${Date.now()}_${safeBase}.${ext}`;
    const { error: upErr } = await supabase.storage.from('course-material-files').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('course-material-files').getPublicUrl(path);
    return data.publicUrl;
  };

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !matFile) return;
    setErr(null);
    setMsg(null);

    try {
      const fileUrl = await uploadMaterialFile(matFile);
      const derivedTitle = matFile.name.replace(/\.[^.]+$/, '') || 'Untitled file';
      const matType = materialTypeFromFile(matFile);

      const nextOrder = materials.length ? Math.max(...materials.map((m) => m.sort_order)) + 1 : 0;
      const { error } = await supabase.from('course_materials').insert({
        course_id: courseId,
        week_number: Math.max(1, Number(matWeek) || 1),
        title: derivedTitle,
        description: null,
        material_type: matType,
        content: null,
        external_url: null,
        file_url: fileUrl,
        file_name: matFile.name,
        file_mime_type: matFile.type,
        file_size_bytes: matFile.size,
        sort_order: nextOrder,
      });
      if (error) throw error;

      setMatFile(null);
      setMsg('Material added.');
      await refreshMaterials();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add material.');
    }
  };

  const moveMaterialToWeek = async (row: MaterialRow) => {
    setErr(null);
    setMsg(null);
    const raw = materialWeekDrafts[row.id] ?? String(row.week_number);
    const nextWeek = Math.max(1, parseInt(String(raw).trim(), 10) || 1);
    if (nextWeek === row.week_number) {
      setMsg('Already in that week.');
      return;
    }
    const { error } = await supabase.from('course_materials').update({ week_number: nextWeek }).eq('id', row.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setMaterialWeekDrafts((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setMsg(`Moved to week ${nextWeek}.`);
    await refreshMaterials();
  };

  const removeMaterial = async (row: MaterialRow) => {
    setErr(null);
    const { error } = await supabase.from('course_materials').delete().eq('id', row.id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (row.file_url && userId && courseId && row.file_name) {
      const marker = '/course-material-files/';
      const idx = row.file_url.indexOf(marker);
      if (idx >= 0) {
        const objectPath = row.file_url.slice(idx + marker.length);
        await supabase.storage.from('course-material-files').remove([objectPath]);
      }
    }
    await refreshMaterials();
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !asgTitle.trim()) return;
    setErr(null);
    setMsg(null);

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        course_id: courseId,
        week_number: Math.max(1, Number(asgWeek) || 1),
        title: asgTitle.trim(),
        description: asgDesc.trim() || null,
        due_date: asgDue ? new Date(asgDue).toISOString() : null,
      })
      .select('id')
      .single();
    if (error) {
      setErr(error.message);
      return;
    }
    setAsgTitle('');
    setAsgDesc('');
    setAsgDue('');
    setActiveAssignmentId(data.id);
    setMsg('Assignment created. Add questions below.');
    await refreshAssignments();
  };

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignmentId || !qPrompt.trim()) return;
    setErr(null);
    setMsg(null);

    const options = parseOptions();
    let correct: number[] = [];
    if (qType === 'mcq') {
      if (options.length < 2) return setErr('MCQ needs at least two options.');
      if (qCorrectMcq < 0 || qCorrectMcq >= options.length) return setErr('Pick a valid correct option.');
      correct = [qCorrectMcq];
    } else if (qType === 'msq') {
      if (options.length < 2) return setErr('MSQ needs at least two options.');
      correct = Object.entries(qCorrectMsq)
        .filter(([, v]) => v)
        .map(([k]) => Number(k))
        .filter((i) => i >= 0 && i < options.length);
      if (correct.length === 0) return setErr('Select at least one correct option for MSQ.');
    }

    const pts = Math.max(0, Number(qPoints) || 1);
    const nextOrder = questions.length ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
    const { error } = await supabase.from('assignment_questions').insert({
      assignment_id: activeAssignmentId,
      question_type: qType,
      prompt: qPrompt.trim(),
      choices: qType === 'mcq' || qType === 'msq' ? options : [],
      correct_indices: qType === 'mcq' || qType === 'msq' ? correct : [],
      model_answer: qType === 'short_answer' || qType === 'long_answer' ? qModel.trim() || null : null,
      points: pts,
      sort_order: nextOrder,
    });
    if (error) return setErr(error.message);
    setQPrompt('');
    setQModel('');
    setMsg('Question added.');
    await refreshQuestions(activeAssignmentId);
  };

  const removeQuestion = async (qId: string) => {
    if (!activeAssignmentId) return;
    const { error } = await supabase.from('assignment_questions').delete().eq('id', qId);
    if (error) setErr(error.message);
    else await refreshQuestions(activeAssignmentId);
  };

  if (!courseId) return null;
  if (loadingPage) return <div className={styles.dashboardWrapper}><p style={{ color: 'var(--color-text-muted)' }}>Loading course…</p></div>;

  if (!courseOk) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: '#b91c1c' }}>{err || 'You do not have access to this course.'}</p>
        <Link to="/faculty/my-courses" style={{ color: 'var(--theme-primary)' }}>Back to My Courses</Link>
      </div>
    );
  }

  const optionsParsed = parseOptions();

  return (
    <div className={styles.dashboardWrapper}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => navigate('/faculty/my-courses')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', padding: 0 }}>
          <ArrowLeft size={18} /> My courses
        </button>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-navy)' }}>{courseTitle}</h2>
      </div>

      {msg && <p style={{ color: '#166534', marginBottom: '1rem' }}>{msg}</p>}
      {err && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{err}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('materials')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: tab === 'materials' ? 'none' : '1px solid var(--color-border)', background: tab === 'materials' ? 'var(--theme-primary)' : 'white', color: tab === 'materials' ? 'white' : 'var(--color-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <FileText size={16} /> Learning materials
        </button>
        <button type="button" onClick={() => setTab('assignments')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: tab === 'assignments' ? 'none' : '1px solid var(--color-border)', background: tab === 'assignments' ? 'var(--theme-primary)' : 'white', color: tab === 'assignments' ? 'white' : 'var(--color-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ClipboardList size={16} /> Assignments
        </button>
      </div>

      {tab === 'materials' && (
        <div className={styles.approvalsCard} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.approvalsHeader}><h3>Add material</h3></div>
          <form onSubmit={addMaterial} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input type="number" min={1} value={matWeek} onChange={(e) => setMatWeek(e.target.value)} placeholder="Week" style={{ width: 120, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Upload PDFs, documents, images, video, or audio. Large media may take a while; ensure your Supabase Storage bucket allows the file size and MIME types you need.
            </p>
            <input
              type="file"
              accept="video/*,audio/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              onChange={(e) => setMatFile(e.target.files?.[0] || null)}
              style={{ padding: '0.5rem' }}
            />
            {matFile && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Using file name as material title: <strong>{matFile.name}</strong>
                <span style={{ display: 'block', marginTop: '0.25rem' }}>
                  Stored as: <strong>{materialTypeFromFile(matFile)}</strong>
                  {matFile.type ? ` (${matFile.type})` : ''}
                </span>
              </div>
            )}
            <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add material
            </button>
          </form>

          {materialWeeks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No materials yet.</p>
          ) : (
            materialWeeks.map(([week, rows]) => (
              <div key={week} style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Week {week}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {rows.map((m) => (
                    <div key={m.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{m.title}</strong>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>{m.material_type}</span>
                        {m.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{m.description}</p>}
                        {m.external_url && <a href={m.external_url} target="_blank" rel="noreferrer" style={{ color: 'var(--theme-primary)', fontSize: '0.875rem' }}><ExternalLink size={14} style={{ display: 'inline', marginRight: 4 }} />Open link</a>}
                        {m.file_url && <a href={m.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--theme-primary)', fontSize: '0.875rem', display: 'block' }}>{m.file_name || 'Download file'}</a>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <label htmlFor={`mat-week-${m.id}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Week</label>
                          <input
                            id={`mat-week-${m.id}`}
                            type="number"
                            min={1}
                            value={materialWeekDrafts[m.id] ?? String(m.week_number)}
                            onChange={(e) => setMaterialWeekDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            style={{ width: 64, padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                          />
                          <button type="button" className={styles.submitBtn} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => moveMaterialToWeek(m)}>
                            Move
                          </button>
                        </div>
                        <button type="button" onClick={() => removeMaterial(m)} style={{ border: 'none', background: 'transparent', color: '#b91c1c' }} aria-label="Remove material">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <>
          <div className={styles.approvalsCard} style={{ marginBottom: '1.25rem' }}>
            <div className={styles.approvalsHeader}><h3>New assignment</h3></div>
            <form onSubmit={addAssignment} style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input type="number" min={1} value={asgWeek} onChange={(e) => setAsgWeek(e.target.value)} placeholder="Week" style={{ width: 120, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <input value={asgTitle} onChange={(e) => setAsgTitle(e.target.value)} placeholder="Assignment title" required style={{ flex: 1, minWidth: 220, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <textarea value={asgDesc} onChange={(e) => setAsgDesc(e.target.value)} rows={3} placeholder="Instructions (optional)" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Due (optional)
                <input type="datetime-local" value={asgDue} onChange={(e) => setAsgDue(e.target.value)} style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              </label>
              <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }}>Create assignment</button>
            </form>
          </div>

          <div className={styles.approvalsCard} style={{ marginBottom: '1.25rem' }}>
            <div className={styles.approvalsHeader}><h3>Assignments by week</h3></div>
            {assignmentWeeks.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No assignments yet.</p>
            ) : (
              assignmentWeeks.map(([week, rows]) => (
                <div key={week} style={{ marginBottom: '0.75rem' }}>
                  <h4 style={{ marginBottom: '0.4rem' }}>Week {week}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rows.map((a) => (
                      <button key={a.id} type="button" onClick={() => setActiveAssignmentId(a.id)} style={{ textAlign: 'left', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-md)', border: activeAssignmentId === a.id ? '2px solid var(--theme-primary)' : '1px solid var(--color-border)', background: activeAssignmentId === a.id ? 'var(--theme-primary-light)' : 'white' }}>
                        <strong>{a.title}</strong>
                        {a.due_date && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due {new Date(a.due_date).toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {activeAssignmentId && (
            <div className={styles.approvalsCard}>
              <div className={styles.approvalsHeader}><h3>Questions</h3></div>
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No questions yet.</p>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase' }}>{q.question_type.replace(/_/g, ' ')}</span>
                          <p style={{ marginTop: '0.25rem', fontWeight: 600 }}>{q.prompt}</p>
                          {(q.question_type === 'mcq' || q.question_type === 'msq') && (
                            <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                              {q.choices.map((choice, i) => <li key={i}>{choice}{q.correct_indices.includes(i) ? ' (correct)' : ''}</li>)}
                            </ul>
                          )}
                          {(q.question_type === 'short_answer' || q.question_type === 'long_answer') && q.model_answer && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Model answer: {q.model_answer}</p>}
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{q.points} pt(s)</span>
                        </div>
                        <button type="button" onClick={() => removeQuestion(q.id)} style={{ border: 'none', background: 'transparent', color: '#b91c1c' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={addQuestion} style={{ display: 'grid', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <select value={qType} onChange={(e) => setQType(e.target.value as QuestionType)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="mcq">MCQ (single correct)</option>
                  <option value="msq">MSQ (multiple correct)</option>
                  <option value="short_answer">Short answer</option>
                  <option value="long_answer">Long answer</option>
                </select>
                <textarea value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} rows={3} required placeholder="Question prompt" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                {(qType === 'mcq' || qType === 'msq') && (
                  <>
                    <textarea value={qOptions} onChange={(e) => setQOptions(e.target.value)} rows={5} placeholder="Options, one per line" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                    {qType === 'mcq' && optionsParsed.length > 0 && (
                      <select value={qCorrectMcq} onChange={(e) => setQCorrectMcq(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        {optionsParsed.map((op, i) => <option key={i} value={i}>{op}</option>)}
                      </select>
                    )}
                    {qType === 'msq' && optionsParsed.map((op, i) => (
                      <label key={i} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="checkbox" checked={!!qCorrectMsq[i]} onChange={(e) => setQCorrectMsq((prev) => ({ ...prev, [i]: e.target.checked }))} />
                        {op}
                      </label>
                    ))}
                  </>
                )}
                {(qType === 'short_answer' || qType === 'long_answer') && <textarea value={qModel} onChange={(e) => setQModel(e.target.value)} rows={qType === 'long_answer' ? 6 : 2} placeholder="Model answer (optional)" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />}
                <input type="number" min={0} step={0.5} value={qPoints} onChange={(e) => setQPoints(e.target.value)} style={{ width: 140, padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }}><BookOpen size={16} style={{ marginRight: 6 }} />Add question</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyCourseContent;
