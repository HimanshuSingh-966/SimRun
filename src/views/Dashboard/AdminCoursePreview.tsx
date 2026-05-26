import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';
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
}

interface AssignmentRow {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  due_date: string | null;
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

const AdminCoursePreview = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const materialWeeks = useMemo(() => groupByWeek(materials), [materials]);
  const assignmentWeeks = useMemo(() => groupByWeek(assignments), [assignments]);

  useEffect(() => {
    if (authLoading || profile?.role !== 'admin' || !courseId) {
      if (!authLoading && profile?.role !== 'admin') setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: course, error: cErr } = await supabase.from('courses').select('title').eq('id', courseId).single();
        if (cErr) throw cErr;

        const [{ data: mat }, { data: asg }] = await Promise.all([
          supabase.from('course_materials').select('*').eq('course_id', courseId).order('week_number', { ascending: true }).order('sort_order', { ascending: true }),
          supabase.from('assignments').select('id, week_number, title, description, due_date').eq('course_id', courseId).order('week_number', { ascending: true }).order('created_at', { ascending: false }),
        ]);

        if (!cancelled) {
          setTitle((course as { title: string }).title);
          setMaterials((mat as MaterialRow[]) || []);
          setAssignments((asg as AssignmentRow[]) || []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile?.role, courseId]);

  if (!courseId) return null;

  if (profile?.role !== 'admin') {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: '#b91c1c' }}>Admin only.</p>
        <Link to="/admin/courses">Back</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <button
        type="button"
        onClick={() => navigate('/admin/courses')}
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
        <ArrowLeft size={18} /> Course registry
      </button>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--color-navy)' }}>{title || 'Course'}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Admin preview — materials & assignments</p>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

      <div className={styles.approvalsCard} style={{ marginBottom: '1.5rem' }}>
        <div className={styles.approvalsHeader}>
          <h3>
            <FileText size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Materials
          </h3>
        </div>
        {materials.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>None.</p>
        ) : (
          materialWeeks.map(([week, rows]) => (
            <div key={week} style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Week {week}</h4>
              {rows.map((m) => (
                <div key={m.id} style={{ borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
                  <strong>{m.title}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({m.material_type})</span>
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
          ))
        )}
      </div>

      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>
            <ClipboardList size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Assignments
          </h3>
        </div>
        {assignments.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>None.</p>
        ) : (
          assignmentWeeks.map(([week, rows]) => (
            <div key={week} style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Week {week}</h4>
              {rows.map((a) => (
                <div key={a.id} style={{ borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
                  <strong>{a.title}</strong>
                  {a.due_date && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                      Due {new Date(a.due_date).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCoursePreview;
