import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDdMmYyyy } from '../../lib/formatDate';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string | null;
  created_at: string | null;
  /** Rows in course_materials (files, links, etc.); filled after load. */
  material_count: number;
}

const FacultyMyCourses = () => {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const showLoading = authLoading || fetching;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setCourses([]);
      setError(null);
      setFetching(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setFetching(true);

    (async () => {
      try {
        const { data, error: qErr } = await supabase
          .from('courses')
          .select('id, title, description, department, status, created_at')
          .eq('faculty_id', userId)
          .order('created_at', { ascending: false });

        if (qErr) throw qErr;
        const rows = (data as Omit<CourseRow, 'material_count'>[]) || [];
        const counts = new Map<string, number>();
        if (rows.length > 0) {
          const ids = rows.map((r) => r.id);
          const { data: matRows, error: mErr } = await supabase
            .from('course_materials')
            .select('course_id')
            .in('course_id', ids);
          if (mErr) throw mErr;
          for (const row of matRows || []) {
            const cid = (row as { course_id: string }).course_id;
            counts.set(cid, (counts.get(cid) || 0) + 1);
          }
        }
        if (!cancelled) {
          setCourses(
            rows.map((r) => ({
              ...r,
              material_count: counts.get(r.id) ?? 0,
            })),
          );
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load courses.';
          setError(msg);
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>My Courses</h3>
          <Link
            to="/faculty/create-course"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--theme-primary)',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <PlusCircle size={16} /> Create course
          </Link>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>
        )}

        {showLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Loading courses…</p>
        ) : courses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
            No courses yet. Create one to see it listed here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {courses.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--theme-primary-light)',
                      color: 'var(--theme-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--color-navy)' }}>{c.title}</h4>
                    {c.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        {c.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <span style={{ textTransform: 'capitalize' }}>Status: {c.status || '—'}</span>
                      {c.department && <span>Dept: {c.department}</span>}
                      <span>Materials: {c.material_count}</span>
                      {c.created_at && <span>Created: {formatDdMmYyyy(c.created_at)}</span>}
                    </div>
                    <Link
                      to={`/faculty/my-courses/${c.id}/content`}
                      style={{
                        display: 'inline-block',
                        marginTop: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--theme-primary)',
                      }}
                    >
                      Manage materials & assignments →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyMyCourses;
