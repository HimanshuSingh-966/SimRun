import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import { createRateLimiter } from '../../lib/rateLimit';
import Turnstile from '../../components/Turnstile';
import type { TurnstileRef } from '../../components/Turnstile';
import styles from './AuthForms.module.css';

const loginLimiter = createRateLimiter(10, 5 * 60 * 1000); // 10 per 5 min
const resetLimiter = createRateLimiter(3, 10 * 60 * 1000); // 3 per 10 min

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, profile, user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  const forgotTurnstileRef = useRef<TurnstileRef>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), []);
  const handleCaptchaExpire = useCallback(() => setCaptchaToken(null), []);
  const handleForgotCaptchaVerify = useCallback((token: string) => setForgotCaptchaToken(token), []);
  const handleForgotCaptchaExpire = useCallback(() => setForgotCaptchaToken(null), []);

  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Redirect once AuthContext has loaded the profile after sign-in
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (searchParams.get('reset') === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowUpdatePassword(true);
        return;
      }
      
      if (profile.status === 'pending') {
        setError('Your account is awaiting admin approval. Please check back later.');
        setLoading(false);
        return;
      }
      if (profile.role === 'admin') navigate('/admin', { replace: true });
      else if (profile.role === 'faculty') navigate('/faculty', { replace: true });
      else navigate('/student', { replace: true });
    }
  }, [authLoading, user, profile, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginLimiter.check()) {
      setError('Too many login attempts. Please wait a few minutes.');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setLoading(true);

    const { error: signInError } = await signIn(formData.email, formData.password, captchaToken);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      return;
    }

    // AuthContext's onAuthStateChange will fetch the profile automatically.
    // The useEffect above will handle navigation once profile is ready.
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.header} style={{ textAlign: 'center' }}>
        <h1>Welcome Back</h1>
        <p>Access your clinical simulation dashboard</p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.formSection}>
          <div className={styles.inputGroupFull}>
            <label>Institutional Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="login-email"
                type="email"
                placeholder="nursing.student@university.edu"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroupFull}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(formData.email); setForgotMsg(null); setForgotError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>Forgot?</button>
              </div>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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

        <button id="login-submit" type="submit" className={styles.submitBtn} disabled={loading || !captchaToken}>
          {loading ? 'Signing in...' : 'Sign In to Portal'} <ArrowRight size={18} />
        </button>

        <div style={{
          background: '#f8fafc',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          marginTop: '0.5rem'
        }}>
          <Info size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            If your account is not approved yet you cannot login. Please contact admin for registration status updates.
          </p>
        </div>

      <div className={styles.termsFooter}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </div>
    </form>

  {showForgot && (
  <div role="dialog" aria-modal="true" aria-labelledby="forgot-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowForgot(false)}>
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 420, width: '90%', boxShadow: 'var(--shadow-card)' }} onClick={(e) => e.stopPropagation()}>
      <h3 id="forgot-title" style={{ color: 'var(--color-navy)', marginBottom: '0.5rem' }}>Reset Password</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Enter your email and we'll send you a password reset link.</p>
          {forgotMsg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{forgotMsg}</div>}
          {forgotError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{forgotError}</div>}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setForgotLoading(true);
            setForgotMsg(null);
            setForgotError(null);

            if (!resetLimiter.check()) {
              setForgotError('Too many reset attempts. Please wait a few minutes.');
              setForgotLoading(false);
              return;
            }

            if (!forgotCaptchaToken) {
              setForgotError('Please complete the CAPTCHA verification.');
              setForgotLoading(false);
              return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
              redirectTo: `${window.location.origin}/login?reset=1`,
              captchaToken: forgotCaptchaToken,
            });
            if (error) { setForgotError(sanitizeError(error)); } else { setForgotMsg('Reset link sent! Check your email inbox.'); }
            setForgotCaptchaToken(null);
            forgotTurnstileRef.current?.reset();
            setForgotLoading(false);
          }}>
            <div className={styles.inputWrapper} style={{ marginBottom: '1rem' }}>
              <Mail size={18} className={styles.inputIcon} />
              <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid #000000', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem' }} />
            </div>
            {turnstileSiteKey && (
              <Turnstile
                ref={forgotTurnstileRef}
                siteKey={turnstileSiteKey}
                onVerify={handleForgotCaptchaVerify}
                onExpire={handleForgotCaptchaExpire}
                onError={() => {
                  setForgotCaptchaToken(null);
                  setForgotError('CAPTCHA could not be loaded. Please refresh and try again.');
                }}
              />
            )}
            <button type="submit" disabled={forgotLoading || !forgotCaptchaToken} className={styles.submitBtn} style={{ width: '100%' }}>
              {forgotLoading ? 'Sending...' : 'Send Reset Link'} <ArrowRight size={18} />
            </button>
          </form>
          <button type="button" onClick={() => setShowForgot(false)} style={{ marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.875rem', width: '100%', textAlign: 'center' }}>Back to login</button>
        </div>
      </div>
    )}

  {showUpdatePassword && (
  <div role="dialog" aria-modal="true" aria-labelledby="update-pw-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 420, width: '90%', boxShadow: 'var(--shadow-card)' }}>
      <h3 id="update-pw-title" style={{ color: 'var(--color-navy)', marginBottom: '0.5rem' }}>Set New Password</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Please enter your new password below.
          </p>
          {forgotError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{forgotError}</div>}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setForgotLoading(true);
            setForgotError(null);

            if (!resetLimiter.check()) {
              setForgotError('Too many attempts. Please wait a few minutes.');
              setForgotLoading(false);
              return;
            }

            if (newPassword.length < 6) {
              setForgotError('Password must be at least 6 characters.');
              setForgotLoading(false);
              return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            
            if (error) {
              setForgotError(sanitizeError(error));
              setForgotLoading(false);
            } else {
               navigate('/login', { replace: true });
            }
          }}>
            <div className={styles.inputWrapper} style={{ marginBottom: '1rem' }}>
              <Lock size={18} className={styles.inputIcon} />
              <input 
                type="password" 
                required 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="New Password" 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem' }} 
              />
            </div>
            <button type="submit" disabled={forgotLoading} className={styles.submitBtn} style={{ width: '100%' }}>
              {forgotLoading ? 'Updating...' : 'Update Password'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    )}
  </div>
  );
};

export default Login;
