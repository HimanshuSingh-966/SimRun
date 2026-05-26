-- Extend student_profiles with university hierarchy fields used in the UI.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS faculty TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT;

