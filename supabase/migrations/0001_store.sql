-- ============================================================================
-- OGN University — Store / digital products
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- ---------------------------------------------------------------- products --
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  subtitle          text,
  description       text,
  long_description  text,
  product_type      text not null default 'audio_album',  -- audio_album | bundle | ebook | video
  price             numeric(10,2) not null default 0,
  compare_at_price  numeric(10,2),                        -- shown struck-through on bundles
  currency          text not null default 'usd',
  front_cover_url   text,
  back_cover_url    text,
  track_count       integer default 0,
  duration_label    text,                                 -- e.g. "2h 39m"
  is_bundle         boolean not null default false,
  is_published      boolean not null default false,
  sort_order        integer not null default 0,
  stripe_price_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Which products a bundle unlocks.
create table if not exists public.bundle_items (
  id          uuid primary key default gen_random_uuid(),
  bundle_id   uuid not null references public.products(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (bundle_id, product_id)
);

-- Individual downloadable files (one row per track).
create table if not exists public.product_files (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  title             text not null,
  track_number      integer,
  bucket            text not null default 'product-audio',
  storage_path      text not null,
  file_size         bigint,
  mime_type         text,
  duration_seconds  integer,
  is_preview        boolean not null default false,       -- free sample, playable pre-purchase
  order_index       integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (bucket, storage_path)
);

-- One row per product a user owns. Buying a bundle writes a row for the bundle
-- AND one for each product inside it, so entitlement checks stay a single query.
create table if not exists public.product_purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  product_id                uuid not null references public.products(id) on delete cascade,
  email                     text,
  amount                    numeric(10,2) default 0,
  currency                  text default 'usd',
  status                    text not null default 'completed',
  source                    text not null default 'stripe',   -- stripe | bundle | gift | admin
  stripe_session_id         text,
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Audit trail — who downloaded what, when.
create table if not exists public.product_download_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  product_id       uuid references public.products(id) on delete set null,
  product_file_id  uuid references public.product_files(id) on delete set null,
  downloaded_at    timestamptz not null default now()
);

create index if not exists idx_product_files_product   on public.product_files(product_id, order_index);
create index if not exists idx_purchases_user          on public.product_purchases(user_id);
create index if not exists idx_purchases_session       on public.product_purchases(stripe_session_id);
create index if not exists idx_bundle_items_bundle     on public.bundle_items(bundle_id);
create index if not exists idx_download_logs_user      on public.product_download_logs(user_id, downloaded_at desc);

-- ------------------------------------------------------------------- RLS ---
alter table public.products              enable row level security;
alter table public.bundle_items          enable row level security;
alter table public.product_files         enable row level security;
alter table public.product_purchases     enable row level security;
alter table public.product_download_logs enable row level security;

-- Helper: is the current user staff?
create or replace function public.is_ogn_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'prophet', 'teacher', 'minister')
  );
$$;

-- Anyone may browse published products; staff see everything.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (is_published or public.is_ogn_staff());

drop policy if exists products_staff_write on public.products;
create policy products_staff_write on public.products
  for all using (public.is_ogn_staff()) with check (public.is_ogn_staff());

drop policy if exists bundle_items_read on public.bundle_items;
create policy bundle_items_read on public.bundle_items for select using (true);

drop policy if exists bundle_items_staff_write on public.bundle_items;
create policy bundle_items_staff_write on public.bundle_items
  for all using (public.is_ogn_staff()) with check (public.is_ogn_staff());

-- Track listings are visible to everyone (so the product page can show the
-- tracklist), but the files themselves live in a PRIVATE bucket. The only way
-- to get bytes out is /api/download, which verifies ownership server-side.
drop policy if exists product_files_read on public.product_files;
create policy product_files_read on public.product_files for select using (true);

drop policy if exists product_files_staff_write on public.product_files;
create policy product_files_staff_write on public.product_files
  for all using (public.is_ogn_staff()) with check (public.is_ogn_staff());

-- Users see only their own purchases. Writes happen through the Stripe webhook
-- using the service role key, which bypasses RLS entirely.
drop policy if exists purchases_own_read on public.product_purchases;
create policy purchases_own_read on public.product_purchases
  for select using (user_id = auth.uid() or public.is_ogn_staff());

drop policy if exists download_logs_own_read on public.product_download_logs;
create policy download_logs_own_read on public.product_download_logs
  for select using (user_id = auth.uid() or public.is_ogn_staff());

-- --------------------------------------------------------- updated_at ------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
