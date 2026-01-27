CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extension out of public schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;