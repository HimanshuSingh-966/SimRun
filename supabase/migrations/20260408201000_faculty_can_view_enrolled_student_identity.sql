-- Allow faculty to read identity details of students enrolled in their own courses.

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = profiles.id
        AND c.faculty_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_profiles_select_own_or_admin" ON public.student_profiles;
CREATE POLICY "student_profiles_select_own_or_admin" ON public.student_profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = student_profiles.id
        AND c.faculty_id = auth.uid()
    )
  );
