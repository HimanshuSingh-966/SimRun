import { ExternalLink } from 'lucide-react';
import { isMaterialAudio, isMaterialVideo } from '../lib/materialFile';

type Props = {
  title: string;
  material_type: string;
  file_mime_type?: string | null;
  file_url: string | null;
  file_name?: string | null;
  external_url?: string | null;
};

/**
 * Renders external links, downloads, or inline video/audio when the file is playable in-browser.
 */
const CourseMaterialAttachment = ({ title, material_type, file_mime_type, file_url, file_name, external_url }: Props) => {
  const m = { material_type, file_mime_type };

  return (
    <>
      {external_url && (
        <a href={external_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
          <ExternalLink size={14} /> Open resource
        </a>
      )}
      {file_url && isMaterialVideo(m) && (
        <div style={{ marginTop: '0.75rem' }}>
          <video controls preload="metadata" style={{ width: '100%', maxWidth: 720, borderRadius: 'var(--radius-md)', background: '#111' }} src={file_url} />
          <a href={file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
            <ExternalLink size={14} /> Download video
          </a>
        </div>
      )}
      {file_url && isMaterialAudio(m) && (
        <div style={{ marginTop: '0.75rem' }}>
          <audio controls preload="metadata" style={{ width: '100%', maxWidth: 480 }} src={file_url}>
            {title}
          </audio>
          <a href={file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
            <ExternalLink size={14} /> Download audio
          </a>
        </div>
      )}
      {file_url && !isMaterialVideo(m) && !isMaterialAudio(m) && (
        <a href={file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
          <ExternalLink size={14} /> {file_name || 'Download file'}
        </a>
      )}
    </>
  );
};

export default CourseMaterialAttachment;
