import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface FacultyProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
}

const AdminFacultyManagement = () => {
  const [rows, setRows] = useState<FacultyProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, status, faculty_profiles(employee_id, department, designation)')
          .eq('role', 'faculty')
          .order('created_at', { ascending: false });
        if (qErr) throw qErr;

    const mapped = ((data as unknown as { id: string; full_name: string; email: string; status: string; faculty_profiles: { employee_id?: string; department?: string; designation?: string }[] }[]) || []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      status: row.status,
      employee_id: row.faculty_profiles?.[0]?.employee_id || null,
      department: row.faculty_profiles?.[0]?.department || null,
      designation: row.faculty_profiles?.[0]?.designation || null,
    })) as FacultyProfileRow[];
        if (!cancelled) setRows(mapped);
      } catch (err: unknown) {
        if (!cancelled) setError(sanitizeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}><h3>Faculty Management</h3></div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading faculty data...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No faculty records found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name || '—'}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.employee_id || '—'}</td>
                    <td>{row.department || '—'}</td>
                    <td>{row.designation || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.status || '—'}</td>
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

export default AdminFacultyManagement;
