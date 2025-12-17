-- Remove unused extension from public schema to satisfy linter (extension_in_public)
-- NOTE: Only safe if your project does not use pg_net.
DROP EXTENSION IF EXISTS pg_net;