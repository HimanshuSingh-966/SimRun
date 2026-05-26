import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
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
  faculty_id: string | null;
  created_at: string | null;
}

interface ProfileMini {
  id: string;
  full_name: string;
  email: string;
}

const AdminCoursesList = () => {
  const { loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [facultyById, setFacultyById] = useState<Record<string, ProfileMini>>({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showLoading = authLoading || fetching;

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setError(null);
    setFetching(true);

    (async () => {
      try {
        const { data: courseRows, error: cErr } = await supabase
          .from('courses')
          .select('id, title, description, department, status, faculty_id, created_at')
          .order('created_at', { ascending: false });

        if (cErr) throw cErr;
        const list = (courseRows as CourseRow[]) || [];
        if (!cancelled) {
          setCourses(list);
        }

        const ids = [...new Set(list.map((c) => c.faculty_id).filter(Boolean))] as string[];
        if (ids.length > 0) {
          const { data: profs, error: pErr } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids);

          if (pErr) throw pErr;
          if (!cancelled) {
            const map: Record<string, ProfileMini> = {};
            (profs as ProfileMini[] | null)?.forEach((p) => {
              map[p.id] = p;
            });
            setFacultyById(map);
          }
        } else if (!cancelled) {
          setFacultyById({});
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
  }, [authLoading]);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Course registry</h3>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>
        )}

        {showLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Loading courses…</p>
        ) : courses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
            No courses in the system yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {courses.map((c) => {
              const fac = c.faculty_id ? facultyById[c.faculty_id] : undefined;
              return (
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
                        background: 'rgba(22, 163, 74, 0.12)',
                        color: '#16a34a',
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
                        {fac && <span>Faculty: {fac.full_name}</span>}
                        {!fac && c.faculty_id && <span>Faculty ID: {c.faculty_id.slice(0, 8)}…</span>}
                        {c.created_at && <span>Created: {formatDdMmYyyy(c.created_at)}</span>}
                      </div>
                      <Link
                        to={`/admin/courses/${c.id}/view`}
                        style={{
                          display: 'inline-block',
                          marginTop: '0.75rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--theme-primary)',
                        }}
                      >
                        View materials & assignments →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCoursesList;
