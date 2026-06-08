import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  category: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from('notifications')
        .select('id, title, body, category, is_read, link_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (qErr) {
        setError(sanitizeError(qErr));
      } else {
        setRows((data as NotificationRow[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    const prev = [...rows];
    setRows((r) => r.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (error) setRows(prev);
  };

  const markOneRead = async (id: string) => {
    const prev = [...rows];
    setRows((r) => r.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) setRows(prev);
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Notifications</h3>
          <button type="button" onClick={markAllRead} className={styles.downloadBtn} aria-label="Mark all notifications as read">
            Mark all read
          </button>
        </div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading notifications...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No notifications yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rows.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.9rem',
                  background: n.is_read ? '#fff' : '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                  <div>
                    <strong>{n.title}</strong>
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                      {n.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDateTime(n.created_at)}</span>
                </div>
                {n.body && <p style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)' }}>{n.body}</p>}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {!n.is_read && (
                    <button type="button" className={styles.downloadBtn} onClick={() => void markOneRead(n.id)}>
                      Mark read
                    </button>
                  )}
                  {n.link_url && n.link_url.startsWith('/') && (
                    <Link to={n.link_url} style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                      Open →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

