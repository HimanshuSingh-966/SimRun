import { Link } from 'react-router-dom';
import { User, Stethoscope } from 'lucide-react';
import styles from './AuthForms.module.css';

const RoleSelection = () => {
  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <h1>Join SimRun</h1>
        <p>I would like to register as a...</p>
      </div>

      <div className={styles.formContainer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
        <Link to="/register/student" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'all 0.2s', background: 'white' }} 
               onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
               onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <User size={32} />
            </div>
            <h3 style={{ color: 'var(--color-navy)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nursing Student</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Access simulations and track your progress</p>
          </div>
        </Link>
        
        <Link to="/register/faculty" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'all 0.2s', background: 'white' }}
               onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-secondary)'}
               onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Stethoscope size={32} />
            </div>
            <h3 style={{ color: 'var(--color-navy)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Faculty Member</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Manage curriculum and assess students</p>
          </div>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Login here</Link>
      </div>
    </div>
  );
};

export default RoleSelection;
