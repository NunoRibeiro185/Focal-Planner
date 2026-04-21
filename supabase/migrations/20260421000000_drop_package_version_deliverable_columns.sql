-- Remove legacy hardcoded deliverable columns from package_versions.
-- Deliverables are now managed via custom_fields.
alter table public.package_versions
  drop column if exists edited_photos_count,
  drop column if exists wedding_album,
  drop column if exists film_rolls_count,
  drop column if exists video,
  drop column if exists short_clips,
  drop column if exists second_shooter;
