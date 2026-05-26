import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

interface CourseRow {
  id: string;
  title: string;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  week_number: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string | null;
}

interface QuestionCountRow {
  assignment_id: string;
}

type EnrichedAssignment = AssignmentRow & {
  courseTitle: string;
  questionCount: number;
};

const FacultyAssignments = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EnrichedAssignment[]>([]);
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

        const { data: assignments, error: aErr } = await supabase
          .from('assignments')
          .select('id, course_id, week_number, title, description, due_date, created_at')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false });
        if (aErr) throw aErr;

        const assignmentRows = (assignments as AssignmentRow[]) || [];
        const assignmentIds = assignmentRows.map((a) => a.id);

        const questionCountByAssignment = new Map<string, number>();
        if (assignmentIds.length > 0) {
          const { data: qRows, error: qErr } = await supabase
            .from('assignment_questions')
            .select('assignment_id')
            .in('assignment_id', assignmentIds);
          if (qErr) throw qErr;

          ((qRows as QuestionCountRow[]) || []).forEach((q) => {
            const current = questionCountByAssignment.get(q.assignment_id) || 0;
            questionCountByAssignment.set(q.assignment_id, current + 1);
          });
        }

        const courseById = new Map(courseRows.map((c) => [c.id, c.title]));
        const enriched = assignmentRows.map((a) => ({
          ...a,
          courseTitle: courseById.get(a.course_id) || 'Untitled course',
          questionCount: questionCountByAssignment.get(a.id) || 0,
        }));

        if (!cancelled) setRows(enriched);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load assignments.');
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
          <h3>Assignments</h3>
        </div>

        {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading assignments...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No assignments found for your courses.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rows.map((a) => (
              <div
                key={a.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.9rem',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.courseTitle}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Week {a.week_number || 1}
                    </div>
                    <Link
                      to={`/faculty/my-courses/${a.course_id}/content`}
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--theme-primary)', whiteSpace: 'nowrap' }}
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
                {a.description && (
                  <p style={{ marginTop: '0.45rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {a.description}
                  </p>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Questions: {a.questionCount}
                  {a.due_date ? ` | Due: ${new Date(a.due_date).toLocaleString()}` : ' | No due date'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAssignments;
