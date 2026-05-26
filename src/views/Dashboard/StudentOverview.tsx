import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Star, Clock, Calendar } from 'lucide-react';
import styles from './Admin.module.css';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface StudentMetric {
  id: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
}

const StudentOverview = () => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<StudentMetric[]>([
    { id: 'm1', label: 'ACTIVE COURSES', value: '0', icon: BookOpen },
    { id: 'm2', label: 'COMPLETED', value: '0', icon: CheckCircle },
    { id: 'm3', label: 'ACADEMY POINTS', value: '0', icon: Star },
    { id: 'm4', label: 'DEADLINES', value: '0', icon: Clock },
  ]);
  const [loading, setLoading] = useState(true);
  const [overviewMessage, setOverviewMessage] = useState('No enrolled courses yet. Start by exploring available courses.');
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);

  useEffect(() => {
    const loadStudentData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [{ count: activeCourses }, { count: completedCourses }, { data: enrollments }, { data: studentProfile }] = await Promise.all([
          supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('status', 'active'),
          supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('status', 'completed'),
          supabase.from('enrollments').select('progress, course_id').eq('student_id', user.id),
          supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle(),
        ]);

        const points = Math.round((enrollments || []).reduce((sum, item) => sum + Number(item.progress || 0), 0));
        setMetrics([
          { id: 'm1', label: 'ACTIVE COURSES', value: String(activeCourses || 0), icon: BookOpen },
          { id: 'm2', label: 'COMPLETED', value: String(completedCourses || 0), icon: CheckCircle },
          { id: 'm3', label: 'ACADEMY POINTS', value: String(points), icon: Star },
          { id: 'm4', label: 'DEADLINES', value: '0', icon: Clock },
        ]);

        if ((activeCourses || 0) > 0) {
          setOverviewMessage('You are actively progressing in your enrolled courses. Keep up your momentum.');
        }

        const batchId = studentProfile?.batch_id;
        if (batchId) {
          const { data: batchCourses } = await supabase
            .from('course_batches')
            .select('course_id, courses(id, title, description, department, status)')
            .eq('batch_id', batchId);

          const enrolledSet = new Set((enrollments || []).map((row: any) => row.course_id).filter(Boolean));
          const filtered = (batchCourses || [])
            .map((row: any) => row.courses)
            .filter((course: any) => course && course.status === 'active' && !enrolledSet.has(course.id));

          setAvailableCourses(filtered);
          setNotifications(filtered.map((course: Course) => `${course.id}::New course available to join: ${course.title}`));
        } else {
          setAvailableCourses([]);
          setNotifications(['No batch is assigned to your profile yet. Contact admin to assign your batch.']);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [user]);

  const joinCourse = async (courseId: string) => {
    if (!user) return;
    setJoiningCourseId(courseId);
    try {
      const { error } = await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id: courseId,
        status: 'active',
        progress: 0,
      });
      if (error) throw error;
      setAvailableCourses((prev) => prev.filter((course) => course.id !== courseId));
      setNotifications((prev) => prev.filter((n) => !n.startsWith(`${courseId}::`)));
      setOverviewMessage('Course joined successfully. It is now available in your enrolled courses.');
    } catch (err) {
      console.error('Failed to join course:', err);
    } finally {
      setJoiningCourseId(null);
    }
  };

  return (
      <div className={styles.dashboardWrapper}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem'}}>
          <div className={styles.welcomeSection} style={{marginBottom: 0}}>
            <span style={{color: 'var(--theme-primary)', fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block'}}>STUDENT WORKSPACE</span>
            <h2>Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}.</h2>
            <p>{overviewMessage}</p>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {availableCourses.length} course(s) available to join
          </div>
        </div>

        <section className={styles.metricsRow}>
          {metrics.map(metric => (
            <div key={metric.id} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <div className={styles.metricIconBox}>
                  <metric.icon size={18} />
                </div>
              </div>
              <div className={styles.metricBottom}>
                <span className={styles.metricValue}>{metric.value}</span>
                <span className={styles.metricLabel}>{metric.label}</span>
                {loading && (
                  <div style={{marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: '600'}}>
                    Updating...
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.chartCard} style={{ background: 'transparent', boxShadow: 'none', padding: '1rem 1rem 0.5rem' }}>
            <div className={styles.approvalsHeader} style={{marginBottom: '1rem'}}>
              <h3 style={{fontSize: '1.25rem', color: 'var(--color-navy)'}}>Join Course</h3>
              <Link to="/student/courses" style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                View all courses
              </Link>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              {availableCourses.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  {loading ? 'Loading course data...' : 'No batch-targeted courses are available to join right now.'}
                </div>
              ) : (
                availableCourses.map((course) => (
                  <div key={course.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '0.25rem' }}>{course.title}</h4>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>{course.description || 'No description provided.'}</p>
                    <button
                      className={styles.submitBtn}
                      style={{ margin: 0 }}
                      onClick={() => joinCourse(course.id)}
                      disabled={joiningCourseId === course.id}
                    >
                      {joiningCourseId === course.id ? 'Joining...' : 'Join Course'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.approvalsCard} style={{background: '#F8FAFC', boxShadow: 'none'}}>
            <div className={styles.approvalsHeader} style={{marginBottom: '2rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                 <Calendar size={20} color="var(--color-navy)" />
                 <h3 style={{fontSize: '1.25rem'}}>Notifications</h3>
              </div>
            </div>
            
            <div className={styles.approvalList}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((item) => (
                  <div key={item} style={{ padding: '0.75rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    {item.split('::')[1] || item}
                  </div>
                ))
              )}
            </div>

      <Link to="/student/notifications" style={{width: '100%', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--theme-primary)', fontWeight: '600', fontSize: '0.875rem', padding: '0.75rem', marginTop: '2rem', display: 'block', textAlign: 'center', textDecoration: 'none'}}>
        View All Notifications
      </Link>
          </div>
        </section>
      </div>
  );
};

export default StudentOverview;
