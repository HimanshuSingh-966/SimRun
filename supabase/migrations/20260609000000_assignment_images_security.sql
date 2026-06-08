-- ============================================
-- Security Audit Remediation Migration
-- Fixes: Unsecured assignment-images bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-images', 
  'assignment-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Allow anyone to read assignment-images
DROP POLICY IF EXISTS "assignment_images_read" ON storage.objects;
CREATE POLICY "assignment_images_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'assignment-images');

-- Allow authenticated faculty to upload
DROP POLICY IF EXISTS "assignment_images_insert" ON storage.objects;
CREATE POLICY "assignment_images_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-images'
    AND (
      public.is_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'faculty'
            AND p.status = 'approved'
        ) AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id::text = (storage.foldername(name))[2]
              AND c.faculty_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.course_contributors cc
            WHERE cc.course_id::text = (storage.foldername(name))[2]
              AND cc.faculty_id = auth.uid()
          )
        )
      )
    )
  );

-- Faculty can update
DROP POLICY IF EXISTS "assignment_images_update" ON storage.objects;
CREATE POLICY "assignment_images_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assignment-images'
    AND (
      public.is_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'faculty'
            AND p.status = 'approved'
        ) AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id::text = (storage.foldername(name))[2]
              AND c.faculty_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.course_contributors cc
            WHERE cc.course_id::text = (storage.foldername(name))[2]
              AND cc.faculty_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-images'
    AND (
      public.is_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'faculty'
            AND p.status = 'approved'
        ) AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id::text = (storage.foldername(name))[2]
              AND c.faculty_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.course_contributors cc
            WHERE cc.course_id::text = (storage.foldername(name))[2]
              AND cc.faculty_id = auth.uid()
          )
        )
      )
    )
  );

-- Faculty can delete
DROP POLICY IF EXISTS "assignment_images_delete" ON storage.objects;
CREATE POLICY "assignment_images_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assignment-images'
    AND (
      public.is_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'faculty'
            AND p.status = 'approved'
        ) AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id::text = (storage.foldername(name))[2]
              AND c.faculty_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.course_contributors cc
            WHERE cc.course_id::text = (storage.foldername(name))[2]
              AND cc.faculty_id = auth.uid()
          )
        )
      )
    )
  );
