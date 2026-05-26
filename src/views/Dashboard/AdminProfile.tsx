import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

const AdminProfile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setFullName(profile?.full_name || '');
    setLoading(false);
  }, [authLoading, profile?.full_name]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user.id);
      if (pErr) throw pErr;
      setMsg('Profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Password and confirm password do not match.'); return; }
    setUpdatingPassword(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) throw pwErr;
      setNewPassword('');
      setConfirmPassword('');
      setMsg('Password changed successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Admin Profile</h3>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading profile...</p>
        ) : (
          <>
            <form onSubmit={saveProfile} style={{ display: 'grid', gap: '0.85rem', maxWidth: 760, marginBottom: '1.25rem' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Full Name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Email
                <input
                  value={profile?.email || ''}
                  disabled
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Role
                <input
                  value="System Admin"
                  disabled
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                style={{ width: 'fit-content', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--theme-primary)', color: 'white', fontWeight: 600 }}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>

            <form
              onSubmit={changePassword}
              style={{ display: 'grid', gap: '0.85rem', maxWidth: 520, borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}
            >
              <h4 style={{ color: 'var(--color-navy)' }}>Change Password</h4>
              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </label>
              <button
                type="submit"
                disabled={updatingPassword}
                style={{ width: 'fit-content', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', background: '#111827', color: 'white', fontWeight: 600 }}
              >
                {updatingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>

            {msg && <p style={{ color: '#166534', marginTop: '0.75rem' }}>{msg}</p>}
            {error && <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;
