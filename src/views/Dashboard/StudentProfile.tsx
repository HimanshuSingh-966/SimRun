import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './Admin.module.css';

interface StudentProfileRow {
  reg_number: string | null;
  batch_id: string | null;
  semester: string | null;
  faculty: string | null;
  department: string | null;
  course: string | null;
  specialization: string | null;
}

interface BatchRow {
  id: string;
  name: string;
  year: number | null;
}

const StudentProfile = () => {
  const { user, profile, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [batchId, setBatchId] = useState('');
  const [semester, setSemester] = useState('');
  const [batches, setBatches] = useState<BatchRow[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
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
      const [{ data: batchData }, { data, error: spErr }] = await Promise.all([
        supabase.from('batches').select('id, name, year').order('name'),
        supabase.from('student_profiles').select('*').eq('id', user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      setBatches(((batchData as BatchRow[]) || []).map((b) => ({ id: b.id, name: b.name, year: b.year })));

      if (spErr) {
        setError(spErr.message);
      } else if (data) {
        const sp = data as StudentProfileRow;
        setRegNumber(sp.reg_number || '');
        setBatchId(sp.batch_id || '');
        setSemester(sp.semester || '');
        setFaculty(sp.faculty || '');
        setDepartment(sp.department || '');
        setCourse(sp.course || '');
        setSpecialization(sp.specialization || '');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile?.full_name, user?.id]);

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

      const payload: StudentProfileRow & { id: string } = {
        id: user.id,
        reg_number: regNumber.trim() || null,
        batch_id: batchId || null,
        semester: semester.trim() || null,
        faculty: faculty.trim() || null,
        department: department.trim() || null,
        course: course.trim() || null,
        specialization: specialization.trim() || null,
      };

      const { error: spErr } = await supabase.from('student_profiles').upsert(payload);
      if (spErr) throw spErr;

      setMsg('Profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    setError(null);
    setMsg(null);
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `student-avatars/${user.id}/${Date.now()}_${safe}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('course-material-files')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('course-material-files').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (profileErr) throw profileErr;
      setAvatarUrl(publicUrl);
      setMsg('Profile image updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploadingAvatar(false);
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
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Student Profile</h3>
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
              alt="Student avatar"
              style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
            />
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Upload profile image
                <input
                  type="file"
                  accept="image/*"
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
          <form
              onSubmit={saveProfile}
              style={{ display: 'grid', gap: '0.85rem', maxWidth: 760, marginBottom: '1.25rem' }}
            >
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
                  style={{
                    padding: '0.7rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                Registration Number
                <input
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. 241306128"
                  style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Faculty
                  <input
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="e.g. Faculty of Nursing"
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Department
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Nursing Basics"
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Course
                  <input
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Sc Nursing"
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Specialization (optional)
                  <input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Critical Care"
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Batch
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="">Select batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.year ? ` (${b.year})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: '0.875rem' }}>
                  Semester
                  <input
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. Semester 1"
                    style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  />
                </label>
              </div>

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

export default StudentProfile;

