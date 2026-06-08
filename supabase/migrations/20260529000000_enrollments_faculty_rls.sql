-- Faculty need to be able to insert and delete enrollments for their courses
CREATE POLICY "enrollments_insert_faculty" ON public.enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc
      WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_delete_faculty" ON public.enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.course_contributors cc
      WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid()
    )
  );
