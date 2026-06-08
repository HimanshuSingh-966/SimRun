import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Download, Users, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface ChecklistRow {
  id: string;
  title: string;
  description?: string;
  is_peer_evaluation_enabled: boolean;
  [key: string]: unknown;
}

interface ChecklistItemRow {
  id: string;
  description: string;
  sort_order: number;
  options?: { text: string; points: number }[];
  [key: string]: unknown;
}

interface PairingRow {
  id: string;
  status: string;
  created_at: string;
  evaluator?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[];
  evaluatee?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[];
  [key: string]: unknown;
}

interface EvaluationRow {
  id: string;
  total_score: number;
  max_score: number;
  created_at: string;
  evaluation_type: string;
  evaluator?: { full_name?: string } | { full_name?: string }[];
  evaluatee?: { full_name?: string } | { full_name?: string }[];
  [key: string]: unknown;
}

interface Props {
  checklistId: string;
  onBack: () => void;
}

const FacultyChecklistManagement: React.FC<Props> = ({ checklistId, onBack }) => {
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clRes, itemsRes, pairRes, evalRes] = await Promise.all([
      supabase.from('checklists').select('id, title, description, is_peer_evaluation_enabled').eq('id', checklistId).single(),
      supabase.from('checklist_items').select('id, description, sort_order, options').eq('checklist_id', checklistId).order('sort_order'),
        supabase.from('peer_evaluation_pairings')
          .select(`
            id, status, created_at,
            evaluator:profiles!peer_evaluation_pairings_evaluator_id_fkey(full_name, email),
            evaluatee:profiles!peer_evaluation_pairings_evaluatee_id_fkey(full_name, email)
          `)
          .eq('checklist_id', checklistId)
          .order('created_at', { ascending: false }),
        supabase.from('checklist_evaluations')
          .select(`
            id, total_score, max_score, created_at, evaluation_type,
            evaluator:profiles!checklist_evaluations_evaluator_id_fkey(full_name),
            evaluatee:profiles!checklist_evaluations_evaluatee_id_fkey(full_name)
          `)
          .eq('checklist_id', checklistId)
          .order('created_at', { ascending: false })
      ]);

      if (clRes.error) throw clRes.error;
      setChecklist(clRes.data);
      setItems(itemsRes.data || []);
      setPairings(pairRes.data || []);
      setEvaluations(evalRes.data || []);
} catch (e: unknown) {
    setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const updatePairingStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'rejected' && !window.confirm('Reject this peer evaluation request?')) return;
    try {
      const { error } = await supabase
        .from('peer_evaluation_pairings')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setPairings(pairings.map(p => p.id === id ? { ...p, status: newStatus } : p));
} catch (e: unknown) {
    alert('Failed to update status: ' + sanitizeError(e));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFullName = (person: any): string => {
    if (!person) return 'N/A';
    if (Array.isArray(person)) return person[0]?.full_name || 'N/A';
    return person.full_name || 'N/A';
  };

  const handleExport = () => {
    if (evaluations.length === 0) {
      alert('No evaluations to export');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Evaluator', 'Evaluatee', 'Score', 'Max Score'];
    const rows = evaluations.map(e => [
      e.id,
      new Date(e.created_at).toISOString(),
      e.evaluation_type,
      getFullName(e.evaluator),
      getFullName(e.evaluatee),
      e.total_score,
      e.max_score
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Checklist_Results_${checklistId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading management console...</div>;
  if (!checklist) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div className={styles.approvalsCard}>
      <div className="no-print">
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to assessments
        </button>

        <div className={styles.approvalsHeader} style={{ marginBottom: '1rem' }}>
          <div>
            <h3>{checklist.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {checklist.is_peer_evaluation_enabled ? 'Peer Evaluation Enabled' : 'Faculty Evaluation Only'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <Printer size={16} /> Print Layout
            </button>
            <button
              onClick={handleExport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <Download size={16} /> Export Results
            </button>
          </div>
        </div>

        {/* Peer Evaluation Pairing Approvals */}
        {checklist.is_peer_evaluation_enabled && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Users size={18} /> Peer Evaluation Requests
            </h4>
            {pairings.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No requests found.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {pairings.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Evaluator: {getFullName(p.evaluator)} &nbsp;→&nbsp; Evaluatee: {getFullName(p.evaluatee)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Requested on {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      {p.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
<button onClick={() => updatePairingStatus(p.id, 'approved')} aria-label="Approve pairing request" style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Approve</button>
          <button onClick={() => updatePairingStatus(p.id, 'rejected')} aria-label="Reject pairing request" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: p.status === 'approved' ? '#16a34a' : '#dc2626', textTransform: 'capitalize' }}>
                          {p.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={18} /> Completed Evaluations
          </h4>
          {evaluations.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No evaluations submitted yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {evaluations.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Evaluatee: {getFullName(e.evaluatee)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Evaluator: {getFullName(e.evaluator)} ({e.evaluation_type}) &middot; {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--theme-primary)', fontSize: '1.1rem' }}>
                    {e.total_score} / {e.max_score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Layout */}
      <div className="print-only" style={{ display: 'none' }}>
        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              body { background: white; margin: 0; padding: 20px; }
            }
          `}
        </style>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>{checklist.title}</h1>
        <p style={{ fontSize: '14px', marginBottom: '20px', color: '#555' }}>{checklist.description}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left', width: '60%' }}>Step</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>Options</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                  <strong>{idx + 1}.</strong> {item.description}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                  {item.options?.map((opt: { text: string; points: number }, i: number) => (
                    <div key={i} style={{ marginBottom: '4px' }}>
                      <input type="checkbox" style={{ marginRight: '8px' }} />
                      {opt.text} ({opt.points} pts)
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FacultyChecklistManagement;
