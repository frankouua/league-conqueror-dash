-- Attempt to relocate pg_net by re-creating it in a dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- If pg_net is unused, it is safe to recreate it in a non-public schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
