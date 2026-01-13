
-- Fix search_path for security
ALTER FUNCTION get_recurrence_opportunities(INTEGER, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION get_recurrence_stats(INTEGER) SET search_path = public;
