-- ============================================
-- Security Hardening Migration
-- ============================================
-- Fixes critical drift between supabase-schema.sql and the migration chain.

-- ---------------------------------------------------------------------------
-- 1) Harden is_admin() to require status = 'approved'
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
      AND p.status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Block 'admin' from signup metadata in handle_new_user()
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
    -- Never accept 'admin' from user-supplied metadata
    CASE
      WHEN r IN ('student', 'faculty') THEN r
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

-- ---------------------------------------------------------------------------
-- 3) Add protect_profile_columns() trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Check if the caller (auth.uid()) is an approved admin
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'approved'
  ) INTO caller_is_admin;

  -- If not admin, silently revert protected columns to their old values
  IF NOT caller_is_admin THEN
    NEW.role   := OLD.role;
    NEW.status := OLD.status;
    NEW.email  := OLD.email;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- 4) Replace broad profile read with scoped read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT
  USING (
    -- 1. Read your own profile
    auth.uid() = id
    -- 2. Admin reads all
    OR public.is_admin()
    -- 3. Faculty reads profiles of enrolled students
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.enrollments e ON e.course_id = c.id
        WHERE (c.faculty_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = c.id AND cc.faculty_id = auth.uid()
        ))
        AND e.student_id = profiles.id
      )
    )
    -- 4. Faculty reads profiles of other contributors/owners of their courses
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.courses c
        LEFT JOIN public.course_contributors cc ON cc.course_id = c.id
        WHERE (c.faculty_id = auth.uid() OR cc.faculty_id = auth.uid())
        AND (profiles.id = c.faculty_id OR profiles.id IN (SELECT faculty_id FROM public.course_contributors WHERE course_id = c.id))
      )
    )
    -- 5. Authenticated users can read faculty profiles (for contributor search)
    OR (auth.role() = 'authenticated' AND role = 'faculty')
  );

-- ---------------------------------------------------------------------------
-- 5) Tighten enrollments insert (block student self-enrollment)
-- ---------------------------------------------------------------------------
-- Drop the old permissive policy
DROP POLICY IF EXISTS "enrollments_insert_self" ON public.enrollments;
-- Drop the faculty duplicate policy (we will consolidate)
DROP POLICY IF EXISTS "enrollments_insert_faculty" ON public.enrollments;

CREATE POLICY "enrollments_insert" ON public.enrollments
  FOR INSERT
  WITH CHECK (
    -- Admin can enroll anyone
    public.is_admin()
    -- Course owner can enroll students
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    -- Course contributors can also enroll students
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc
      WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

-- Note: "enrollments_delete_faculty" remains as it was defined in 20260529000000_enrollments_faculty_rls.sql
-- Note: "enrollments_delete_self_or_admin" remains to allow students to drop courses.
