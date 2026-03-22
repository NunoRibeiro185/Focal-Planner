-- Add optional description to package version snapshots
alter table public.package_versions
  add column description text;
