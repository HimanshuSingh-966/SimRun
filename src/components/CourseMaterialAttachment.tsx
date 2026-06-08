import { ExternalLink } from 'lucide-react';
import { isMaterialAudio, isMaterialVideo } from '../lib/materialFile';

const srOnlyStyle: React.CSSProperties = { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

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
    <a href={external_url} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
      <ExternalLink size={14} /> Open resource<span style={srOnlyStyle}>(opens in new window)</span>
    </a>
  )}
  {file_url && isMaterialVideo(m) && (
    <div style={{ marginTop: '0.75rem' }}>
      <video controls preload="metadata" style={{ width: '100%', maxWidth: 720, borderRadius: 'var(--radius-md)', background: '#111' }} src={file_url} />
      <a href={file_url} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
        <ExternalLink size={14} /> Download video<span style={srOnlyStyle}>(opens in new window)</span>
      </a>
    </div>
  )}
  {file_url && isMaterialAudio(m) && (
    <div style={{ marginTop: '0.75rem' }}>
      <audio controls preload="metadata" style={{ width: '100%', maxWidth: 480 }} src={file_url}>
        {title}
      </audio>
      <a href={file_url} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
        <ExternalLink size={14} /> Download audio<span style={srOnlyStyle}>(opens in new window)</span>
      </a>
    </div>
  )}
  {file_url && !isMaterialVideo(m) && !isMaterialAudio(m) && (
    <a href={file_url} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', color: 'var(--theme-primary)', fontSize: '0.875rem' }}>
      <ExternalLink size={14} /> {file_name || 'Download file'}<span style={srOnlyStyle}>(opens in new window)</span>
    </a>
      )}
    </>
  );
};

export default CourseMaterialAttachment;
