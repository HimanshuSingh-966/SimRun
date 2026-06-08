import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

interface ChecklistBuilderProps {
  courseId: string;
  onBack: () => void;
}

interface ChecklistItem {
  id: string; // temp id for UI if new
  description: string;
  image_url: string | null;
  options: { text: string; points: number }[];
}

const FacultyChecklistBuilder: React.FC<ChecklistBuilderProps> = ({ courseId, onBack }) => {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [isPeerEval, setIsPeerEval] = useState(false);
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        image_url: null,
        options: [
          { text: 'Performed correctly', points: 2 },
          { text: 'Performed with errors', points: 1 },
          { text: 'Not performed', points: 0 }
        ]
      }
    ]);
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: string | number | boolean | { text: string; points: number }[]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const updateItemOption = (itemIndex: number, optionIndex: number, field: 'text' | 'points', value: string | number) => {
    const newItems = [...items];
    const newOptions = [...newItems[itemIndex].options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    newItems[itemIndex].options = newOptions;
    setItems(newItems);
  };

  const addOption = (itemIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].options.push({ text: 'New Option', points: 0 });
    setItems(newItems);
  };

  const removeOption = (itemIndex: number, optionIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].options.splice(optionIndex, 1);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one item to the checklist');
      return;
    }
    if (items.some(i => !i.description.trim())) {
      setError('All items must have a description');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Create Checklist
      const { data: checklistData, error: checklistErr } = await supabase
        .from('checklists')
        .insert({
          course_id: courseId,
          faculty_id: user?.id,
          title,
          description,
          objectives,
          is_peer_evaluation_enabled: isPeerEval
        })
        .select('id')
        .single();

      if (checklistErr) throw checklistErr;
      const checklistId = checklistData.id;

      // 2. Insert Items
      const itemsToInsert = items.map((item, idx) => ({
        checklist_id: checklistId,
        description: item.description,
        image_url: item.image_url,
        options: item.options,
        sort_order: idx + 1
      }));

      const { error: itemsErr } = await supabase
        .from('checklist_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        await supabase.from('checklists').delete().eq('id', checklistId);
        throw itemsErr;
      }

      onBack();
} catch (e: unknown) {
    setError(sanitizeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.approvalsCard}>
      <button
        type="button"
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to assessments
      </button>

      <div className={styles.approvalsHeader} style={{ marginBottom: '1rem' }}>
        <h3>Create New Checklist</h3>
      </div>

      {error && <p style={{ color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            placeholder="e.g. Hand Hygiene Checklist"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', minHeight: '80px' }}
            placeholder="Overview of this checklist..."
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Objectives</label>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', minHeight: '80px' }}
            placeholder="Learning objectives..."
          />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={isPeerEval} 
              onChange={(e) => setIsPeerEval(e.target.checked)} 
              style={{ width: '1.1rem', height: '1.1rem' }} 
            />
            Enable Peer Evaluation
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            If enabled, approved students will be able to evaluate their peers using this checklist.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Checklist Items</h4>
        <button
          type="button"
          onClick={addItem}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Step {idx + 1}</span>
              <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description *</label>
              <textarea
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', minHeight: '60px' }}
                placeholder="e.g. Washes hands with soap and water for 20 seconds."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Assessment Options</label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {item.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateItemOption(idx, optIdx, 'text', e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}
                    />
                    <input
                      type="number"
                      value={opt.points}
                      onChange={(e) => updateItemOption(idx, optIdx, 'points', parseInt(e.target.value) || 0)}
                      style={{ width: '80px', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}
                      title="Points"
                    />
                    <button type="button" onClick={() => removeOption(idx, optIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addOption(idx)}
                style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No items added yet.</p>
            <button
              type="button"
              onClick={addItem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', background: 'var(--theme-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add First Item
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 1.5rem',
            background: 'var(--theme-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Checklist'}
        </button>
      </div>
    </div>
  );
};

export default FacultyChecklistBuilder;
