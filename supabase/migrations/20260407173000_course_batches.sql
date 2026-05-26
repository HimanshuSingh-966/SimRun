-- Map courses to target student batches
CREATE TABLE IF NOT EXISTS public.course_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id, batch_id)
);

ALTER TABLE public.course_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_batches_select_for_students_faculty_admin" ON public.course_batches;
CREATE POLICY "course_batches_select_for_students_faculty_admin" ON public.course_batches
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.batch_id = batch_id
    )
  );

DROP POLICY IF EXISTS "course_batches_insert_faculty_or_admin" ON public.course_batches;
CREATE POLICY "course_batches_insert_faculty_or_admin" ON public.course_batches
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_batches_delete_faculty_or_admin" ON public.course_batches;
CREATE POLICY "course_batches_delete_faculty_or_admin" ON public.course_batches
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );
