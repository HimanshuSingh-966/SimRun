import { useState, useEffect } from 'react';
// FacultyLayout wrapper removed for nested routing
import { BookOpen, Users, CheckCircle, AlertCircle, MapPin, Calendar } from 'lucide-react';
import styles from './Admin.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const FacultyOverview = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any[]>([
    { id: 'm1', label: 'TOTAL COURSES', value: '0', icon: BookOpen },
    { id: 'm2', label: 'TOTAL STUDENTS', value: '0', icon: Users },
    { id: 'm3', label: 'COMPLETION RATE', value: '0%', icon: CheckCircle },
    { id: 'm4', label: 'PENDING TASKS', value: '0', icon: AlertCircle }
  ]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('6m');
  const [enrollmentSeries, setEnrollmentSeries] = useState<{ label: string; value: number }[]>([]);
  /** True only after a load attempt finishes (avoids empty [] matching "all zeros" before fetch). */
  const [enrollmentSeriesLoaded, setEnrollmentSeriesLoaded] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(true);

  useEffect(() => {
    // Empty array triggers real empty states
    setSessions([]);
    setActivities([]);
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;

      try {
        const { data: facultyCourses, error: courseError } = await supabase
          .from('courses')
          .select('id')
          .eq('faculty_id', user.id);

        if (courseError) throw courseError;

        const courseIds = (facultyCourses || []).map((c) => c.id);
        if (courseIds.length === 0) {
          setMetrics([
            { id: 'm1', label: 'TOTAL COURSES', value: '0', icon: BookOpen },
            { id: 'm2', label: 'TOTAL STUDENTS', value: '0', icon: Users },
            { id: 'm3', label: 'COMPLETION RATE', value: '0%', icon: CheckCircle },
            { id: 'm4', label: 'PENDING TASKS', value: '0', icon: AlertCircle },
          ]);
          return;
        }

        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('status, student_id')
          .in('course_id', courseIds);

        if (enrollError) throw enrollError;

        const uniqueStudents = new Set((enrollments || []).map((e) => e.student_id).filter(Boolean)).size;
        const totalEnrollments = (enrollments || []).length;
        const completed = (enrollments || []).filter((e) => e.status === 'completed').length;
        const active = (enrollments || []).filter((e) => e.status === 'active').length;
        const completionRate = totalEnrollments > 0 ? `${Math.round((completed / totalEnrollments) * 100)}%` : '0%';

        setMetrics([
          { id: 'm1', label: 'TOTAL COURSES', value: String(courseIds.length), icon: BookOpen },
          { id: 'm2', label: 'TOTAL STUDENTS', value: String(uniqueStudents), icon: Users },
          { id: 'm3', label: 'COMPLETION RATE', value: completionRate, icon: CheckCircle },
          { id: 'm4', label: 'PENDING TASKS', value: String(active), icon: AlertCircle },
        ]);
      } catch (error) {
        console.error('Failed to load faculty metrics:', error);
      }
    };

    loadMetrics();
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const buildBuckets = (range: string) => {
      const now = new Date();
      if (range === '30d') {
        return Array.from({ length: 4 }).map((_, i) => {
          const start = new Date(now);
          const end = new Date(now);
          start.setDate(now.getDate() - (27 - i * 7));
          end.setDate(now.getDate() - (20 - i * 7));
          return { label: `W${i + 1}`, start, end };
        });
      }
      if (range === '3m') {
        return Array.from({ length: 3 }).map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
          return {
            label: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            start: new Date(d.getFullYear(), d.getMonth(), 1),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
          };
        });
      }
      if (range === '12m') {
        return Array.from({ length: 4 }).map((_, i) => {
          const quarterStartMonth = i * 3;
          const year = now.getFullYear();
          return {
            label: `Q${i + 1}`,
            start: new Date(year, quarterStartMonth, 1),
            end: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59),
          };
        });
      }

      return Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
        };
      });
    };

    const loadEnrollmentSeries = async () => {
      if (!user) {
        setLoadingSeries(false);
        setEnrollmentSeriesLoaded(false);
        setEnrollmentSeries([]);
        return;
      }

      setLoadingSeries(true);
      try {
        const buckets = buildBuckets(timeRange);
        const fromDate = buckets[0].start.toISOString();
        const toDate = buckets[buckets.length - 1].end.toISOString();

        const { data, error } = await supabase
          .from('enrollments')
          .select('enrolled_at, courses!inner(faculty_id)')
          .eq('courses.faculty_id', user.id)
          .gte('enrolled_at', fromDate)
          .lte('enrolled_at', toDate);

        if (error) throw error;

        const counts = buckets.map((bucket) => {
          const value = (data || []).filter((row: any) => {
            const t = new Date(row.enrolled_at).getTime();
            return t >= bucket.start.getTime() && t <= bucket.end.getTime();
          }).length;
          return { label: bucket.label, value };
        });

        if (!cancelled) {
          setEnrollmentSeries(counts);
        }
      } catch (e) {
        console.error('Failed to load enrollment series:', e);
        if (!cancelled) {
          setEnrollmentSeries([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSeries(false);
          setEnrollmentSeriesLoaded(true);
        }
      }
    };

    loadEnrollmentSeries();
    return () => {
      cancelled = true;
    };
  }, [timeRange, user]);

  return (
      <div className={styles.dashboardWrapper}>

        {/* Metrics Row */}
        <section className={styles.metricsRow}>
          {metrics.map(metric => (
            <div key={metric.id} className={styles.metricCard} style={{ background: 'var(--theme-primary-light)', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={styles.metricIconBox}>
                  <metric.icon size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className={styles.metricLabel} style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.04em', fontWeight: 700 }}>{metric.label}</span>
                  <span className={styles.metricValue} style={{ display: 'block', fontSize: '1.75rem', lineHeight: 1 }}>{metric.value}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Main Grid: Chart + Upcoming Sessions */}
        <section className={styles.mainGrid}>
          {/* Chart Card */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>Course Enrollment Overview</h3>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={styles.yearPill}
                style={{ border: 'none', outline: 'none', cursor: 'pointer', background: '#f1f5f9' }}
              >
                <option value="30d">Last 30 Days</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
            <div className={styles.chartMock}>
              {loadingSeries || !enrollmentSeriesLoaded ? (
                <div className={styles.barsContainer} style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Loading enrollment data...</span>
                </div>
              ) : enrollmentSeries.length === 0 || enrollmentSeries.every((x) => x.value === 0) ? (
                <div className={styles.barsContainer} style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>No enrollment data available</span>
                </div>
              ) : (
                <>
                  <div className={styles.barsContainer}>
                    {enrollmentSeries.map((item, idx) => {
                      const max = Math.max(...enrollmentSeries.map((s) => s.value), 1);
                      const height = Math.max(16, Math.round((item.value / max) * 140));
                      return (
                        <div
                          key={item.label}
                          className={`${styles.bar} ${idx === enrollmentSeries.length - 1 ? styles.barHighlight : ''}`}
                          style={{ height: `${height}px` }}
                          title={`${item.label}: ${item.value} enrollments`}
                        />
                      );
                    })}
                  </div>
                  <div className={styles.chartLabels}>
                    {enrollmentSeries.map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className={styles.approvalsCard}>
            <div className={styles.approvalsHeader}>
              <h3>Upcoming Sessions</h3>
              <Calendar size={18} color="var(--theme-primary)" />
            </div>
            <div className={styles.approvalList}>
              {sessions.length > 0 ? sessions.map(session => (
                <div key={session.id} style={{
                  display: 'flex',
                  gap: '0.75rem',
                  paddingLeft: '1rem',
                  borderLeft: session.active ? '3px solid var(--theme-primary)' : '3px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ color: 'var(--theme-primary)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.03em' }}>{session.time}</span>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--color-navy)', margin: '0.25rem 0' }}>{session.title}</h4>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <MapPin size={12} /> {session.location}
                    </p>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
                  No upcoming sessions
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Recent Student Activity + Course Progress */}
        <section className={styles.mainGrid}>
          <div className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <h3>Recent Student Activity</h3>
              <a href="#" style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem' }}>View All</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {activities.length > 0 ? activities.map(act => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className={styles.tableAvatar}></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem' }}>
                      <strong>{act.student}</strong> {act.action} <strong>{act.course}</strong>
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--theme-primary)' }}>{act.time}</span>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: act.badgeColor === '#16a34a' ? '#dcfce7' : '#ffedd5',
                    color: act.badgeColor
                  }}>{act.badge}</span>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No recent student activity
                </div>
              )}
            </div>
          </div>

          {/* Course Progress */}
          <div className={styles.approvalsCard}>
            <h3 style={{ marginBottom: '1.5rem' }}>Course Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                No active courses to track
              </div>
            </div>
          </div>
        </section>
      </div>
  );
};

export default FacultyOverview;
