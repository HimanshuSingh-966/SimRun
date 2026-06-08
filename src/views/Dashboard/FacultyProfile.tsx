import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface FacultyProfileRow {
  department: string | null;
  designation: string | null;
  employee_id: string | null;
}

const FacultyProfile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    setFullName(profile?.full_name || '');
    setAvatarUrl(profile?.avatar_url || '');

    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: fpErr } = await supabase
        .from('faculty_profiles')
        .select('id, department, designation, employee_id')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (fpErr) {
        setError(sanitizeError(fpErr));
      } else {
        const fp = (data as FacultyProfileRow | null) || null;
        setDepartment(fp?.department || '');
        setDesignation(fp?.designation || '');
        setEmployeeId(fp?.employee_id || '');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.full_name, user?.id]);

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    setError(null);
    setMsg(null);

    try {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPG, PNG, GIF, WebP).');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB.');
      }

      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${Date.now()}_${safe}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (profileErr) throw profileErr;

      setAvatarUrl(publicUrl);
      setMsg('Profile image updated.');
    } catch (err: unknown) {
      setError(sanitizeError(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setError(null);
    setMsg(null);

    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null, avatar_url: avatarUrl.trim() || null })
        .eq('id', user.id);
      if (pErr) throw pErr;

      const basePayload = {
        id: user.id,
        department: department.trim() || null,
        designation: designation.trim() || null,
        employee_id: employeeId.trim() || null,
      };

      const { error: fpErr } = await supabase.from('faculty_profiles').upsert(basePayload);
      if (fpErr) throw fpErr;

      setMsg('Profile updated successfully.');
    } catch (err: unknown) {
      setError(sanitizeError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) throw pwErr;
      setNewPassword('');
      setConfirmPassword('');
      setMsg('Password changed successfully.');
    } catch (err: unknown) {
      setError(sanitizeError(err));
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Faculty Profile</h3>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading profile...</p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0.85rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <img
                src={avatarUrl || 'https://placehold.co/96x96?text=Avatar'}
                alt="Faculty avatar"
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
              />
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Upload profile image
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(file);
                    }}
                    disabled={uploadingAvatar}
                    style={{ padding: '0.4rem' }}
                  />
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {uploadingAvatar ? 'Uploading image...' : 'JPG/PNG/WebP recommended'}
                </span>
              </div>
            </div>

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
              Faculty
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Clinical Faculty"
                style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
              Employee ID
              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. FAC-1023"
                style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
              Department
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: 'fit-content',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--theme-primary)',
                color: 'white',
                fontWeight: 600,
              }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            </form>

            <form
              onSubmit={changePassword}
              style={{
                display: 'grid',
                gap: '0.85rem',
                maxWidth: 520,
                borderTop: '1px solid var(--color-border)',
                paddingTop: '1rem',
              }}
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
                style={{
                  width: 'fit-content',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#111827',
                  color: 'white',
                  fontWeight: 600,
                }}
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

export default FacultyProfile;
