import { useEffect, useState } from 'react';
import { Check, Clock, Stethoscope, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

interface PendingProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
}

const AdminApprovals = () => {
  const [rows, setRows] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (qErr) throw qErr;
      setRows((data as PendingProfile[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoadingId(id);
    setError(null);
    try {
      const { error: uErr } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (uErr) throw uErr;
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to mark as ${status}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>
            <Clock size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Pending Approvals
          </h3>
        </div>

        {error && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading pending requests...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No pending approvals.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {rows.map((row) => (
              <div
                key={row.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  {row.role === 'faculty' ? <Stethoscope size={16} /> : <Users size={16} />}
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.full_name || 'Unnamed user'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {row.email || '—'} | {row.role || '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => updateStatus(row.id, 'approved')}
                    disabled={actionLoadingId === row.id}
                    style={{ color: '#16a34a' }}
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(row.id, 'rejected')}
                    disabled={actionLoadingId === row.id}
                    style={{ color: '#dc2626' }}
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApprovals;
