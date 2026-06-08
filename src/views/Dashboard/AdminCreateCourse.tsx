import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';
import { ArrowLeft } from 'lucide-react';
import { sanitizeError } from '../../lib/sanitizeError';

interface Batch {
  id: string;
  name: string;
  year: number | null;
}

interface Faculty {
  id: string;
  full_name: string;
  email: string;
}

const AdminCreateCourse = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
    deliveryMode: 'self_paced',
    faculty_id: '',
    duration: '',
    level: '',
    certificate: '',
    language: '',
    instructorName: '',
    instructorTitle: '',
    instructorBio: '',
    prerequisites: '',
    whatYouWillLearn: '',
  });

  useEffect(() => {
    const loadData = async () => {
      const [batchesRes, facultyRes] = await Promise.all([
        supabase.from('batches').select('id, name, year').order('name'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'faculty').order('full_name')
      ]);
      
      if (!batchesRes.error && batchesRes.data) setBatches(batchesRes.data as Batch[]);
      if (!facultyRes.error && facultyRes.data) setFaculties(facultyRes.data as Faculty[]);
    };
    loadData();
  }, []);

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && selectedBatchIds.length > 0 && !!user && form.faculty_id.trim().length > 0,
    [form.title, form.faculty_id, selectedBatchIds.length, user]
  );

  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((batch) => {
      const label = `${batch.name} ${batch.year ?? ''}`.toLowerCase();
      return label.includes(q);
    });
  }, [batches, batchSearch]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          department: form.department.trim() || null,
          delivery_mode: form.deliveryMode,
          course_overview: {
            duration: form.duration.trim() || null,
            level: form.level.trim() || null,
            certificate: form.certificate.trim() || null,
            language: form.language.trim() || null,
            instructor_name: form.instructorName.trim() || null,
            instructor_title: form.instructorTitle.trim() || null,
            instructor_bio: form.instructorBio.trim() || null,
            prerequisites: form.prerequisites
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean),
            what_you_will_learn: form.whatYouWillLearn
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean),
          },
          faculty_id: form.faculty_id,
          status: 'draft',
          total_lessons: 0,
        })
        .select('id')
        .single();

      if (courseError || !data?.id) {
        throw courseError || new Error('Failed to create course');
      }

      const mappings = selectedBatchIds.map((batchId) => ({ course_id: data.id, batch_id: batchId }));
      const { error: mapError } = await supabase.from('course_batches').insert(mappings);
      if (mapError) throw mapError;

      setMessage('Course created successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/admin/courses/${data.id}/manage`);
      }, 500);
} catch (err: unknown) {
    setError(sanitizeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <button
        type="button"
        onClick={() => navigate('/admin/courses')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'none',
          border: 'none',
          color: 'var(--theme-primary)',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Courses
      </button>

      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Create Course</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Course title"
            style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Course description"
            rows={3}
            style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          />
          <input
            value={form.department}
            onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            placeholder="Department (optional)"
            style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          />

          <select
            value={form.faculty_id}
            onChange={(e) => setForm((prev) => ({ ...prev, faculty_id: e.target.value }))}
            style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="" disabled>Select Main Faculty</option>
            {faculties.map((fac) => (
              <option key={fac.id} value={fac.id}>{fac.full_name} ({fac.email})</option>
            ))}
          </select>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'grid', gap: '0.75rem' }}>
            <p style={{ fontWeight: 700 }}>Course Overview Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <input value={form.duration} onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))} placeholder="Duration (e.g. 45 Minutes)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
              <input value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))} placeholder="Level (e.g. Advanced Practice)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
              <input value={form.certificate} onChange={(e) => setForm((prev) => ({ ...prev, certificate: e.target.value }))} placeholder="Certificate (e.g. CNE Accredited)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
              <input value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} placeholder="Language (e.g. English)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </div>
            <input value={form.instructorName} onChange={(e) => setForm((prev) => ({ ...prev, instructorName: e.target.value }))} placeholder="Instructor name" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            <input value={form.instructorTitle} onChange={(e) => setForm((prev) => ({ ...prev, instructorTitle: e.target.value }))} placeholder="Instructor title" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            <textarea value={form.instructorBio} onChange={(e) => setForm((prev) => ({ ...prev, instructorBio: e.target.value }))} rows={3} placeholder="Instructor short bio" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            <textarea value={form.whatYouWillLearn} onChange={(e) => setForm((prev) => ({ ...prev, whatYouWillLearn: e.target.value }))} rows={4} placeholder="What you'll learn (one point per line)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            <textarea value={form.prerequisites} onChange={(e) => setForm((prev) => ({ ...prev, prerequisites: e.target.value }))} rows={4} placeholder="Prerequisites (one point per line)" style={{ padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
          </div>

          <select
            value={form.deliveryMode}
            onChange={(e) => setForm((prev) => ({ ...prev, deliveryMode: e.target.value }))}
            style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="self_paced">Self-paced course</option>
            <option value="timeline">Timeline-based course</option>
          </select>

          <div>
            <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Select Batches</p>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setBatchDropdownOpen((prev) => !prev)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                }}
              >
                {selectedBatchIds.length > 0
                  ? `${selectedBatchIds.length} batch${selectedBatchIds.length > 1 ? 'es' : ''} selected`
                  : 'Search and select batches'}
              </button>

              {batchDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    zIndex: 20,
                    marginTop: '0.4rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: '#fff',
                    padding: '0.65rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <input
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    placeholder="Search batch by name or year..."
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.6rem',
                    }}
                  />
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: '0.4rem' }}>
                    {filteredBatches.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.4rem 0.2rem' }}>
                        No matching batches found.
                      </p>
                    ) : (
                      filteredBatches.map((batch) => (
                        <label key={batch.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.includes(batch.id)}
                            onChange={() => toggleBatch(batch.id)}
                          />
                          <span>
                            {batch.name}
                            {batch.year ? ` (${batch.year})` : ''}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className={styles.submitBtn} disabled={!canSubmit || submitting}>
            {submitting ? 'Creating...' : 'Create Course'}
          </button>
          {message && <p style={{ color: '#166534' }}>{message}</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default AdminCreateCourse;
