import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from '../views/Dashboard/Admin.module.css';

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

const formatWhen = (value: string) => {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

export default function NotificationBell({ basePath }: { basePath: '/student' | '/faculty' | '/admin' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const unread = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

  useEffect(() => {
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, link_url, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!cancelled) setRows((data as NotificationRow[]) || []);
    })();

    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void (async () => {
            const { data } = await supabase
              .from('notifications')
              .select('id, title, body, link_url, is_read, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(8);
            if (!cancelled) setRows((data as NotificationRow[]) || []);
          })();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const markAllRead = async () => {
    if (!user?.id || unread === 0) return;
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
    <div className={styles.notificationWrap} ref={rootRef}>
      <button className={styles.iconBtn} onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className={styles.notificationBadge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={styles.notificationDropdown}>
          <div className={styles.notificationHeader}>
            <strong>Notifications</strong>
            <button type="button" onClick={markAllRead} className={styles.notificationTextBtn}>
              Mark all read
            </button>
          </div>
          <div className={styles.notificationList}>
            {rows.length === 0 ? (
              <p className={styles.notificationEmpty}>No notifications</p>
            ) : (
              rows.map((n) => (
                <Link
                  key={n.id}
                  to={(n.link_url && n.link_url.startsWith('/')) ? n.link_url : `${basePath}/notifications`}
                  className={styles.notificationItem}
                  onClick={() => {
                    if (!n.is_read) void markOneRead(n.id);
                    setOpen(false);
                  }}
                >
                  <div className={styles.notificationItemTop}>
                    <span className={styles.notificationItemTitle}>{n.title}</span>
                    {!n.is_read && <span className={styles.notificationDot} />}
                  </div>
                  {n.body && <p className={styles.notificationItemBody}>{n.body}</p>}
                  <span className={styles.notificationWhen}>{formatWhen(n.created_at)}</span>
                </Link>
              ))
            )}
          </div>
          <Link to={`${basePath}/notifications`} className={styles.notificationFooterLink} onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

