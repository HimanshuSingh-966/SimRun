import { useState, useEffect } from 'react';
import { Book, Stethoscope, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Admin.module.css';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface MetricRow {
  id: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface ActivityRow {
  id: string;
  student: string;
  email: string;
  course: string;
  enrolledAt: string | null;
  performance: number;
  status: string;
}

const AdminOverview = () => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [{ count: studentCount }, { count: facultyCount }, { count: courseCount }, { count: activeEnrollments }] =
          await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty'),
            supabase.from('courses').select('*', { count: 'exact', head: true }),
            supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          ]);

        setMetrics([
          { id: 'm1', label: 'Total Students', value: String(studentCount || 0), icon: Users },
          { id: 'm2', label: 'Total Faculty', value: String(facultyCount || 0), icon: Stethoscope },
          { id: 'm3', label: 'Total Courses', value: String(courseCount || 0), icon: Book },
          { id: 'm4', label: 'Active Enrollments', value: String(activeEnrollments || 0), icon: UserCheck },
        ]);

        // Recent activity from enrollments + course/profile lookups
        const { data: enrollmentRows, error: enrollErr } = await supabase
          .from('enrollments')
          .select('id, student_id, course_id, enrolled_at, progress, status')
          .order('enrolled_at', { ascending: false })
          .limit(5);
        if (enrollErr) throw enrollErr;

      const studentIds = [...new Set(((enrollmentRows as { student_id: string }[]) || []).map((r) => r.student_id).filter(Boolean))];
      const courseIds = [...new Set(((enrollmentRows as { course_id: string }[]) || []).map((r) => r.course_id).filter(Boolean))];

      const [{ data: students }, { data: courses }] = await Promise.all([
        studentIds.length
        ? supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
        courseIds.length
        ? supabase.from('courses').select('id, title').in('id', courseIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);

      const studentById = new Map(((students as { id: string; full_name: string | null; email: string | null }[]) || []).map((s) => [s.id, s]));
      const courseById = new Map(((courses as { id: string; title: string }[]) || []).map((c) => [c.id, c]));
      const activityRows: ActivityRow[] = ((enrollmentRows as { id: string; student_id: string; course_id: string; enrolled_at: string | null; progress: number; status: string }[]) || []).map((row) => {
          const s = studentById.get(row.student_id);
          const c = courseById.get(row.course_id);
          const fallbackName = s?.email ? String(s.email).split('@')[0] : `Student ${String(row.student_id).slice(0, 8)}`;
          return {
            id: row.id,
            student: s?.full_name || fallbackName,
            email: s?.email || '—',
            course: c?.title || 'Untitled course',
            enrolledAt: row.enrolled_at || null,
            performance: Math.round(Number(row.progress || 0)),
            status: row.status ? String(row.status).toUpperCase() : 'PENDING',
          };
        });
        setActivities(activityRows);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error loading admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
      <div className={styles.dashboardWrapper}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Loading Dashboard...</p>
          </div>
        )}
        <div className={styles.welcomeSection}>
          <h2>Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Admin'}.</h2>
          <p>Here's a snapshot of simulation activity across all departments.</p>
        </div>

        <section className={styles.metricsRow}>
          {metrics.map(metric => (
            <div key={metric.id} className={styles.metricCard} style={{ minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className={styles.metricTop}>
                <div className={styles.metricIconBox}>
                  <metric.icon size={18} />
                </div>
                <span className={styles.staticPill}>Live</span>
              </div>
              <div className={styles.metricBottom}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>{metric.value}</span>
              </div>
            </div>
          ))}
        </section>

        <section className={styles.singleColumnSection}>
          <div className={styles.approvalsCard}>
            <div className={styles.approvalsHeader}>
              <h3>Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
              <Link to="/admin/approvals" className={styles.quickActionBtn}>Open Pending Approvals</Link>
              <Link to="/admin/faculty" className={styles.quickActionBtn}>Manage Faculty</Link>
              <Link to="/admin/students" className={styles.quickActionBtn}>Manage Students</Link>
              <Link to="/admin/courses" className={styles.quickActionBtn}>View Courses</Link>
            </div>
          </div>
        </section>

        <section className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <h3>Recent Student Activity</h3>
            <button className={styles.downloadBtn}>Download Report</button>
          </div>
          
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>COURSE</th>
                  <th>ENROLLED</th>
                  <th>PERFORMANCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activities.length > 0 ? activities.map(act => (
                  <tr key={act.id}>
                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.tableAvatar}></div>
                        <div className={styles.studentDetails}>
                          <span className={styles.studentName}>{act.student}</span>
                          <span className={styles.studentEmail}>{act.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{act.course}</td>
                    <td>{act.enrolledAt ? new Date(act.enrolledAt).toLocaleString() : '—'}</td>
                    <td>
                      <div className={styles.performanceWrap}>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{width: `${act.performance}%`}}></div>
                        </div>
                        <span>{act.performance}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${act.status === 'ACTIVE' ? styles.statusActive : styles.statusPending}`}>
                        {act.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No recent enrollment activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
};

export default AdminOverview;
