-- ============================================================
-- Expenses Feature
-- ============================================================
-- Adds an expenses table for tracking photographer and
-- client-paid costs, both general and booking-linked.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────

create type public.expense_category as enum (
  'equipment',
  'travel',
  'accommodation',
  'food',
  'software_tools',
  'film',
  'second_shooter',
  'other'
);

create type public.expense_paid_by as enum (
  'photographer',
  'client'
);

-- ─────────────────────────────────────────────────────────────
-- 2. Expenses table
-- ─────────────────────────────────────────────────────────────

create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  photographer_id  uuid not null references public.photographers(id) on delete cascade,
  -- null = general expense (not linked to a booking)
  booking_id       uuid references public.bookings(id) on delete set null,
  category         public.expense_category not null,
  description      text not null,
  -- VAT-inclusive amount, always in photographer's default currency
  amount           numeric(10, 2) not null check (amount >= 0),
  currency         text not null,
  expense_date     date not null,
  -- User-entered VAT percentage (e.g. 23 means 23%). Null = no VAT tracking.
  vat_percentage   numeric(5, 2) check (vat_percentage >= 0 and vat_percentage <= 100),
  paid_by          public.expense_paid_by not null default 'photographer',
  -- Only meaningful when paid_by = 'client'. Flipped by markExpenseReimbursed.
  reimbursed       boolean not null default false,
  -- True for auto-created expenses (e.g. 2nd shooter fee). Read-only in UI.
  auto_generated   boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on public.expenses (photographer_id);
create index on public.expenses (booking_id) where booking_id is not null;
create index on public.expenses (expense_date);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.expenses enable row level security;

-- Photographers manage only their own expenses
create policy "expenses: own rows"
  on public.expenses for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
