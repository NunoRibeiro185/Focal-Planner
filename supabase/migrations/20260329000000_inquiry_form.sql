-- ─────────────────────────────────────────────────────────────
-- Step 1 of 2: Extend lead_source enum with 'inquiry_form'.
--
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction
-- as a table that references the new value. This migration runs
-- first (in its own transaction) so the next migration can use
-- the new value as a column default.
-- ─────────────────────────────────────────────────────────────

alter type public.lead_source add value if not exists 'inquiry_form';
