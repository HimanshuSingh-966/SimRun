import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Shield,
  Database,
  Eye,
  Share2,
  Lock,
  Baby,
  RefreshCw,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  Circle,
} from 'lucide-react';
import styles from './PrivacyPolicy.module.css';

const sections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'information-collected', label: 'Information We Collect' },
  { id: 'how-we-use', label: 'How We Use Your Data' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'data-security', label: 'Data Security' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'changes', label: 'Policy Changes' },
  { id: 'contact', label: 'Contact Us' },
];

const PrivacyPolicy = () => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.container}>
      {/* ─── Navbar ─── */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Stethoscope size={20} color="white" />
          </div>
          <span className={styles.logoText}>SimRun</span>
        </Link>
        <div className={styles.navActions}>
          <Link to="/register" className={styles.registerBtn}>Register</Link>
          <Link to="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </nav>

      {/* ─── Hero Banner ─── */}
      <section className={styles.heroBanner}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>
            <Shield size={14} />
            LEGAL &amp; COMPLIANCE
          </span>
          <h1 className={styles.heroTitle}>Privacy Policy</h1>
          <p className={styles.heroSubtitle}>
            Your privacy matters to us. This policy explains how SimRun collects, uses,
            and protects your personal information when you use our nursing simulation
            learning platform.
          </p>
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className={styles.contentArea}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>On This Page</p>
          <nav className={styles.sidebarNav}>
            {sections.map((s) => (
              <a
                key={s.id}
                className={styles.sidebarLink}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(s.id);
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className={styles.mainContent}>
          <div className={styles.lastUpdated}>
            <Clock size={14} />
            Last updated: May 18, 2026
          </div>

          {/* 1 — Introduction */}
          <section id="introduction" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Shield size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>1. Introduction</h2>
            <div className={styles.sectionText}>
              <p>
                Welcome to <strong>SimRun</strong> ("we", "our", or "us"). We are committed
                to protecting your personal information and your right to privacy. This Privacy
                Policy describes what information we collect, how we use it, and what rights
                you have in relation to it.
              </p>
              <p>
                By accessing or using our nursing simulation learning platform, you agree to the
                collection and use of information in accordance with this policy. If you do not
                agree with our policies and practices, please do not use our services.
              </p>
            </div>
          </section>

          {/* 2 — Information We Collect */}
          <section id="information-collected" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Database size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
            <div className={styles.sectionText}>
              <p>
                We collect information that you provide directly to us, as well as information
                that is automatically gathered when you use our platform.
              </p>
              <p><strong>Personal Information you provide:</strong></p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Account Data</strong> — Full name, email address, role (student, faculty, or admin), and institutional affiliation.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Profile Data</strong> — Profile picture, bio, academic credentials, and batch/department information.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Learning Data</strong> — Course enrollments, assignment submissions, simulation results, quiz scores, and progress tracking data.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Communication Data</strong> — Messages, feedback, and support inquiries you send through the platform.</span>
                </li>
              </ul>

              <p><strong>Automatically collected information:</strong></p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Device &amp; Browser Data</strong> — IP address, browser type, operating system, and device identifiers.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Usage Data</strong> — Pages visited, features used, session duration, and interaction patterns.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Cookies &amp; Tracking</strong> — We use essential cookies for authentication and session management.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 3 — How We Use Your Data */}
          <section id="how-we-use" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Eye size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
            <div className={styles.sectionText}>
              <p>We use the information we collect to:</p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Provide, operate, and maintain the SimRun learning platform and all associated services.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Authenticate users and manage role-based access control (student, faculty, admin).</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Track academic progress, generate performance analytics, and issue certificates.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Enable faculty to create, manage, and grade courses and assignments.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Send notifications related to courses, approvals, and platform updates.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Improve and optimize the platform based on usage patterns and feedback.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Comply with legal obligations and enforce our terms of service.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4 — Data Sharing */}
          <section id="data-sharing" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Share2 size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>4. Data Sharing &amp; Disclosure</h2>
            <div className={styles.sectionText}>
              <p>
                We do <strong>not</strong> sell your personal data to third parties. We may share
                your information only in the following circumstances:
              </p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Institutional Access</strong> — Faculty and administrators within your institution may access your academic records and progress data as required for educational purposes.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Service Providers</strong> — We work with trusted third-party services (e.g., Supabase for authentication and database hosting) that process data on our behalf under strict confidentiality agreements.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Legal Requirements</strong> — We may disclose information if required by law, court order, or governmental regulation.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><Circle size={8} color="var(--color-primary)" /></span>
                  <span><strong>Protection of Rights</strong> — We may share data to protect the rights, safety, or property of SimRun, our users, or the public.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 5 — Data Security */}
          <section id="data-security" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Lock size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>5. Data Security</h2>
            <div className={styles.sectionText}>
              <p>
                We implement industry-standard security measures to protect your information,
                including:
              </p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>End-to-end encryption for data in transit using TLS/SSL protocols.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Encrypted storage of passwords using secure hashing algorithms (bcrypt).</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Role-based access controls ensuring users can only access data relevant to their role.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Regular security audits and vulnerability assessments of our infrastructure.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Secure session management with automatic token expiration and refresh mechanisms.</span>
                </li>
              </ul>
              <p>
                While we strive to use commercially acceptable means to protect your personal
                data, no method of transmission or storage is 100% secure. We cannot guarantee
                absolute security.
              </p>
            </div>
          </section>

          {/* 6 — Your Rights */}
          <section id="your-rights" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Eye size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>6. Your Rights</h2>
            <div className={styles.sectionText}>
              <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span><strong>Access</strong> — Request a copy of the personal data we hold about you.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span><strong>Rectification</strong> — Request correction of any inaccurate or incomplete data.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span><strong>Erasure</strong> — Request deletion of your personal data, subject to legal retention requirements.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span><strong>Data Portability</strong> — Request your data in a structured, machine-readable format.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span><strong>Withdraw Consent</strong> — Withdraw consent for data processing at any time.</span>
                </li>
              </ul>
              <p>
                To exercise any of these rights, please contact us using the information provided
                in the Contact section below. We will respond to your request within 30 days.
              </p>
            </div>
          </section>

          {/* 7 — Children's Privacy */}
          <section id="children" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Baby size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>7. Children&apos;s Privacy</h2>
            <div className={styles.sectionText}>
              <p>
                SimRun is designed for nursing students, faculty, and administrators in
                higher education institutions. Our platform is not intended for children under
                the age of 16.
              </p>
              <p>
                We do not knowingly collect personal information from children under 16. If we
                become aware that we have collected data from a child under 16, we will take
                immediate steps to delete such information from our servers.
              </p>
            </div>
          </section>

          {/* 8 — Changes */}
          <section id="changes" className={styles.section}>
            <div className={styles.sectionIcon}>
              <RefreshCw size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>8. Changes to This Policy</h2>
            <div className={styles.sectionText}>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our
                practices, technology, legal requirements, or other factors. When we make
                material changes, we will:
              </p>
              <ul className={styles.policyList}>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Update the "Last Updated" date at the top of this page.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Notify registered users via email or in-platform notification.</span>
                </li>
                <li className={styles.policyListItem}>
                  <span className={styles.listBullet}><ChevronRight size={12} color="var(--color-primary)" /></span>
                  <span>Provide a summary of the key changes made.</span>
                </li>
              </ul>
              <p>
                We encourage you to review this policy periodically to stay informed about how
                we are protecting your information.
              </p>
            </div>
          </section>

          {/* 9 — Contact */}
          <section id="contact" className={styles.section}>
            <div className={styles.sectionIcon}>
              <Mail size={20} color="var(--color-primary)" />
            </div>
            <h2 className={styles.sectionTitle}>9. Contact Us</h2>
            <div className={styles.sectionText}>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy
                or our data practices, please contact us:
              </p>
              <div className={styles.contactCard}>
                <div className={styles.contactRow}>
                  <Mail size={16} color="var(--color-primary)" />
                  <span className={styles.contactLabel}>Email:</span>
                  <span>privacy@nursesim.edu</span>
                </div>
                <div className={styles.contactRow}>
                  <MapPin size={16} color="var(--color-primary)" />
                  <span className={styles.contactLabel}>Address:</span>
                  <span>SimRun Learning Platform, Department of Nursing Education</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link to="/" className={styles.footerLink}>Home</Link>
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

export default PrivacyPolicy;
