-- Remove old check constraint and add new one with stale_lead type
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY['goal_individual'::text, 'goal_team'::text, 'milestone'::text, 'achievement'::text, 'stale_lead'::text]));