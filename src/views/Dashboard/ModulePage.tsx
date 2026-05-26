import styles from './Admin.module.css';

interface ModulePageProps {
  title: string;
  description: string;
}

const ModulePage = ({ title, description }: ModulePageProps) => {
  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>{title}</h3>
        </div>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>{description}</p>
      </div>
    </div>
  );
};

export default ModulePage;
