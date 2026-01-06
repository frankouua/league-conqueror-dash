-- Add missing notification types to the check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'goal_individual'::text,
  'goal_team'::text,
  'goal_near'::text,
  'goal_reminder'::text,
  'milestone'::text,
  'achievement'::text,
  'stale_lead'::text,
  'seller_critical'::text,
  'seller_warning'::text,
  'admin_announcement'::text,
  'new_referral'::text,
  'lead_assigned'::text,
  'lead_milestone'::text,
  'lead_alert'::text,
  'lead_status_update'::text,
  'lead_reminder'::text,
  'lead_reminder_2h'::text,
  'lead_reminder_24h'::text,
  'morning_summary'::text,
  'weekly_report'::text,
  'user_approval'::text,
  'campaign_suggestion'::text
]));