-- Migration: OSCE Assignments
-- Adds assignment_type column, updates question_type constraint to 'osce', adds image_url column,
-- and ensures a storage bucket for question images exists.

-- 1. Add assignment_type to assignments table
-- Defaults to 'osce'. 'future_type' is a placeholder for a type to be added later.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN assignment_type TEXT NOT NULL DEFAULT 'osce';
  END IF;
END $$;

-- Add a CHECK constraint for allowed assignment types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'assignments_assignment_type_check'
  ) THEN
    ALTER TABLE public.assignments ADD CONSTRAINT assignments_assignment_type_check
      CHECK (assignment_type IN ('osce', 'future_type'));
  END IF;
END $$;

-- 2. Update existing questions to 'osce' question_type (gracefully migrate any old data)
UPDATE public.assignment_questions
SET question_type = 'osce'
WHERE question_type NOT IN ('osce');

-- Drop the old question_type CHECK constraint if it exists
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
    SELECT cc.constraint_name
    FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name = 'assignment_questions'
      AND ccu.column_name = 'question_type'
  LOOP
    EXECUTE 'ALTER TABLE public.assignment_questions DROP CONSTRAINT ' || constraint_rec.constraint_name;
  END LOOP;
END $$;

-- Add the new question_type CHECK constraint (only 'osce' for now)
ALTER TABLE public.assignment_questions ADD CONSTRAINT assignment_questions_question_type_check
  CHECK (question_type IN ('osce'));

-- 3. Add image_url column to assignment_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignment_questions' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.assignment_questions ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- 4. Add score column to submissions if it doesn't exist (for auto-grading)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'score'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN score NUMERIC;
  END IF;
END $$;

-- 5. Ensure the assignment-images storage bucket exists
-- NOTE: This must be run via Supabase Dashboard or the management API.
-- In the Supabase Dashboard, go to Storage > Create Bucket:
--   Bucket name: assignment-images
--   Public: true (so question images can be displayed)
--   File size limit: 5MB
--   Allowed MIME types: image/*

-- If you have access to the storage schema, you can try:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('assignment-images', 'assignment-images', true)
-- ON CONFLICT (id) DO NOTHING;
