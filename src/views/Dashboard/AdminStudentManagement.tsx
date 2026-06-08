import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, Plus } from 'lucide-react';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface BatchRow {
  id: string;
  name: string;
  year: number | null;
}

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  student_profiles:
    | {
        reg_number: string | null;
        batch_id: string | null;
        semester: string | null;
      }
    | {
        reg_number: string | null;
        batch_id: string | null;
        semester: string | null;
      }[]
    | null;
}

interface StudentProfileDetails {
  reg_number: string | null;
  batch_id: string | null;
  semester: string | null;
}

const AdminStudentManagement = () => {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Batch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programName, setProgramName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear().toString());
  const [endYear, setEndYear] = useState((new Date().getFullYear() + 1).toString());
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchBatches = async () => {
    const { data, error: bErr } = await supabase.from('batches').select('id, name, year').order('name');
    if (!bErr && data) {
      setBatches(data as BatchRow[]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: batchData, error: bErr }, { data: studentData, error: sErr }] = await Promise.all([
          supabase.from('batches').select('id, name, year').order('name'),
          supabase
            .from('profiles')
            .select('id, full_name, email, status, student_profiles(reg_number, batch_id, semester)')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(500),
        ]);
        if (bErr) throw bErr;
        if (sErr) throw sErr;
        if (!cancelled) {
          setBatches((batchData as BatchRow[]) || []);
          setRows((studentData as StudentRow[]) || []);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(sanitizeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsByBatch = useMemo(() => {
    const byBatch: Record<string, StudentRow[]> = {};
    rows.forEach((row) => {
      const sp = Array.isArray(row.student_profiles)
        ? (row.student_profiles[0] as StudentProfileDetails | undefined)
        : (row.student_profiles as StudentProfileDetails | null);
      const key = sp?.batch_id || 'unassigned';
      if (!byBatch[key]) byBatch[key] = [];
      byBatch[key].push(row);
    });
    return byBatch;
  }, [rows]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim()) {
      setModalError('Program name is required.');
      return;
    }
    setCreating(true);
    setModalError(null);
    try {
      const specText = specialization.trim() ? ` (${specialization.trim()})` : '';
      const batchName = `${programName.trim()}${specText} ${startYear} - ${endYear}`;
      const { error: insertErr } = await supabase
        .from('batches')
        .insert([{ name: batchName, year: parseInt(startYear, 10) }]);
      
      if (insertErr) throw insertErr;
      
      await fetchBatches();
      
      // Reset and close
      setIsModalOpen(false);
      setProgramName('');
      setSpecialization('');
      setStartYear(new Date().getFullYear().toString());
      setEndYear((new Date().getFullYear() + 1).toString());
    } catch (err: unknown) {
      setModalError(sanitizeError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Student Management (Batch-wise)</h3>
          <div className={styles.headerActions}>
            <button className={styles.createBatchBtn} onClick={() => setIsModalOpen(true)}>
              <Plus size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
              Create Batch
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading students...</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[...batches, { id: 'unassigned', name: 'Unassigned', year: null }].map((batch) => {
              const list = rowsByBatch[batch.id] || [];
              return (
                <Link
                  key={batch.id}
                  to={`/admin/students/${batch.id}`}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'block',
                    background: '#fff',
                  }}
                >
                  <h4 style={{ marginBottom: '0.4rem' }}>
                    {batch.name}
                    {/* Only show the year if it isn't already included in the name */}
                    {!batch.name.includes(String(batch.year)) && batch.year ? ` (${batch.year})` : ''}
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      - {list.length} students
                    </span>
                  </h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Open batch details →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Batch</h3>
              <button className={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch}>
              <div className={styles.modalBody}>
                {modalError && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{modalError}</p>}
                <div className={styles.formGroup}>
                  <label htmlFor="programName">Program Name *</label>
                  <input
                    id="programName"
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g. B.Sc Nursing"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="specialization">Specialization (Optional)</label>
                  <input
                    id="specialization"
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Pediatrics"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label htmlFor="startYear">Start Year *</label>
                    <input
                      id="startYear"
                      type="number"
                      value={startYear}
                      onChange={(e) => setStartYear(e.target.value)}
                      placeholder="YYYY"
                      min="2000"
                      max="2100"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="endYear">End Year *</label>
                    <input
                      id="endYear"
                      type="number"
                      value={endYear}
                      onChange={(e) => setEndYear(e.target.value)}
                      placeholder="YYYY"
                      min="2000"
                      max="2100"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.createBtn} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentManagement;
