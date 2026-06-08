-- Migration: Checklist Module Schema
-- Adds tables and policies for Checklists, Checklist Items, Peer Evaluators, Pairings, and Evaluations.

-- 1. checklists table
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  is_peer_evaluation_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklists_course_id ON public.checklists(course_id);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_select_course_participants" ON public.checklists
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = checklists.course_id AND cc.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = checklists.course_id AND e.student_id = auth.uid())
  );

CREATE POLICY "checklists_insert_faculty" ON public.checklists
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid())
  );

CREATE POLICY "checklists_update_faculty" ON public.checklists
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = checklists.course_id AND cc.faculty_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = course_id AND cc.faculty_id = auth.uid())
  );

CREATE POLICY "checklists_delete_faculty" ON public.checklists
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_contributors cc WHERE cc.course_id = checklists.course_id AND cc.faculty_id = auth.uid())
  );

-- 2. checklist_items table
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT checklist_items_options_array CHECK (jsonb_typeof(options) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_select" ON public.checklist_items
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND cc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.enrollments e ON e.course_id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "checklist_items_insert" ON public.checklist_items
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "checklist_items_update" ON public.checklist_items
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "checklist_items_delete" ON public.checklist_items
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_items.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

-- 3. peer_evaluators table (approves students as evaluators for a checklist)
CREATE TABLE IF NOT EXISTS public.peer_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (checklist_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_evaluators_checklist ON public.peer_evaluators(checklist_id);

ALTER TABLE public.peer_evaluators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_evaluators_select" ON public.peer_evaluators
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "peer_evaluators_insert" ON public.peer_evaluators
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "peer_evaluators_update" ON public.peer_evaluators
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "peer_evaluators_delete" ON public.peer_evaluators
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluators.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

-- 4. peer_evaluation_pairings table (student requests to evaluate a peer, faculty approves)
CREATE TABLE IF NOT EXISTS public.peer_evaluation_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluatee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (checklist_id, evaluator_id, evaluatee_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_pairings_checklist ON public.peer_evaluation_pairings(checklist_id);

ALTER TABLE public.peer_evaluation_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_pairings_select" ON public.peer_evaluation_pairings
  FOR SELECT
  USING (
    evaluator_id = auth.uid()
    OR evaluatee_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "peer_pairings_insert_evaluator" ON public.peer_evaluation_pairings
  FOR INSERT
  WITH CHECK (
    evaluator_id = auth.uid() 
    AND EXISTS (
      -- Evaluator must be approved
      SELECT 1 FROM public.peer_evaluators pe 
      WHERE pe.checklist_id = checklist_id AND pe.student_id = auth.uid() AND pe.status = 'approved'
    )
  );

CREATE POLICY "peer_pairings_update_faculty" ON public.peer_evaluation_pairings
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND cc.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "peer_pairings_delete" ON public.peer_evaluation_pairings
  FOR DELETE
  USING (
    evaluator_id = auth.uid() -- evaluator can cancel a request
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = peer_evaluation_pairings.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

-- 5. checklist_evaluations table (faculty or peer assessments)
CREATE TABLE IF NOT EXISTS public.checklist_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluatee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('faculty', 'peer')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT checklist_evaluations_answers_object CHECK (jsonb_typeof(answers) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_checklist_evals_checklist ON public.checklist_evaluations(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_evals_evaluatee ON public.checklist_evaluations(evaluatee_id);

ALTER TABLE public.checklist_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_evals_select" ON public.checklist_evaluations
  FOR SELECT
  USING (
    evaluator_id = auth.uid()
    OR evaluatee_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_evaluations.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_evaluations.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

CREATE POLICY "checklist_evals_insert_evaluator" ON public.checklist_evaluations
  FOR INSERT
  WITH CHECK (
    evaluator_id = auth.uid()
    AND (
      -- If faculty evaluation, evaluator must be course faculty/contributor/admin
      (
        evaluation_type = 'faculty' AND (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.checklists cl
            JOIN public.courses c ON c.id = cl.course_id
            WHERE cl.id = checklist_id AND c.faculty_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.checklists cl
            JOIN public.course_contributors cc ON cc.course_id = cl.course_id
            WHERE cl.id = checklist_id AND cc.faculty_id = auth.uid()
          )
        )
      )
      OR 
      -- If peer evaluation, pairing must be approved
      (
        evaluation_type = 'peer' AND EXISTS (
          SELECT 1 FROM public.peer_evaluation_pairings p
          WHERE p.checklist_id = checklist_id AND p.evaluator_id = auth.uid() AND p.evaluatee_id = evaluatee_id AND p.status = 'approved'
        )
      )
    )
  );

CREATE POLICY "checklist_evals_update_evaluator" ON public.checklist_evaluations
  FOR UPDATE
  USING (evaluator_id = auth.uid() AND status = 'draft')
  WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "checklist_evals_delete" ON public.checklist_evaluations
  FOR DELETE
  USING (
    (evaluator_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.courses c ON c.id = cl.course_id
      WHERE cl.id = checklist_evaluations.checklist_id AND c.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.course_contributors cc ON cc.course_id = cl.course_id
      WHERE cl.id = checklist_evaluations.checklist_id AND cc.faculty_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_checklist_evals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklist_evals_updated_at_trigger
BEFORE UPDATE ON public.checklist_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_checklist_evals_updated_at();
