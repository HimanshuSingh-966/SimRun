import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import { createRateLimiter } from '../../lib/rateLimit';
import styles from './Admin.module.css';

const ticketLimiter = createRateLimiter(5, 10 * 60 * 1000); // 5 per 10 min

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketRow {
  id: string;
  user_id: string;
  user_role: 'student' | 'faculty';
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
}

const HelpPage = () => {
  const { profile, user } = useAuth();
  const role = profile?.role;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isAdmin = role === 'admin';
  const canSubmit = role === 'student' || role === 'faculty';

  const statusCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    tickets.forEach((t) => {
      counts[t.status] += 1;
    });
    return counts;
  }, [tickets]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoadingTickets(true);
      setErr(null);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, user_id, user_role, subject, message, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) setErr(sanitizeError(error));
      setTickets((data as TicketRow[]) || []);
      setLoadingTickets(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!user?.id || !profile?.role) return;
    if (!(profile.role === 'student' || profile.role === 'faculty')) return;
    if (!subject.trim() || !message.trim()) return;

    if (!ticketLimiter.check()) {
      setErr('You have submitted too many tickets. Please wait before submitting another.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        user_role: profile.role,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      setSubject('');
      setMessage('');
      setMsg('Issue submitted. Admin will review it.');
    } catch (e: unknown) {
      setErr(sanitizeError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const setTicketStatus = async (id: string, status: TicketStatus) => {
    setErr(null);
    setMsg(null);
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    if (error) {
      setErr(sanitizeError(error));
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setMsg('Ticket updated.');
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Help Center</h3>
        </div>

        {msg && <p style={{ color: '#166534', marginBottom: '0.75rem' }}>{msg}</p>}
        {err && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{err}</p>}

        {canSubmit && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <h4 style={{ color: 'var(--color-navy)', marginBottom: '0.75rem' }}>Report an issue</h4>
            <form onSubmit={submitTicket} style={{ display: 'grid', gap: '0.75rem', maxWidth: 720 }}>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Unable to open course material)"
                style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                required
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe the issue and what you were trying to do..."
                style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                required
              />
              <button type="submit" className={styles.submitBtn} style={{ justifySelf: 'start' }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit to Admin'}
              </button>
            </form>
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--color-navy)', margin: 0 }}>Incoming issues</h4>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                <span>Open: {statusCounts.open}</span>
                <span>In progress: {statusCounts.in_progress}</span>
                <span>Resolved: {statusCounts.resolved}</span>
                <span>Closed: {statusCounts.closed}</span>
              </div>
            </div>

            {loadingTickets ? (
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>No tickets yet.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                <table className={styles.activityTable}>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Subject</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td style={{ textTransform: 'capitalize' }}>{t.user_role}</td>
                        <td>{t.subject}</td>
                        <td style={{ maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.message}</td>
                        <td style={{ textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</td>
                        <td>{new Date(t.created_at).toLocaleString()}</td>
                        <td>
                          <select
                            value={t.status}
                            onChange={(e) => void setTicketStatus(t.id, e.target.value as TicketStatus)}
                            style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpPage;

