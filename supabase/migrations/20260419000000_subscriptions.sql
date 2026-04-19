-- Subscription status and plan enums
create type subscription_status as enum ('active', 'cancelled', 'past_due', 'paused');
create type subscription_plan as enum ('monthly', 'annual');

-- Subscriptions table: one row per photographer
create table subscriptions (
  photographer_id       uuid primary key references photographers(id) on delete cascade,
  lemon_squeezy_subscription_id text unique not null,
  lemon_squeezy_customer_id     text not null,
  status                subscription_status not null,
  plan                  subscription_plan not null,
  price_locked          boolean not null default false,
  current_period_end    timestamptz not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function moddatetime(updated_at);

-- RLS: photographers can only read their own subscription
alter table subscriptions enable row level security;

create policy "photographers can read own subscription"
  on subscriptions for select
  using (photographer_id = auth.uid());

-- Track whether the 7-day trial warning email has been sent
alter table photographers
  add column trial_warning_sent_at timestamptz default null;
