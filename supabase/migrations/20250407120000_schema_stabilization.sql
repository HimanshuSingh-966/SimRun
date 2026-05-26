-- ============================================
-- NurseSim LMS — Schema stabilization (non-destructive)
-- Run once in Supabase SQL Editor on an existing project.
-- Idempotent: safe to re-run.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1) Helper: admin check without RLS recursion
-- SECURITY DEFINER reads profiles as the function owner (bypasses RLS).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Auth trigger: provision profiles row (matches AuthContext / signUp flow)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  r text := meta->>'role';
  fn text := NULLIF(trim(COALESCE(meta->>'full_name', '')), '');
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(fn, split_part(COALESCE(NEW.email, ''), '@', 1), 'User'),
    COALESCE(NEW.email, ''),
    CASE
      WHEN r IN ('student', 'faculty', 'admin') THEN r
      ELSE 'student'
    END,
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3) Backfill: auth users missing a profiles row (fixes broken accounts)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, email, role, status)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    split_part(COALESCE(u.email, ''), '@', 1),
    'User'
  ),
  COALESCE(u.email, ''),
  CASE
    WHEN (u.raw_user_meta_data->>'role') IN ('student', 'faculty', 'admin')
      THEN (u.raw_user_meta_data->>'role')::text
    ELSE 'student'
  END,
  'pending'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) Indexes (query paths used by the frontend)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles (role, status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_batch_id ON public.student_profiles (batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_name ON public.batches (name);

-- ---------------------------------------------------------------------------
-- 5) RLS policies — drop old names, recreate with is_admin()
-- ---------------------------------------------------------------------------

-- Stabilized policy names (drop if re-running this migration)
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

DROP POLICY IF EXISTS "student_profiles_select_own_or_admin" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_insert_own" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_update_own_or_admin" ON public.student_profiles;

DROP POLICY IF EXISTS "faculty_profiles_select_own_or_admin" ON public.faculty_profiles;
DROP POLICY IF EXISTS "faculty_profiles_insert_own" ON public.faculty_profiles;
DROP POLICY IF EXISTS "faculty_profiles_update_own_or_admin" ON public.faculty_profiles;

DROP POLICY IF EXISTS "batches_select_all" ON public.batches;
DROP POLICY IF EXISTS "batches_all_admin" ON public.batches;

DROP POLICY IF EXISTS "courses_select_catalog_or_owner_or_admin" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_faculty_or_admin" ON public.courses;
DROP POLICY IF EXISTS "courses_update_faculty_owner_or_admin" ON public.courses;
DROP POLICY IF EXISTS "courses_delete_faculty_owner_or_admin" ON public.courses;

DROP POLICY IF EXISTS "enrollments_select_student_faculty_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_self" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_self_or_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_self_or_admin" ON public.enrollments;

DROP POLICY IF EXISTS "assignments_select_enrolled_faculty_admin" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert_faculty_or_admin" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_faculty_or_admin" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete_faculty_or_admin" ON public.assignments;

DROP POLICY IF EXISTS "submissions_select_student_faculty_admin" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_own" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_student_or_faculty_admin" ON public.submissions;
DROP POLICY IF EXISTS "submissions_delete_own_or_admin" ON public.submissions;

-- profiles (legacy policy names from older schema file)
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- student_profiles
DROP POLICY IF EXISTS "Students manage own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins read student profiles" ON public.student_profiles;

CREATE POLICY "student_profiles_select_own_or_admin" ON public.student_profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "student_profiles_insert_own" ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "student_profiles_update_own_or_admin" ON public.student_profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- faculty_profiles
DROP POLICY IF EXISTS "Faculty manage own faculty profile" ON public.faculty_profiles;
DROP POLICY IF EXISTS "Admins read faculty profiles" ON public.faculty_profiles;

CREATE POLICY "faculty_profiles_select_own_or_admin" ON public.faculty_profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "faculty_profiles_insert_own" ON public.faculty_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "faculty_profiles_update_own_or_admin" ON public.faculty_profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- batches
DROP POLICY IF EXISTS "Anyone can read batches" ON public.batches;
DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;

CREATE POLICY "batches_select_all" ON public.batches
  FOR SELECT
  USING (true);

CREATE POLICY "batches_all_admin" ON public.batches
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- courses
DROP POLICY IF EXISTS "View active courses" ON public.courses;
DROP POLICY IF EXISTS "Faculty manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins manage all courses" ON public.courses;

CREATE POLICY "courses_select_catalog_or_owner_or_admin" ON public.courses
  FOR SELECT
  USING (
    status = 'active'
    OR faculty_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "courses_insert_faculty_or_admin" ON public.courses
  FOR INSERT
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "courses_update_faculty_owner_or_admin" ON public.courses
  FOR UPDATE
  USING (faculty_id = auth.uid() OR public.is_admin())
  WITH CHECK (faculty_id = auth.uid() OR public.is_admin());

CREATE POLICY "courses_delete_faculty_owner_or_admin" ON public.courses
  FOR DELETE
  USING (faculty_id = auth.uid() OR public.is_admin());

-- enrollments
DROP POLICY IF EXISTS "Students own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can enroll" ON public.enrollments;
DROP POLICY IF EXISTS "Faculty see course enrollments" ON public.enrollments;

CREATE POLICY "enrollments_select_student_faculty_admin" ON public.enrollments
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_insert_self" ON public.enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "enrollments_update_self_or_admin" ON public.enrollments
  FOR UPDATE
  USING (student_id = auth.uid() OR public.is_admin())
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "enrollments_delete_self_or_admin" ON public.enrollments
  FOR DELETE
  USING (student_id = auth.uid() OR public.is_admin());

-- assignments
DROP POLICY IF EXISTS "View course assignments" ON public.assignments;
DROP POLICY IF EXISTS "Faculty manage assignments" ON public.assignments;

CREATE POLICY "assignments_select_enrolled_faculty_admin" ON public.assignments
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = assignments.course_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "assignments_insert_faculty_or_admin" ON public.assignments
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "assignments_update_faculty_or_admin" ON public.assignments
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

CREATE POLICY "assignments_delete_faculty_or_admin" ON public.assignments
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
  );

-- submissions
DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty view submissions" ON public.submissions;

CREATE POLICY "submissions_select_student_faculty_admin" ON public.submissions
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "submissions_insert_own" ON public.submissions
  FOR INSERT
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "submissions_update_student_or_faculty_admin" ON public.submissions
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "submissions_delete_own_or_admin" ON public.submissions
  FOR DELETE
  USING (student_id = auth.uid() OR public.is_admin());

-- ============================================
-- Done
-- ============================================
