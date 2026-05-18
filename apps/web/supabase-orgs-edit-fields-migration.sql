-- Migration: add `description` and `image_url` columns to `organizations`.
--
-- These are required by the org edit drawer on /team and by the team
-- settings tab. Both columns are optional (nullable text). Safe to run
-- multiple times.

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url   text;

COMMIT;
