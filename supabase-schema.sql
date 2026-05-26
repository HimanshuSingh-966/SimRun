-- ============================================
-- NurseSim LMS - Supabase Database Schema
-- Run this in your Supabase SQL Editor (new project / greenfield).
-- For existing databases, prefer:
--   supabase/migrations/20250407120000_schema_stabilization.sql
-- ============================================

-- 1. Batches (must be created first, referenced by student_profiles)
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (extends auth.users with role & approval status)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Student-specific profile details
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  reg_number TEXT UNIQUE,
  date_of_birth DATE,
  gender TEXT,
  batch_id UUID REFERENCES public.batches(id),
  semester TEXT
);

-- 4. Faculty-specific profile details
CREATE TABLE public.faculty_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  designation TEXT
);

-- 5. Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  faculty_id UUID REFERENCES public.profiles(id),
  department TEXT,
  total_lessons INT DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id),
  course_id UUID REFERENCES public.courses(id),
  progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- 7. Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id),
  student_id UUID REFERENCES public.profiles(id),
  file_url TEXT,
  grade NUMERIC,
  feedback TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- FUNCTIONS & AUTH TRIGGER
-- (profiles row required by AuthContext; avoids client-side insert)
-- ============================================

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- ============================================
-- INDEXES (frontend query paths)
-- ============================================

CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_status ON public.profiles (status);
CREATE INDEX idx_profiles_role_status ON public.profiles (role, status);
CREATE INDEX idx_student_profiles_batch_id ON public.student_profiles (batch_id);
CREATE INDEX idx_batches_name ON public.batches (name);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- profiles
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

-- batches (anon must read for unauthenticated registration page)
CREATE POLICY "batches_select_all" ON public.batches
  FOR SELECT
  USING (true);

CREATE POLICY "batches_all_admin" ON public.batches
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- courses
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
-- SEED: Initial Admin Account
-- ============================================
-- IMPORTANT: After creating your first admin via Supabase Auth dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Enter admin email & password
-- 3. Then run this, replacing 'YOUR_ADMIN_USER_ID' with the UUID from step 2:
--
-- INSERT INTO public.profiles (id, full_name, email, role, status)
-- VALUES ('YOUR_ADMIN_USER_ID', 'Dr. Sarah Chen', 'admin@nursesim.edu', 'admin', 'approved');


-- ============================================
-- SEED: Sample Batches
-- ============================================
INSERT INTO public.batches (name, year) VALUES
  ('Clinical Batch 2024', 2024),
  ('Clinical Batch 2025', 2025),
  ('Nursing Foundation 2024', 2024),
  ('Nursing Foundation 2025', 2025),
  ('Pediatric Specialization 2025', 2025);
