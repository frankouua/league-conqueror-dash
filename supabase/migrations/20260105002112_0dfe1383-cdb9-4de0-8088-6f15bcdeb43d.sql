-- Drop old constraint and add new one with all notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'goal_individual',
  'goal_team',
  'goal_near',
  'goal_reminder',
  'milestone',
  'achievement',
  'stale_lead',
  'seller_critical',
  'seller_warning',
  'admin_announcement',
  'new_referral',
  'lead_assigned',
  'lead_milestone',
  'lead_alert',
  'lead_status_update',
  'lead_reminder',
  'lead_reminder_2h',
  'lead_reminder_24h',
  'morning_summary',
  'weekly_report'
]::text[]));