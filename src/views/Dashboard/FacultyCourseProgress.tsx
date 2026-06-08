import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface CourseRow {
  id: string;
  title: string;
  faculty_id: string;
}

interface EnrollmentRow {
  id: string;
  student_id: string;
  progress: number | null;
  status: string | null;
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

type StudentItem = {
  studentId: string;
  name: string;
  email: string;
  regNumber: string;
  progress: number;
  status: string;
};

type AssignmentRow = {
  id: string;
  title: string;
  due_date: string | null;
  week_number: number | null;
};

type SubmissionRow = {
  assignment_id: string;
  status?: string | null;
  submitted_at?: string | null;
  grade?: number | null;
  score?: number | null;
};

const FacultyCourseProgress = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading: authLoading } = useAuth();

  const [courseTitle, setCourseTitle] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<Record<string, { assignment: AssignmentRow; submission: SubmissionRow | null }[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !courseId || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: course, error: cErr } = await supabase
          .from('courses')
          .select('id, title, faculty_id')
          .eq('id', courseId)
          .maybeSingle();
        if (cErr) throw cErr;

        const c = (course as CourseRow | null) || null;
        if (!c || c.faculty_id !== user.id) {
          throw new Error('You do not have access to this course.');
        }
        if (!cancelled) setCourseTitle(c.title || 'Course');

        const { data: enrollmentData, error: eErr } = await supabase
          .from('enrollments')
          .select('id, student_id, progress, status')
          .eq('course_id', courseId);
        if (eErr) throw eErr;
        const enrollmentRows = (enrollmentData as EnrollmentRow[]) || [];

        const studentIds = Array.from(new Set(enrollmentRows.map((e) => e.student_id).filter(Boolean)));
        let profilesById = new Map<string, ProfileRow>();
        let studentProfilesById = new Map<string, StudentProfileRow>();

        if (studentIds.length > 0) {
          const [{ data: profileData, error: pErr }, { data: spData, error: spErr }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, email').in('id', studentIds),
            supabase.from('student_profiles').select('id, reg_number, full_name, name, student_name').in('id', studentIds),
          ]);
          if (pErr) throw pErr;
          if (spErr) throw spErr;
          profilesById = new Map(((profileData as ProfileRow[]) || []).map((p) => [p.id, p]));
          studentProfilesById = new Map(((spData as StudentProfileRow[]) || []).map((s) => [s.id, s]));
        }

        const mapped: StudentItem[] = enrollmentRows
          .map((e) => {
            const p = profilesById.get(e.student_id);
            const sp = studentProfilesById.get(e.student_id);
            const studentProfileName =
              sp?.full_name?.trim() ||
              sp?.name?.trim() ||
              sp?.student_name?.trim() ||
              '';
            const fallbackName = p?.email ? p.email.split('@')[0] : `Student ${e.student_id.slice(0, 8)}`;
            return {
              studentId: e.student_id,
              name: studentProfileName || p?.full_name || fallbackName,
              email: p?.email || '—',
              regNumber: sp?.reg_number || 'Not provided',
              progress: Math.round(Number(e.progress || 0)),
              status: e.status || '—',
            };
          })
          .sort((a, b) => b.progress - a.progress);

        if (!cancelled) {
          setStudents(mapped);
          setSelectedStudentId(mapped[0]?.studentId || null);
        }

        const { data: assignmentsData, error: aErr } = await supabase
          .from('assignments')
          .select('id, title, due_date, week_number')
          .eq('course_id', courseId)
          .order('week_number', { ascending: true })
          .order('created_at', { ascending: false });
        if (aErr) throw aErr;
        if (!cancelled) {
          setAssignments((assignmentsData as AssignmentRow[]) || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(sanitizeError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, courseId, user?.id]);

  useEffect(() => {
    if (!courseId || !selectedStudentId) return;
    const key = `${courseId}:${selectedStudentId}`;
    if (assignmentStatus[key]) return;

    let cancelled = false;
    setLoadingAssignments(true);

    (async () => {
      try {
        const assignmentIds = assignments.map((a) => a.id);
        if (assignmentIds.length === 0) {
          if (!cancelled) setAssignmentStatus((prev) => ({ ...prev, [key]: [] }));
          return;
        }

        const { data, error: sErr } = await supabase
          .from('submissions')
          .select('id, assignment_id, status, submitted_at')
          .eq('student_id', selectedStudentId)
          .in('assignment_id', assignmentIds);
        if (sErr) throw sErr;

        const byAssignment = new Map<string, SubmissionRow>();
        ((data as SubmissionRow[]) || []).forEach((s) => byAssignment.set(s.assignment_id, s));

        const merged = assignments.map((assignment) => ({
          assignment,
          submission: byAssignment.get(assignment.id) || null,
        }));

        if (!cancelled) setAssignmentStatus((prev) => ({ ...prev, [key]: merged }));
      } catch (err: unknown) {
        if (!cancelled) setError(sanitizeError(err));
      } finally {
        if (!cancelled) setLoadingAssignments(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentStatus, assignments, courseId, selectedStudentId]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.studentId === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const getStatus = (submission: SubmissionRow | null) => {
    if (!submission) return 'Pending';
    const st = String(submission.status || '').toLowerCase();
    if (st.includes('graded')) return 'Graded';
    if (st) return submission.status || 'Submitted';
    return submission.submitted_at ? 'Submitted' : 'Pending';
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading course progress...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard} style={{ marginBottom: '1rem' }}>
        <Link to="/faculty/progress" style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>← Back to Student Progress</Link>
        <h3 style={{ marginTop: '0.6rem' }}>{courseTitle || 'Course'} - Student Progress</h3>
        {error && <p style={{ color: '#b91c1c', marginTop: '0.6rem' }}>{error}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={styles.approvalsCard}>
          <div className={styles.approvalsHeader}><h3>Students</h3></div>
          {students.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No students enrolled in this course.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {students.map((student) => (
                <button
                  key={student.studentId}
                  type="button"
                  onClick={() => setSelectedStudentId(student.studentId)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem',
                    background: selectedStudentId === student.studentId ? 'var(--theme-primary-light)' : '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{student.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Reg No: {student.regNumber} | {student.email}
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>{student.progress}%</div>
                  <div style={{ height: 7, background: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, student.progress))}%`, height: '100%', background: 'var(--theme-primary)' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.approvalsCard}>
          <div className={styles.approvalsHeader}><h3>Assignment Status</h3></div>
          {!selectedStudent ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Select a student to view assignment status.</p>
          ) : loadingAssignments ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading assignments...</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {selectedStudent.name} (Reg No: {selectedStudent.regNumber})
              </div>
              {(assignmentStatus[`${courseId}:${selectedStudent.studentId}`] || []).length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No assignments available for this course.</p>
              ) : (
                (assignmentStatus[`${courseId}:${selectedStudent.studentId}`] || []).map((row) => (
                  <div key={row.assignment.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <strong>{row.assignment.title}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{getStatus(row.submission)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Week {row.assignment.week_number || 1}
                      {row.assignment.due_date ? ` | Due: ${new Date(row.assignment.due_date).toLocaleString()}` : ''}
                      {row.submission?.submitted_at ? ` | Submitted: ${new Date(row.submission.submitted_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyCourseProgress;
