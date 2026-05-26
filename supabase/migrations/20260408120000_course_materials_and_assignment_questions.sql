-- Course materials (Coursera-style readings, video links, resources)
-- Assignment questions (MCQ, MSQ, short/long answer) per assignment

CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'reading'
    CHECK (material_type IN ('reading', 'video', 'link', 'file')),
  content TEXT,
  external_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_materials_select" ON public.course_materials;
CREATE POLICY "course_materials_select" ON public.course_materials
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_materials.course_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_insert" ON public.course_materials;
CREATE POLICY "course_materials_insert" ON public.course_materials
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_update" ON public.course_materials;
CREATE POLICY "course_materials_update" ON public.course_materials
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_delete" ON public.course_materials;
CREATE POLICY "course_materials_delete" ON public.course_materials
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

-- Questions linked to an assignment (mixed question types)
CREATE TABLE IF NOT EXISTS public.assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL
    CHECK (question_type IN ('mcq', 'msq', 'short_answer', 'long_answer')),
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_indices JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_answer TEXT,
  points NUMERIC NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT assignment_questions_choices_array CHECK (jsonb_typeof(choices) = 'array'),
  CONSTRAINT assignment_questions_correct_array CHECK (jsonb_typeof(correct_indices) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment_id ON public.assignment_questions(assignment_id);

ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_questions_select" ON public.assignment_questions;
CREATE POLICY "assignment_questions_select" ON public.assignment_questions
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.enrollments e ON e.course_id = a.course_id AND e.student_id = auth.uid()
      WHERE a.id = assignment_questions.assignment_id
    )
  );

DROP POLICY IF EXISTS "assignment_questions_insert" ON public.assignment_questions;
CREATE POLICY "assignment_questions_insert" ON public.assignment_questions
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignment_questions_update" ON public.assignment_questions;
CREATE POLICY "assignment_questions_update" ON public.assignment_questions
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignment_questions_delete" ON public.assignment_questions;
CREATE POLICY "assignment_questions_delete" ON public.assignment_questions
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
  );
