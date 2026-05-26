import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardList, FileText } from 'lucide-react';
import CourseMaterialAttachment from '../../components/CourseMaterialAttachment';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

interface MaterialRow {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  material_type: string;
  content: string | null;
  markdown_content: string | null;
  external_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  sort_order: number;
}

interface AssignmentRow {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  due_date: string | null;
}

interface CourseOverview {
  duration?: string | null;
  level?: string | null;
  certificate?: string | null;
  language?: string | null;
  instructor_name?: string | null;
  instructor_title?: string | null;
  instructor_bio?: string | null;
  prerequisites?: string[] | null;
  what_you_will_learn?: string[] | null;
}

const groupByWeek = <T extends { week_number: number }>(items: T[]) => {
  const grouped = new Map<number, T[]>();
  items.forEach((item) => {
    const key = item.week_number || 1;
    const arr = grouped.get(key) || [];
    arr.push(item);
    grouped.set(key, arr);
  });
  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
};

const StudentCourseLearn = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseOverview, setCourseOverview] = useState<CourseOverview>({});
  const [enrolled, setEnrolled] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const materialWeeks = useMemo(() => groupByWeek(materials), [materials]);
  const assignmentWeeks = useMemo(() => groupByWeek(assignments), [assignments]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !courseId || !userId) {
      if (!authLoading && !userId) setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: en, error: eErr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (eErr) throw eErr;
        if (!en) {
          if (!cancelled) {
            setEnrolled(false);
            setCourseTitle('');
          }
          return;
        }

        const { data: course, error: cErr } = await supabase
          .from('courses')
          .select('title, description, course_overview')
          .eq('id', courseId)
          .single();
        if (cErr) throw cErr;

        const [{ data: mat }, { data: asg }] = await Promise.all([
          supabase.from('course_materials').select('*').eq('course_id', courseId).order('week_number', { ascending: true }).order('sort_order', { ascending: true }),
          supabase.from('assignments').select('id, week_number, title, description, due_date').eq('course_id', courseId).order('week_number', { ascending: true }).order('created_at', { ascending: false }),
        ]);

        if (!cancelled) {
          setEnrolled(true);
          setCourseTitle((course as { title: string }).title);
          setCourseDescription((course as { description?: string | null }).description || '');
          setCourseOverview(((course as { course_overview?: CourseOverview | null }).course_overview || {}) as CourseOverview);
          setMaterials((mat as MaterialRow[]) || []);
          setAssignments((asg as AssignmentRow[]) || []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load course.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, courseId, userId]);

  if (!courseId) return null;

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: '#b91c1c' }}>{error || 'You are not enrolled in this course.'}</p>
        <Link to="/student/courses" style={{ color: 'var(--theme-primary)', marginTop: '1rem', display: 'inline-block' }}>
          Back to my courses
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <button
        type="button"
        onClick={() => navigate('/student/courses')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'none',
          border: 'none',
          color: 'var(--theme-primary)',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} /> My courses
      </button>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--color-navy)', marginBottom: '0.25rem' }}>{courseTitle}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Course content and assignments</p>
      {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className={styles.approvalsCard}>
          <div className={styles.approvalsHeader}>
            <h3>Course Overview</h3>
          </div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            {courseDescription || 'No overview description available.'}
          </p>
          <h4 style={{ marginBottom: '0.4rem' }}>What you'll learn</h4>
          {(courseOverview.what_you_will_learn || []).length > 0 ? (
            <ul style={{ paddingLeft: '1.1rem', color: 'var(--color-text-muted)' }}>
              {(courseOverview.what_you_will_learn || []).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>No learning outcomes listed.</p>
          )}
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className={styles.approvalsCard}>
            <div className={styles.approvalsHeader}><h3>Course Details</h3></div>
            <p><strong>Duration:</strong> {courseOverview.duration || '—'}</p>
            <p><strong>Level:</strong> {courseOverview.level || '—'}</p>
            <p><strong>Certificate:</strong> {courseOverview.certificate || '—'}</p>
            <p><strong>Language:</strong> {courseOverview.language || '—'}</p>
          </div>
          <div className={styles.approvalsCard}>
            <div className={styles.approvalsHeader}><h3>Instructor</h3></div>
            <p><strong>{courseOverview.instructor_name || 'Not assigned'}</strong></p>
            <p style={{ color: 'var(--color-text-muted)' }}>{courseOverview.instructor_title || ''}</p>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>{courseOverview.instructor_bio || ''}</p>
          </div>
          <div className={styles.approvalsCard}>
            <div className={styles.approvalsHeader}><h3>Prerequisites</h3></div>
            {(courseOverview.prerequisites || []).length > 0 ? (
              <ul style={{ paddingLeft: '1.1rem', color: 'var(--color-text-muted)' }}>
                {(courseOverview.prerequisites || []).map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>No prerequisites listed.</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.approvalsCard} style={{ marginBottom: '1.5rem' }}>
        <div className={styles.approvalsHeader}>
          <h3>
            <FileText size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Learning materials
          </h3>
        </div>
        {materials.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No materials published yet.</p>
        ) : (
          materialWeeks.map(([week, rows]) => (
            <div key={week} style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Week {week}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rows.map((m) => (
                  <div key={m.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <strong>{m.title}</strong>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>
                      {m.material_type}
                    </span>
                    {m.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{m.description}</p>}
                    <CourseMaterialAttachment
                      title={m.title}
                      material_type={m.material_type}
                      file_mime_type={m.file_mime_type}
                      file_url={m.file_url}
                      file_name={m.file_name}
                      external_url={m.external_url}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>
            <ClipboardList size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Assignments
          </h3>
        </div>
        {assignments.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No assignments yet.</p>
        ) : (
          assignmentWeeks.map(([week, rows]) => (
            <div key={week} style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Week {week}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {rows.map((a) => (
                  <div key={a.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <BookOpen size={18} style={{ color: 'var(--theme-primary)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>{a.title}</strong>
                        {a.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{a.description}</p>}
                        {a.due_date && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                            Due: {new Date(a.due_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentCourseLearn;
