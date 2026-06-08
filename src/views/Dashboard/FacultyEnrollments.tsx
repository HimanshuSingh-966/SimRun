import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface EnrollmentRow {
  id: string;
  course_id: string;
  student_id: string;
  status: string | null;
  progress: number | null;
  enrolled_at: string | null;
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

type EnrichedEnrollment = EnrollmentRow & {
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  regNumber: string;
};

const FacultyEnrollments = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EnrichedEnrollment[]>([]);
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
          .select('id, course_id, student_id, status, progress, enrolled_at')
          .in('course_id', courseIds)
          .order('enrolled_at', { ascending: false });
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

        const courseById = new Map(courseRows.map((c) => [c.id, c.title]));
        const enriched: EnrichedEnrollment[] = enrollmentRows.map((e) => {
          const p = profilesById.get(e.student_id);
          const sp = studentProfilesById.get(e.student_id);
          const studentProfileName =
            sp?.full_name?.trim() ||
            sp?.name?.trim() ||
            sp?.student_name?.trim() ||
            '';
          const fallbackName = p?.email ? p.email.split('@')[0] : `Student ${e.student_id.slice(0, 8)}`;
          return {
            ...e,
            courseTitle: courseById.get(e.course_id) || 'Untitled course',
            studentName: studentProfileName || p?.full_name || fallbackName,
            studentEmail: p?.email || '—',
            regNumber: sp?.reg_number || 'Not provided',
          };
        });

        if (!cancelled) setRows(enriched);
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

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Student Enrollments</h3>
        </div>

        {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading enrollments...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No enrollment records found for your courses.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{row.studentEmail}</div>
                      </div>
                    </td>
                    <td>{row.regNumber}</td>
                    <td>{row.courseTitle}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.status || '—'}</td>
                    <td>{Math.round(Number(row.progress ?? 0))}%</td>
                    <td>{row.enrolled_at ? new Date(row.enrolled_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyEnrollments;
