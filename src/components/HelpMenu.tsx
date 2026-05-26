import { useEffect, useRef, useState } from 'react';
import { HelpCircle, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from '../views/Dashboard/Admin.module.css';

export default function HelpMenu({ basePath }: { basePath: '/admin' | '/faculty' | '/student' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className={styles.helpWrap} ref={rootRef}>
      <button className={styles.iconBtn} onClick={() => setOpen((v) => !v)} aria-label="Help">
        <HelpCircle size={20} />
      </button>
      {open && (
        <div className={styles.helpDropdown}>
          <div className={styles.helpHeader}>
            <strong>Help</strong>
          </div>
          <div className={styles.helpList}>
            <Link to={`${basePath}/help`} className={styles.helpItem} onClick={() => setOpen(false)}>
              <LifeBuoy size={16} /> Help center
            </Link>
          </div>
          <p className={styles.helpHint}>
            Tip: Use the left sidebar to navigate modules.
          </p>
        </div>
      )}
    </div>
  );
}

