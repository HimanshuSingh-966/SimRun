-- Structured course overview to support Figma-like Course Details section
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_overview JSONB NOT NULL DEFAULT '{}'::jsonb;
