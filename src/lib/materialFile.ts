/** Maps an uploaded file to a stored course_materials.material_type. */
export function materialTypeFromFile(file: File): 'video' | 'audio' | 'file' {
  const t = file.type || '';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'file';
}

export function isMaterialVideo(m: { material_type: string; file_mime_type?: string | null }) {
  if (m.material_type === 'video') return true;
  return (m.file_mime_type || '').startsWith('video/');
}

export function isMaterialAudio(m: { material_type: string; file_mime_type?: string | null }) {
  if (m.material_type === 'audio') return true;
  return (m.file_mime_type || '').startsWith('audio/');
}
