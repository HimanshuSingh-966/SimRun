import { useEffect, useState } from 'react';

import { BookOpen, FileText, Video, Headphones, ExternalLink, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sanitizeError } from '../../lib/sanitizeError';
import styles from './Admin.module.css';

const srOnlyStyle: React.CSSProperties = { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

interface MaterialRow {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description: string | null;
  material_type: string;
  external_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  course_title?: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  video: <Video size={16} />,
  audio: <Headphones size={16} />,
  reading: <FileText size={16} />,
  link: <ExternalLink size={16} />,
  file: <Download size={16} />,
};

const StudentResources = () => {
  const { user, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: enrollments, error: eErr } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .eq('status', 'active');
        if (eErr) throw eErr;
        const courseIds = (enrollments || []).map((e: { course_id: string }) => e.course_id).filter(Boolean);
        if (courseIds.length === 0) {
          if (!cancelled) { setMaterials([]); setLoading(false); }
          return;
        }
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        const courseMap = new Map<string, string>((coursesData || []).map((c: { id: string; title: string }) => [c.id, c.title]));

        const { data: matData, error: mErr } = await supabase
          .from('course_materials')
          .select('id, course_id, week_number, title, description, material_type, external_url, file_url, file_name, file_mime_type')
          .in('course_id', courseIds)
          .order('week_number', { ascending: true });
        if (mErr) throw mErr;
    const enriched = ((matData || []) as MaterialRow[]).map((m) => ({
      ...m,
      course_title: courseMap.get(m.course_id) || 'Unknown Course',
    }));
        if (!cancelled) setMaterials(enriched);
      } catch (e: unknown) {
        if (!cancelled) setError(sanitizeError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  if (loading) {
    return <div className={styles.dashboardWrapper}><p style={{ color: 'var(--color-text-muted)' }}>Loading resources...</p></div>;
  }

  const grouped = new Map<string, MaterialRow[]>();
  materials.forEach((m) => {
    const key = m.course_title || 'Unknown Course';
    const arr = grouped.get(key) || [];
    arr.push(m);
    grouped.set(key, arr);
  });

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.approvalsCard}>
        <div className={styles.approvalsHeader}>
          <h3>Learning Resources</h3>
        </div>
        {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}
        {materials.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No resources available for your enrolled courses yet.</p>
        ) : (
          Array.from(grouped.entries()).map(([courseTitle, items]) => (
            <div key={courseTitle} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--color-navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={16} style={{ color: 'var(--theme-primary)' }} />
                {courseTitle}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {items.map((m) => (
                  <div
                    key={m.id}
                    style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem', background: '#fff' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--theme-primary)' }}>{typeIcon[m.material_type] || <FileText size={16} />}</span>
                      <strong>{m.title}</strong>
                      <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>{m.material_type}</span>
                    </div>
                    {m.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{m.description}</p>}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>Week {m.week_number || 1}</div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {m.external_url && (
    <a href={m.external_url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <ExternalLink size={14} /> Open Link<span style={srOnlyStyle}>(opens in new window)</span>
    </a>
  )}
  {m.file_url && (
    <a href={m.file_url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--theme-primary)', fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <Download size={14} /> {m.file_name || 'Download File'}<span style={srOnlyStyle}>(opens in new window)</span>
    </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentResources;
