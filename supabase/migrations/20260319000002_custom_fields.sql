-- ─────────────────────────────────────────────────────────────
-- Custom field definitions (photographer-scoped, soft-deletable)
-- ─────────────────────────────────────────────────────────────
create table public.custom_field_definitions (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  label           text not null,
  field_type      text not null check (field_type in ('checkbox', 'text')),
  sort_order      integer not null default 0,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index on public.custom_field_definitions (photographer_id);

alter table public.custom_field_definitions enable row level security;

create policy "custom_field_definitions: own rows"
  on public.custom_field_definitions for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Custom field value snapshots (immutable, one row per field per version)
-- ─────────────────────────────────────────────────────────────
create table public.package_version_custom_fields (
  id                  uuid primary key default gen_random_uuid(),
  package_version_id  uuid not null references public.package_versions (id) on delete cascade,
  field_definition_id uuid not null references public.custom_field_definitions (id) on delete cascade,
  photographer_id     uuid not null references public.photographers (id) on delete cascade,
  value_text          text,
  value_bool          boolean,
  unique (package_version_id, field_definition_id)
);

create index on public.package_version_custom_fields (package_version_id);

alter table public.package_version_custom_fields enable row level security;

create policy "package_version_custom_fields: own rows"
  on public.package_version_custom_fields for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
