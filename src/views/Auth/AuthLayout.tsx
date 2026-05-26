import { Outlet, Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import styles from './AuthLayout.module.css';

const AuthLayout = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Stethoscope size={20} color="white" />
          </div>
          <span className={styles.logoText}>SimRun</span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.alreadyAccount}>Already have an account?</span>
          <Link to="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
