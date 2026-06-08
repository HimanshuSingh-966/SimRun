import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface EnrollmentRow {
  id: string;
  course_id: string;
  student_id: string;
  progress: number | null;
  status: string | null;
}

interface CourseRow {
  id: string;
  title: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface StudentProfileRow {
  id: string;
  reg_number: string | null;
  full_name?: string | null;
  name?: string | null;
  student_name?: string | null;
}

type CourseStudentProgress = {
  studentId: string;
  name: string;
  email: string;
  regNumber: string;
  progress: number;
  status: string;
};

type CourseProgressGroup = {
  courseId: string;
  courseTitle: string;
  averageProgress: number;
  students: CourseStudentProgress[];
};

const FacultyProgress = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<CourseProgressGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: courses, error: cErr } = await supabase
          .from('courses')
          .select('id, title')
          .eq('faculty_id', user.id);
        if (cErr) throw cErr;

        const courseRows = (courses as CourseRow[]) || [];
        const courseIds = courseRows.map((c) => c.id);
        if (courseIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const { data: enrollments, error: eErr } = await supabase
          .from('enrollments')
          .select('id, course_id, student_id, progress, status')
          .in('course_id', courseIds);
        if (eErr) throw eErr;

        const enrollmentRows = (enrollments as EnrollmentRow[]) || [];
        const studentIds = Array.from(new Set(enrollmentRows.map((e) => e.student_id).filter(Boolean)));

        let profilesById = new Map<string, ProfileRow>();
        let studentProfilesById = new Map<string, StudentProfileRow>();
        if (studentIds.length > 0) {
          const [{ data: profiles, error: pErr }, { data: sProfiles, error: spErr }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, email').in('id', studentIds),
            supabase.from('student_profiles').select('id, reg_number, full_name, name, student_name').in('id', studentIds),
          ]);
          if (pErr) throw pErr;
          if (spErr) throw spErr;
          profilesById = new Map(((profiles as ProfileRow[]) || []).map((p) => [p.id, p]));
          studentProfilesById = new Map(((sProfiles as StudentProfileRow[]) || []).map((s) => [s.id, s]));
        }

        const grouped = new Map<string, EnrollmentRow[]>();
        enrollmentRows.forEach((row) => {
          const prev = grouped.get(row.course_id) || [];
          prev.push(row);
          grouped.set(row.course_id, prev);
        });

        const courseById = new Map(courseRows.map((c) => [c.id, c.title]));
        const courseProgress: CourseProgressGroup[] = Array.from(grouped.entries()).map(([courseId, list]) => {
          const sumProgress = list.reduce((acc, item) => acc + Number(item.progress || 0), 0);
          const averageProgress = list.length ? Math.round(sumProgress / list.length) : 0;
          const students: CourseStudentProgress[] = list
            .map((item) => {
              const p = profilesById.get(item.student_id);
              const sp = studentProfilesById.get(item.student_id);
              const studentProfileName =
                sp?.full_name?.trim() ||
                sp?.name?.trim() ||
                sp?.student_name?.trim() ||
                '';
              const fallbackName = p?.email ? p.email.split('@')[0] : `Student ${item.student_id.slice(0, 8)}`;
              return {
                studentId: item.student_id,
                name: studentProfileName || p?.full_name || fallbackName,
                email: p?.email || '—',
                regNumber: sp?.reg_number || 'Not provided',
                progress: Math.round(Number(item.progress || 0)),
                status: item.status || '—',
              };
            })
            .sort((a, b) => b.progress - a.progress);

          return {
            courseId,
            courseTitle: courseById.get(courseId) || 'Untitled course',
            averageProgress,
            students,
          };
        });

        courseProgress.sort((a, b) => b.averageProgress - a.averageProgress);
        if (!cancelled) setRows(courseProgress);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(sanitizeError(err));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const totalStudents = useMemo(
    () => rows.reduce((acc, course) => acc + course.students.length, 0),
    [rows]
  );
  const overallAvg = useMemo(() => {
    if (totalStudents === 0) return 0;
    const totalProgress = rows.reduce(
      (acc, course) => acc + course.students.reduce((sAcc, s) => sAcc + s.progress, 0),
      0
    );
    return Math.round(totalProgress / totalStudents);
  }, [rows, totalStudents]);

  const metricCards = [
    {
      id: 'tracked',
      label: 'Courses tracked',
      value: String(rows.length),
      icon: Users,
    },
    {
      id: 'avg',
      label: 'Average progress',
      value: `${overallAvg}%`,
      icon: TrendingUp,
    },
    {
      id: 'risk',
      label: 'At risk (<40%)',
      value: String(rows.reduce((acc, course) => acc + course.students.filter((s) => s.progress < 40).length, 0)),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className={styles.dashboardWrapper}>
      <section
        className={styles.metricsRow}
        style={{ gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))' }}
      >
        {metricCards.map((card) => (
          <div
            key={card.id}
            className={styles.metricCard}
            style={{
              border: '1px solid var(--color-border)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.03em' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)', lineHeight: 1.1, marginTop: '0.3rem' }}>
                  {card.value}
                </div>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--theme-primary-light)',
                  color: 'var(--theme-primary)',
                  flexShrink: 0,
                }}
              >
                <card.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Student Progress</h3>
        </div>

        {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading progress...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No student progress available yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rows.map((course) => (
              <div
                key={course.courseId}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.9rem',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{course.courseTitle}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Students: {course.students.length}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Course average: {course.averageProgress}%
                  </div>
                </div>
                <Link
                  to={`/faculty/progress/${course.courseId}`}
                  style={{
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    color: 'var(--theme-primary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  Open course progress →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyProgress;
