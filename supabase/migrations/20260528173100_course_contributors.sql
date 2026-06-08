-- 1. Create course_contributors table
CREATE TABLE IF NOT EXISTS public.course_contributors (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (course_id, faculty_id)
);

CREATE INDEX IF NOT EXISTS idx_course_contributors_course_id ON public.course_contributors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_contributors_faculty_id ON public.course_contributors(faculty_id);

ALTER TABLE public.course_contributors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles (needed for searching faculty to add as contributors)
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins and the course owner can insert/delete contributors
CREATE POLICY "course_contributors_insert" ON public.course_contributors
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "course_contributors_delete" ON public.course_contributors
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

-- Admins, the course owner, and contributors can select
CREATE POLICY "course_contributors_select" ON public.course_contributors
  FOR SELECT
  USING (
    public.is_admin()
    OR faculty_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );


-- 2. Update courses policies (allow contributors to update)
DROP POLICY IF EXISTS "courses_update_faculty_owner_or_admin" ON public.courses;
CREATE POLICY "courses_update_faculty_owner_or_admin" ON public.courses
  FOR UPDATE
  USING (
    faculty_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = id AND cc.faculty_id = auth.uid())
  )
  WITH CHECK (
    faculty_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = id AND cc.faculty_id = auth.uid())
  );

-- 3. Update course_materials policies
DROP POLICY IF EXISTS "course_materials_select" ON public.course_materials;
CREATE POLICY "course_materials_select" ON public.course_materials
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e WHERE e.course_id = course_materials.course_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_insert" ON public.course_materials;
CREATE POLICY "course_materials_insert" ON public.course_materials
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_update" ON public.course_materials;
CREATE POLICY "course_materials_update" ON public.course_materials
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_materials_delete" ON public.course_materials;
CREATE POLICY "course_materials_delete" ON public.course_materials
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

-- 4. Update assignments policies
DROP POLICY IF EXISTS "assignments_select_enrolled_faculty_admin" ON public.assignments;
CREATE POLICY "assignments_select_enrolled_faculty_admin" ON public.assignments
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = assignments.course_id AND cc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_insert_faculty_or_admin" ON public.assignments;
CREATE POLICY "assignments_insert_faculty_or_admin" ON public.assignments
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_update_faculty_or_admin" ON public.assignments;
CREATE POLICY "assignments_update_faculty_or_admin" ON public.assignments
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_delete_faculty_or_admin" ON public.assignments;
CREATE POLICY "assignments_delete_faculty_or_admin" ON public.assignments
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

-- 5. Update assignment_questions policies
DROP POLICY IF EXISTS "assignment_questions_select" ON public.assignment_questions;
CREATE POLICY "assignment_questions_select" ON public.assignment_questions
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND cc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.enrollments e ON e.course_id = a.course_id AND e.student_id = auth.uid()
      WHERE a.id = assignment_questions.assignment_id
    )
  );

DROP POLICY IF EXISTS "assignment_questions_insert" ON public.assignment_questions;
CREATE POLICY "assignment_questions_insert" ON public.assignment_questions
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignment_questions_update" ON public.assignment_questions;
CREATE POLICY "assignment_questions_update" ON public.assignment_questions
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignment_questions_delete" ON public.assignment_questions;
CREATE POLICY "assignment_questions_delete" ON public.assignment_questions
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_questions.assignment_id AND cc.faculty_id = auth.uid()
    )
  );

-- 6. Update submissions policies
DROP POLICY IF EXISTS "submissions_select_student_faculty_admin" ON public.submissions;
CREATE POLICY "submissions_select_student_faculty_admin" ON public.submissions
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = submissions.assignment_id AND cc.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "submissions_update_student_or_faculty_admin" ON public.submissions;
CREATE POLICY "submissions_update_student_or_faculty_admin" ON public.submissions
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments a JOIN public.course_contributors cc ON cc.course_id = a.course_id
      WHERE a.id = assignment_id AND cc.faculty_id = auth.uid()
    )
  );

-- 7. Update enrollments policies
DROP POLICY IF EXISTS "enrollments_select_student_faculty_admin" ON public.enrollments;
CREATE POLICY "enrollments_select_student_faculty_admin" ON public.enrollments
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );
