import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, GraduationCap, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { materialTypeFromFile } from '../../lib/materialFile';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';
import groupByWeek from '../../lib/groupByWeek';

const srOnlyStyle: React.CSSProperties = { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

type MaterialType = 'reading' | 'video' | 'link' | 'file' | 'audio';

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


const FacultyCourseContent = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [courseTitle, setCourseTitle] = useState('');
  const [courseStatus, setCourseStatus] = useState('');

  const [courseOk, setCourseOk] = useState(false);
  const [isCourseOwner, setIsCourseOwner] = useState(false);
  const [tab, setTab] = useState<'materials' | 'contributors' | 'students'>('materials');

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
      
  const [loadingPage, setLoadingPage] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [contributors, setContributors] = useState<{ faculty_id: string, full_name: string, email: string }[]>([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyResults, setFacultyResults] = useState<{ id: string, full_name: string, email: string }[]>([]);
  const [searchingFaculty, setSearchingFaculty] = useState(false);

  const [batchStudents, setBatchStudents] = useState<{ id: string, full_name: string, email: string }[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<{ id: string, student_id: string }[]>([]);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [enrollingAll, setEnrollingAll] = useState(false);

  const [matWeek, setMatWeek] = useState('1');
  const [matFile, setMatFile] = useState<File | null>(null);
  /** Draft week inputs per material id while editing (cleared after successful move). */
  const [materialWeekDrafts, setMaterialWeekDrafts] = useState<Record<string, string>>({});

  const materialWeeks = useMemo(() => groupByWeek(materials), [materials]);
  
  const refreshContributors = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('course_contributors')
      .select(`
        faculty_id,
        profiles (
          full_name,
          email
        )
      `)
      .eq('course_id', courseId);
      if (!error && data) {
        setContributors((data as unknown as { faculty_id: string; profiles: { full_name?: string; email?: string }[] }[]).map((d) => ({
          faculty_id: d.faculty_id,
          full_name: d.profiles?.[0]?.full_name || '',
          email: d.profiles?.[0]?.email || ''
        })));
    }
  }, [courseId]);

  const refreshStudents = useCallback(async () => {
    if (!courseId) return;
    // 1. Get batches for this course
    const { data: cbRows } = await supabase
      .from('course_batches')
      .select('batch_id')
      .eq('course_id', courseId);
    const batchIds = (cbRows || []).map((r: { batch_id: string }) => r.batch_id);
    if (batchIds.length > 0) {
      // 2. Get student profiles in those batches
      const { data: spRows } = await supabase
        .from('student_profiles')
        .select('id, profiles(full_name, email)')
        .in('batch_id', batchIds);
    setBatchStudents((spRows as unknown as { id: string; profiles: { full_name?: string; email?: string }[] }[] || []).map((sp) => ({
      id: sp.id,
      full_name: sp.profiles?.[0]?.full_name || '(no name)',
      email: sp.profiles?.[0]?.email || '',
    })));
    } else {
      setBatchStudents([]);
    }
    // 3. Get current enrollments for this course
    const { data: enrRows } = await supabase
      .from('enrollments')
      .select('id, student_id')
      .eq('course_id', courseId);
    setCourseEnrollments((enrRows || []).map((e: { id: string; student_id: string }) => ({ id: e.id, student_id: e.student_id })));
  }, [courseId]);

  const refreshMaterials = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('course_materials')
      .select('id, course_id, week_number, sort_order, title, description, material_type, external_url, file_url, file_name, file_mime_type')
      .eq('course_id', courseId)
      .order('week_number', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    setMaterials(((data as unknown as MaterialRow[]) || []).map((row) => ({ ...row, week_number: row.week_number || 1 })));
  }, [courseId]);

  

  
  
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
        .select('id, title, faculty_id, delivery_mode, status')
        .eq('id', courseId)
        .single();
      if (cErr) throw cErr;

      const courseRow = course as { id: string; title: string; faculty_id: string; delivery_mode: string; status: string } | null;

      const { data: contribData } = await supabase
        .from('course_contributors')
      .select('id, course_id, week_number, sort_order, title, description, material_type, external_url, file_url, file_name, file_mime_type')
        .eq('course_id', courseId)
        .eq('faculty_id', userId)
        .maybeSingle();

      const owner = courseRow?.faculty_id === userId || profile?.role === 'admin';
      const contributor = !!contribData;

      if (!courseRow || (!owner && !contributor)) {
          if (!cancelled) {
            setCourseOk(false);
            setCourseTitle('');
            setCourseStatus('');
            setIsCourseOwner(false);
          }
          return;
        }
        if (!cancelled) {
        setCourseOk(true);
        setCourseTitle(courseRow.title);
        setCourseStatus(courseRow.status || 'draft');

          setIsCourseOwner(owner);
          await refreshMaterials();
                    await refreshContributors();
          await refreshStudents();
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(sanitizeError(e));
          setCourseOk(false);
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, courseId, userId, refreshMaterials]);

  useEffect(() => {
    const q = facultySearch.trim();
    if (!q || q.length < 2) {
      setFacultyResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingFaculty(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'faculty')
        .neq('id', userId)
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);
      setFacultyResults(data || []);
      setSearchingFaculty(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [facultySearch, userId]);

  const addContributor = async (facultyId: string) => {
    if (!courseId) return;
    setErr(null);
    setMsg(null);
    const { error } = await supabase
      .from('course_contributors')
      .insert({ course_id: courseId, faculty_id: facultyId });
    if (error) {
      setErr(sanitizeError(error));
    } else {
      setMsg('Contributor added.');
      setFacultySearch('');
      await refreshContributors();
    }
  };

  const removeContributor = async (facultyId: string) => {
    if (!courseId) return;
    if (!window.confirm('Remove this contributor? They will lose access to manage this course.')) return;
    setErr(null);
    setMsg(null);
    const { error } = await supabase
      .from('course_contributors')
      .delete()
      .match({ course_id: courseId, faculty_id: facultyId });
    if (error) {
      setErr(sanitizeError(error));
    } else {
      setMsg('Contributor removed.');
      await refreshContributors();
    }
  };

  const enrollStudent = async (studentId: string) => {
    if (!courseId) return;
    setEnrollingId(studentId);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.from('enrollments').insert({
      student_id: studentId,
      course_id: courseId,
      status: 'active',
      progress: 0,
    });
    if (error) setErr(sanitizeError(error));
    else {
      setMsg('Student enrolled.');
      await refreshStudents();
    }
    setEnrollingId(null);
  };

  const dropStudent = async (enrollmentId: string) => {
    if (!courseId) return;
    if (!window.confirm('Remove this student from the course? Their enrollment will be deleted.')) return;
    setDroppingId(enrollmentId);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) setErr(sanitizeError(error));
    else {
      setMsg('Student removed from course.');
      await refreshStudents();
    }
    setDroppingId(null);
  };

  const enrollAll = async () => {
    if (!courseId) return;
    setEnrollingAll(true);
    setErr(null);
    setMsg(null);
    const enrolledSet = new Set(courseEnrollments.map(e => e.student_id));
    const toEnroll = batchStudents.filter(s => !enrolledSet.has(s.id));
    if (toEnroll.length === 0) {
      setMsg('All students are already enrolled.');
      setEnrollingAll(false);
      return;
    }
    const { error } = await supabase.from('enrollments').insert(
      toEnroll.map(s => ({ student_id: s.id, course_id: courseId, status: 'active', progress: 0 }))
    );
    if (error) setErr(sanitizeError(error));
    else {
      setMsg(`${toEnroll.length} student(s) enrolled.`);
      await refreshStudents();
    }
    setEnrollingAll(false);
  };

  const updateCourseStatus = async (newStatus: string) => {
    if (!courseId) return;
    setErr(null);
    setMsg(null);
    const { error } = await supabase.from('courses').update({ status: newStatus }).eq('id', courseId);
    if (error) {
      setErr(sanitizeError(error));
    } else {
      setCourseStatus(newStatus);
      setMsg(`Course status updated to ${newStatus}.`);
    }
  };

  const ALLOWED_MATERIAL_MIMES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  ]);
  const MAX_MATERIAL_SIZE = 50 * 1024 * 1024; // 50 MB

  const uploadMaterialFile = async (file: File) => {
    if (!courseId || !userId) return null;

    // Validate MIME type
    if (file.type && !ALLOWED_MATERIAL_MIMES.has(file.type)) {
      throw new Error(`File type "${file.type}" is not allowed. Please upload a PDF, document, image, video, or audio file.`);
    }
    // Validate size
    if (file.size > MAX_MATERIAL_SIZE) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_MATERIAL_SIZE / 1024 / 1024} MB.`);
    }

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
    } catch (e: unknown) {
      setErr(sanitizeError(e));
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
      setErr(sanitizeError(error));
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
    if (!window.confirm(`Delete "${row.title}"? This will also remove the uploaded file. This action cannot be undone.`)) return;
    setErr(null);
    const { error } = await supabase.from('course_materials').delete().eq('id', row.id);
    if (error) {
      setErr(sanitizeError(error));
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

  
  
  
  
  if (!courseId) return null;
  if (loadingPage) return <div className={styles.dashboardWrapper}><p style={{ color: 'var(--color-text-muted)' }}>Loading course…</p></div>;

  if (!courseOk) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: '#b91c1c' }}>{err || 'You do not have access to this course.'}</p>
        <Link to={profile?.role === 'admin' ? '/admin/courses' : '/faculty/my-courses'} style={{ color: 'var(--theme-primary)' }}>
          Back to Courses
        </Link>
      </div>
    );
  }



  return (
    <div className={styles.dashboardWrapper}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button type="button" onClick={() => navigate(profile?.role === 'admin' ? '/admin/courses' : '/faculty/my-courses')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', padding: 0 }}>
            <ArrowLeft size={18} /> {profile?.role === 'admin' ? 'Back to Courses' : 'My courses'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>{courseTitle}</h2>
            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, background: courseStatus === 'active' ? '#dcfce7' : courseStatus === 'ended' ? '#f3f4f6' : '#fef9c3', color: courseStatus === 'active' ? '#166534' : courseStatus === 'ended' ? '#374151' : '#854d0e', textTransform: 'capitalize' }}>
              {courseStatus || 'draft'}
            </span>
          </div>
        </div>

        {isCourseOwner && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {courseStatus !== 'active' && (
              <button
                type="button"
                onClick={() => updateCourseStatus('active')}
                style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Start Course
              </button>
            )}
            {courseStatus !== 'ended' && courseStatus === 'active' && (
              <button
                type="button"
                onClick={() => updateCourseStatus('ended')}
                style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                End Course
              </button>
            )}
          </div>
        )}
      </div>

      {msg && <p style={{ color: '#166534', marginBottom: '1rem' }}>{msg}</p>}
      {err && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{err}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('materials')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: tab === 'materials' ? 'none' : '1px solid var(--color-border)', background: tab === 'materials' ? 'var(--theme-primary)' : 'white', color: tab === 'materials' ? 'white' : 'var(--color-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <FileText size={16} /> Learning materials
        </button>
        <button type="button" onClick={() => setTab('students')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: tab === 'students' ? 'none' : '1px solid var(--color-border)', background: tab === 'students' ? 'var(--theme-primary)' : 'white', color: tab === 'students' ? 'white' : 'var(--color-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <GraduationCap size={16} /> Students
        </button>
        <button type="button" onClick={() => setTab('contributors')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: tab === 'contributors' ? 'none' : '1px solid var(--color-border)', background: tab === 'contributors' ? 'var(--theme-primary)' : 'white', color: tab === 'contributors' ? 'white' : 'var(--color-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Users size={16} /> Contributors
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
{m.external_url && <a href={m.external_url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--theme-primary)', fontSize: '0.875rem' }}><ExternalLink size={14} style={{ display: 'inline', marginRight: 4 }} />Open link<span style={srOnlyStyle}>(opens in new window)</span></a>}
{m.file_url && <a href={m.file_url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--theme-primary)', fontSize: '0.875rem', display: 'block' }}>{m.file_name || 'Download file'}<span style={srOnlyStyle}>(opens in new window)</span></a>}
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

      {tab === 'contributors' && (
        <div className={styles.approvalsCard} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.approvalsHeader}>
            <h3>Course Contributors</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Contributors can add, edit, and delete materials and assignments for this course.
          </p>

          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Current Contributors</h4>
            {contributors.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No other faculty members have been added to this course.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {contributors.map((c) => (
                  <div key={c.faculty_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#fafafa' }}>
                    <div>
                      <strong>{c.full_name}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.email}</span>
                    </div>
                    {isCourseOwner && (
                      <button type="button" onClick={() => removeContributor(c.faculty_id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }} title="Remove contributor" aria-label={`Remove contributor ${c.full_name}`}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isCourseOwner && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Add Contributor</h4>
              <div style={{ position: 'relative' }}>
                <input
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty by name or email..."
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
                {facultySearch.length >= 2 && (
                  <div style={{ position: 'absolute', width: '100%', marginTop: '0.25rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', zIndex: 10, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    {searchingFaculty ? (
                      <div style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>Searching...</div>
                    ) : facultyResults.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>No faculty found.</div>
                    ) : (
                      facultyResults.map((f) => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                          <div>
                            <strong>{f.full_name}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{f.email}</span>
                          </div>
                          {contributors.some(c => c.faculty_id === f.id) ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Added</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addContributor(f.id)}
                              style={{ padding: '0.35rem 0.75rem', background: 'var(--theme-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className={styles.approvalsCard} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.approvalsHeader}>
            <h3>Enrolled Students</h3>
            {batchStudents.length > 0 && (
              <button
                type="button"
                onClick={enrollAll}
                disabled={enrollingAll}
                style={{ padding: '0.4rem 0.85rem', background: 'var(--theme-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: enrollingAll ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <UserPlus size={14} /> {enrollingAll ? 'Enrolling...' : 'Enroll All'}
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Students from the assigned batch(es) are listed below. Add them individually or use &ldquo;Enroll All&rdquo; to add everyone at once.
          </p>

          {batchStudents.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', padding: '1.5rem', textAlign: 'center' }}>
              No batches assigned to this course yet. Assign batches when creating or editing the course to see students here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {batchStudents.map((s) => {
                const enrollment = courseEnrollments.find(e => e.student_id === s.id);
                const isEnrolled = !!enrollment;
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: isEnrolled ? '#f0fdf4' : '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: isEnrolled ? '#bbf7d0' : 'var(--color-border)', color: isEnrolled ? '#166534' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {(s.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{s.full_name}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.email}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isEnrolled ? (
                        <>
                          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '1rem', fontWeight: 600 }}>Enrolled</span>
                          <button
                            type="button"
                            onClick={() => dropStudent(enrollment!.id)}
                            disabled={droppingId === enrollment!.id}
                            style={{ padding: '0.3rem', border: 'none', background: 'transparent', color: '#b91c1c', cursor: droppingId === enrollment!.id ? 'not-allowed' : 'pointer' }}
                            title="Remove from course"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => enrollStudent(s.id)}
                          disabled={enrollingId === s.id}
                          style={{ padding: '0.35rem 0.75rem', background: 'var(--theme-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: enrollingId === s.id ? 'not-allowed' : 'pointer' }}
                        >
                          {enrollingId === s.id ? 'Adding...' : 'Add Student'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            <strong>{courseEnrollments.length}</strong> of <strong>{batchStudents.length}</strong> batch student(s) enrolled
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyCourseContent;
