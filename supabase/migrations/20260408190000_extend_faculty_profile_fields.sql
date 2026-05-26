-- Extend faculty profile details for richer Faculty Profile page

ALTER TABLE public.faculty_profiles
ADD COLUMN IF NOT EXISTS employee_id TEXT;

ALTER TABLE public.faculty_profiles
ADD COLUMN IF NOT EXISTS bio TEXT;
