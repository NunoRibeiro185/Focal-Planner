-- Add human-readable names and archival support to package versions.
-- Existing versions are backfilled as "Version 1", "Version 2", etc.

ALTER TABLE package_versions
  ADD COLUMN IF NOT EXISTS version_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing versions
UPDATE package_versions
SET version_name = 'Version ' || version_number
WHERE version_name IS NULL;

-- Enforce NOT NULL and uniqueness after backfill
ALTER TABLE package_versions
  ALTER COLUMN version_name SET NOT NULL;

ALTER TABLE package_versions
  ADD CONSTRAINT package_versions_template_name_unique
  UNIQUE (package_template_id, version_name);
