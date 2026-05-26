-- Allow audio as a distinct material_type (video already existed in schema)
ALTER TABLE public.course_materials DROP CONSTRAINT IF EXISTS course_materials_material_type_check;
ALTER TABLE public.course_materials ADD CONSTRAINT course_materials_material_type_check
  CHECK (material_type IN ('reading', 'video', 'link', 'file', 'audio'));
