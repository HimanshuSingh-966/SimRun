-- Auto-notifications for support tickets:
-- 1) When a new ticket is raised -> notify all admins.
-- 2) When admin updates ticket status -> notify the ticket owner.

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify every admin
  INSERT INTO public.notifications (user_id, title, body, category, link_url)
  SELECT
    p.id,
    'New support ticket',
    CONCAT('[', NEW.user_role, '] ', NEW.subject),
    'support',
    '/admin/help'
  FROM public.profiles p
  WHERE p.role = 'admin';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_on_new_ticket() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_support_ticket_notify_admins ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_notify_admins
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE PROCEDURE public.notify_admins_on_new_ticket();

CREATE OR REPLACE FUNCTION public.notify_user_on_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep updated_at in sync (also helps admin sorting)
  NEW.updated_at := now();

  -- Only notify when status actually changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, category, link_url)
    VALUES (
      NEW.user_id,
      'Support ticket updated',
      CONCAT('Status changed to ', replace(NEW.status, '_', ' '), ': ', NEW.subject),
      'support',
      CASE
        WHEN NEW.user_role = 'student' THEN '/student/help'
        ELSE '/faculty/help'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user_on_ticket_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_support_ticket_notify_user ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_notify_user
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE PROCEDURE public.notify_user_on_ticket_status_change();

