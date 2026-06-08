import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, UserCircle, GraduationCap, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import { createRateLimiter } from '../../lib/rateLimit';
import Turnstile, { type TurnstileRef } from '../../components/Turnstile';
import styles from './AuthForms.module.css';

const signupLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 per 15 min

const fetchBatches = async () => {
  const { data, error } = await supabase.from('batches').select('id, name, start_year, end_year').order('name').limit(200);
  if (error) throw error;
  return data ?? [];
};

const StudentRegistration = () => {
  const navigate = useNavigate();
  const { signUp, signOut } = useAuth();
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), []);
  const handleCaptchaExpire = useCallback(() => setCaptchaToken(null), []);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    regNumber: '',
    dob: '',
    gender: '',
    batchId: '',
    semester: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchBatches().then(setBatches).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!signupLimiter.check()) {
      setError('Too many registration attempts. Please wait a few minutes.');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setLoading(true);

    const { error: signUpError, userId } = await signUp(
      formData.email,
      formData.password,
      { full_name: formData.fullName, role: 'student' },
      captchaToken
    );

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      return;
    }

    // Insert student-specific profile
    if (userId) {
      const { error: studentError } = await supabase.from('student_profiles').insert({
        id: userId,
        reg_number: formData.regNumber || null,
        date_of_birth: formData.dob || null,
        gender: formData.gender || null,
        batch_id: formData.batchId || null,
        semester: formData.semester || null,
      });

		if (studentError) {
			await signOut();
			setError(studentError.code === '23505'
				? 'A student profile for this account already exists. Please contact your coordinator.'
				: `Failed to create student profile: ${sanitizeError(studentError)} Please try registering again.`);
			setLoading(false);
			setCaptchaToken(null);
			turnstileRef.current?.reset();
			return;
		}
	}

	// Sign out immediately so the user isn't stuck logged in with a pending profile
	await signOut();

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
          Your account is pending admin approval. You'll be able to log in once approved.
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
        <div className={styles.roleBadge}>
          <UserPlus size={16} />
          <span>NEW STUDENT</span>
        </div>
        <h1>Create Your Account</h1>
        <p>Join the next generation of nursing simulation excellence.</p>
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
              <input type="text" placeholder="Anamika" value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <input type="email" placeholder="nurse@institute.edu" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Registration Number</label>
              <input type="text" placeholder="241306128" value={formData.regNumber}
                onChange={e => setFormData({ ...formData, regNumber: e.target.value })} />
            </div>
          </div>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label>Date of Birth</label>
              <input type="date" value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div className={styles.inputGroup}>
              <label>Gender</label>
              <select value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                <option value="" disabled>Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <GraduationCap size={16} />
            <span>ACADEMIC DETAILS</span>
          </div>
          <div className={styles.inputGroupFull}>
            <label>Batch</label>
            <select value={formData.batchId}
              onChange={e => setFormData({ ...formData, batchId: e.target.value })}>
              <option value="" disabled>Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className={styles.inputGroupFull}>
            <label>Semester</label>
            <input type="text" placeholder="Enter Your Input" value={formData.semester}
              onChange={e => setFormData({ ...formData, semester: e.target.value })} />
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

        {turnstileSiteKey && (
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onVerify={handleCaptchaVerify}
            onExpire={handleCaptchaExpire}
            onError={() => {
              setCaptchaToken(null);
              setError('CAPTCHA could not be loaded. Please refresh and try again.');
            }}
          />
        )}

        <button type="submit" className={styles.submitBtn} disabled={loading || !captchaToken}>
          {loading ? 'Registering...' : 'Register Account'} <ArrowRight size={18} />
        </button>

        <div className={styles.termsFooter}>
          By registering, you agree to our <Link to="/privacy-policy">Privacy Policy</Link>.
        </div>
      </form>
    </div>
  );
};

export default StudentRegistration;
