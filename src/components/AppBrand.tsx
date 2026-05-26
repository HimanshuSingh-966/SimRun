import { HeartPulse } from 'lucide-react';
import styles from '../views/Dashboard/Admin.module.css';

export default function AppBrand({ subtitle }: { subtitle: string }) {
  return (
    <div className={styles.sidebarBrand}>
      <div className={styles.logoSquare} aria-hidden="true">
        <HeartPulse size={18} color="white" />
      </div>
      <div className={styles.logoTextGroup}>
        <span className={styles.logoTitle}>SimRun</span>
        <span className={styles.logoSub}>{subtitle}</span>
      </div>
    </div>
  );
}

