-- Week-wise learning organization + course pacing mode + file uploads

-- 1) Course delivery mode (self-paced / timeline-based)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'self_paced'
  CHECK (delivery_mode IN ('self_paced', 'timeline'));

-- 2) Week support on assignments
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS week_number INT NOT NULL DEFAULT 1
  CHECK (week_number > 0);

-- 3) Rich material support
ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS week_number INT NOT NULL DEFAULT 1
  CHECK (week_number > 0);

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS markdown_content TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_mime_type TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

CREATE INDEX IF NOT EXISTS idx_assignments_course_week ON public.assignments(course_id, week_number);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_week ON public.course_materials(course_id, week_number);

-- 4) Storage bucket for material attachments (pdf/doc/ppt/etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-material-files', 'course-material-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read files in this bucket
DROP POLICY IF EXISTS "course_material_files_read" ON storage.objects;
CREATE POLICY "course_material_files_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-material-files');

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "course_material_files_insert" ON storage.objects;
CREATE POLICY "course_material_files_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-material-files');

-- Allow owners to update/delete their uploaded files
DROP POLICY IF EXISTS "course_material_files_update_owner" ON storage.objects;
CREATE POLICY "course_material_files_update_owner" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-material-files' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'course-material-files' AND owner = auth.uid());

DROP POLICY IF EXISTS "course_material_files_delete_owner" ON storage.objects;
CREATE POLICY "course_material_files_delete_owner" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-material-files' AND owner = auth.uid());
