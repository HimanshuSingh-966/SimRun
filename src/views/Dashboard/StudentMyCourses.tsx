import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface CourseInfo {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string | null;
}

interface EnrollmentRow {
  id: string;
  status: string | null;
  progress: number | null;
  enrolled_at: string | null;
  courses: CourseInfo[] | null;
}

const StudentMyCourses = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const userId = user?.id;
  const showLoading = authLoading || fetching;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setRows([]);
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
          .from('enrollments')
          .select(
            `
            id,
            status,
            progress,
            enrolled_at,
            courses (
              id,
              title,
              description,
              department,
              status
            )
          `
          )
      .eq('student_id', userId)
      .order('enrolled_at', { ascending: false })
      .limit(200);

        if (qErr) throw qErr;
        if (!cancelled) {
          setRows((data as EnrollmentRow[]) || []);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = sanitizeError(e);
          setError(msg);
          setRows([]);
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

  const unenrollCourse = async (enrollmentId: string) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to drop this course? This action cannot be undone.')) return;
    setUnenrollingId(enrollmentId);
    try {
      const { error: delErr } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId)
        .eq('student_id', userId);
      if (delErr) throw delErr;
      setRows((prev) => prev.filter((r) => r.id !== enrollmentId));
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setUnenrollingId(null);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>My enrolled courses</h3>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>
        )}

        {showLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
            You are not enrolled in any courses yet. Join a course from the dashboard.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rows.map((row) => {
              const c = row.courses?.[0];
              if (!c) return null;
              return (
                <div
                  key={row.id}
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
                        <span style={{ textTransform: 'capitalize' }}>Enrollment: {row.status || '—'}</span>
                        <span>Progress: {Math.round(Number(row.progress ?? 0))}%</span>
                        {c.department && <span>Dept: {c.department}</span>}
                        <span style={{ textTransform: 'capitalize' }}>Course: {c.status || '—'}</span>
                        {row.enrolled_at && (
                          <span>Enrolled: {new Date(row.enrolled_at).toLocaleDateString()}</span>
                        )}
                      </div>
                        <Link
                          to={`/student/courses/${c.id}/learn`}
                          style={{
                            display: 'inline-block',
                            marginTop: '0.75rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--theme-primary)',
                          }}
                        >
                          Open course content →
                        </Link>
                        {row.status === 'active' && (
        <button
          type="button"
          onClick={() => unenrollCourse(row.id)}
          disabled={unenrollingId === row.id}
          aria-label={`Drop course ${row.courses?.[0]?.title || ''}`}
          style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginTop: '0.75rem',
                              marginLeft: '1rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#b91c1c',
                              background: 'none',
                              border: '1px solid #fecaca',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.3rem 0.65rem',
                              cursor: unenrollingId === row.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <LogOut size={14} />
                            {unenrollingId === row.id ? 'Dropping...' : 'Drop Course'}
                          </button>
                        )}
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

export default StudentMyCourses;
