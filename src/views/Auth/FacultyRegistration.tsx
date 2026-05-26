import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCircle, Briefcase, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './AuthForms.module.css';

const FacultyRegistration = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    employeeId: '',
    department: '',
    designation: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: signUpError, userId } = await signUp(
      formData.email,
      formData.password,
      { full_name: formData.fullName, role: 'faculty' }
    );

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    // Insert faculty-specific profile
    if (userId) {
      const { error: facultyError } = await supabase.from('faculty_profiles').insert({
        id: userId,
        employee_id: formData.employeeId || null,
        department: formData.department || null,
        designation: formData.designation || null,
      });

		if (facultyError) {
			setError(facultyError.code === '23505'
				? 'A faculty profile for this account already exists. Please contact your administrator.'
				: `Failed to create faculty profile: ${facultyError.message}`);
			setLoading(false);
			return;
		}
	}

	setLoading(false);
	setSuccess(true);
  };

  if (success) {
    return (
      <div className={styles.authCard} style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontSize: '2rem'
        }}>✓</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Registration Submitted!</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          Your faculty account is pending admin approval. You'll be able to log in once approved.
        </p>
        <button onClick={() => navigate('/login')} className={styles.submitBtn}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <div className={styles.roleBadge} style={{ color: 'var(--color-secondary)' }}>
          <UserPlus size={16} />
          <span>NEW FACULTY</span>
        </div>
        <h1>Create Faculty Account</h1>
        <p>Join SimRun as an educator and manage digital simulations.</p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem', marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <UserCircle size={16} />
            <span>PERSONAL DETAILS</span>
          </div>
          <div className={styles.inputGroupFull}>
            <label>Full Name</label>
            <div className={styles.inputWrapper}>
              <UserCircle size={18} className={styles.inputIcon} />
              <input type="text" placeholder="Dr. Sarah Chen" value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Institutional Email</label>
              <input type="email" placeholder="s.chen@institute.edu" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Employee ID</label>
              <input type="text" placeholder="EMP-8241" value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })} />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <Briefcase size={16} />
            <span>PROFESSIONAL DETAILS</span>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Department</label>
              <select value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}>
                <option value="" disabled>Select Department</option>
                <option value="surgery">Surgery</option>
                <option value="pediatrics">Pediatrics</option>
                <option value="emergency">Emergency Medicine</option>
                <option value="critical_care">Critical Care</option>
                <option value="general">General Nursing</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Designation</label>
              <input type="text" placeholder="e.g. Clinical Professor" value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })} />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <Lock size={16} />
            <span>SECURITY</span>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required />
            </div>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Registering...' : 'Register Account'} <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
};

export default FacultyRegistration;
