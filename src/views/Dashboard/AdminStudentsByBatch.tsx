import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

interface StudentProfile {
  reg_number: string | null;
  batch_id: string | null;
  semester: string | null;
}

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  student_profiles: StudentProfile | StudentProfile[] | null;
}

const AdminStudentsByBatch = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [batchLabel, setBatchLabel] = useState('Batch');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (batchId !== 'unassigned') {
          const { data: batchData } = await supabase.from('batches').select('name, year').eq('id', batchId).maybeSingle();
          if (!cancelled && batchData) {
            const b = batchData as { name: string; year: number | null };
            setBatchLabel(`${b.name}${b.year ? ` (${b.year})` : ''}`);
          }
        } else if (!cancelled) {
          setBatchLabel('Unassigned');
        }

        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, status, student_profiles(reg_number, batch_id, semester)')
          .eq('role', 'student')
          .order('created_at', { ascending: false });
        if (qErr) throw qErr;

        const allRows = (data as StudentRow[]) || [];
        const filtered = allRows.filter((row) => {
          const sp = Array.isArray(row.student_profiles) ? row.student_profiles[0] : row.student_profiles;
          const bId = sp?.batch_id || 'unassigned';
          return bId === batchId;
        });
        if (!cancelled) setRows(filtered);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load students.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Students - {batchLabel}</h3>
          <Link to="/admin/students" style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>Back to batches</Link>
        </div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading students...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No students in this batch.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Reg No</th>
                  <th>Semester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const sp = Array.isArray(row.student_profiles) ? row.student_profiles[0] : row.student_profiles;
                  return (
                    <tr key={row.id}>
                      <td>{row.full_name || '—'}</td>
                      <td>{row.email || '—'}</td>
                      <td>{sp?.reg_number || '—'}</td>
                      <td>{sp?.semester || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.status || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudentsByBatch;
