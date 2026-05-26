import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

interface BatchRow {
  id: string;
  name: string;
  year: number | null;
}

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  student_profiles:
    | {
        reg_number: string | null;
        batch_id: string | null;
        semester: string | null;
      }
    | {
        reg_number: string | null;
        batch_id: string | null;
        semester: string | null;
      }[]
    | null;
}

interface StudentProfileDetails {
  reg_number: string | null;
  batch_id: string | null;
  semester: string | null;
}

const AdminStudentManagement = () => {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: batchData, error: bErr }, { data: studentData, error: sErr }] = await Promise.all([
          supabase.from('batches').select('id, name, year').order('name'),
          supabase
            .from('profiles')
            .select('id, full_name, email, status, student_profiles(reg_number, batch_id, semester)')
            .eq('role', 'student')
            .order('created_at', { ascending: false }),
        ]);
        if (bErr) throw bErr;
        if (sErr) throw sErr;
        if (!cancelled) {
          setBatches((batchData as BatchRow[]) || []);
          setRows((studentData as StudentRow[]) || []);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load students.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsByBatch = useMemo(() => {
    const byBatch: Record<string, StudentRow[]> = {};
    rows.forEach((row) => {
      const sp = Array.isArray(row.student_profiles)
        ? (row.student_profiles[0] as StudentProfileDetails | undefined)
        : (row.student_profiles as StudentProfileDetails | null);
      const key = sp?.batch_id || 'unassigned';
      if (!byBatch[key]) byBatch[key] = [];
      byBatch[key].push(row);
    });
    return byBatch;
  }, [rows]);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}><h3>Student Management (Batch-wise)</h3></div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading students...</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[...batches, { id: 'unassigned', name: 'Unassigned', year: null }].map((batch) => {
              const list = rowsByBatch[batch.id] || [];
              return (
                <Link
                  key={batch.id}
                  to={`/admin/students/${batch.id}`}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'block',
                    background: '#fff',
                  }}
                >
                  <h4 style={{ marginBottom: '0.4rem' }}>
                    {batch.name}
                    {batch.year ? ` (${batch.year})` : ''}
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      - {list.length} students
                    </span>
                  </h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Open batch details →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudentManagement;
