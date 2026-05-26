import { Link } from 'react-router-dom';
import { Stethoscope, Activity, FileCheck, MonitorSmartphone } from 'lucide-react';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Stethoscope size={20} color="white" />
          </div>
          <span className={styles.logoText}>SimRun</span>
        </div>
        <div className={styles.navActions}>
          <Link to="/register" className={styles.registerBtn}>Register</Link>
          <Link to="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </nav>

      <main className={styles.mainContent}>
        <section className={styles.heroSection}>
          <div className={styles.heroText}>
            <span className={styles.badge}>FUTURE-READY EDUCATION</span>
            <h1 className={styles.heroTitle}>Nursing Simulation<br />Learning Platform</h1>
            <p className={styles.heroSubtitle}>
              Master clinical skills through immersive digital simulations. 
              Bridge the gap between classroom theory and bedside practice 
              with AI-driven patient interactions.
            </p>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSub}>PLATFORM CORE FEATURES</span>
            <h2>Empowering the Next Generation of<br/>Nurses with Advanced Technology</h2>
          </div>
          
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap}>
                <MonitorSmartphone size={24} color="var(--color-primary-dark)" />
              </div>
              <h3>Clinical Simulation</h3>
              <p>Engage in hyper-realistic patient scenarios. Our platform uses branch-logic to provide unique outcomes based on your clinical decisions.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap}>
                <Activity size={24} color="var(--color-primary-dark)" />
              </div>
              <h3>Progress Tracking</h3>
              <p>Gain deep insights with real-time analytics. Monitor skill mastery, speed of intervention, and diagnostic accuracy through detailed dashboards.</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap}>
                <FileCheck size={24} color="var(--color-primary-dark)" />
              </div>
              <h3>Professional Certifications</h3>
              <p>Earn industry-recognized badges and certificates that validate your expertise in specialized areas like Critical Care or Pediatric Nursing.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link to="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
          <Link to="/login" className={styles.footerLink}>Login</Link>
          <Link to="/register" className={styles.footerLink}>Register</Link>
        </div>
        <p className={styles.footerCopy}>
          &copy; {new Date().getFullYear()} SimRun. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
