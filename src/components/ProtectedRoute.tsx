import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { profile, loading, session } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-muted)',
        fontSize: '1.125rem'
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in → go to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but profile not loaded yet or pending
  if (!profile) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-muted)',
        fontSize: '1.125rem'
      }}>
        Loading profile...
      </div>
    );
  }

  // Account not approved yet
  if (profile.status === 'pending') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'var(--font-sans)',
        textAlign: 'center',
        padding: '2rem',
        gap: '1rem'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#fef3c7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem'
        }}>⏳</div>
        <h2 style={{ color: 'var(--color-navy)', fontSize: '1.5rem' }}>Account Pending Approval</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
          Your registration is awaiting admin approval. Please contact your clinical coordinator for status updates.
        </p>
      </div>
    );
  }

  // Account rejected
  if (profile.status === 'rejected') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'var(--font-sans)',
        textAlign: 'center',
        padding: '2rem',
        gap: '1rem'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem'
        }}>✗</div>
        <h2 style={{ color: 'var(--color-navy)', fontSize: '1.5rem' }}>Account Rejected</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
          Your registration was not approved by the administrator. If you believe this is an error, please contact your clinical coordinator for assistance.
        </p>
        <button
          onClick={() => { supabase.auth.signOut(); }}
          style={{
            marginTop: '0.5rem',
            padding: '0.65rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-primary)',
            color: 'white',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Role not allowed for this route → redirect to their own dashboard
  if (!allowedRoles.includes(profile.role)) {
    const roleRedirects: Record<UserRole, string> = {
      student: '/student',
      faculty: '/faculty',
      admin: '/admin',
    };
    return <Navigate to={roleRedirects[profile.role]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
