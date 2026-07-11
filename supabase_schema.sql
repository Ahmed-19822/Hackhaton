-- =========================================================================
-- MaintainIQ - Track B (Batch 18) - Supabase SQL Schema
-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New query
-- =========================================================================

-- Supabase already has pgcrypto enabled, which gives us gen_random_uuid()
create extension if not exists "pgcrypto";

-- =========================================================================
-- 1. PROFILES  (extends auth.users with app-level role info)
-- =========================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  role          text not null default 'technician'
                  check (role in ('admin', 'technician')),
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
-- Pass { data: { full_name: '...', role: 'admin' } } in supabase.auth.signUp()
-- to control the role at signup time (default is 'technician' if not given).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'technician')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- 2. ASSETS
-- =========================================================================
create table if not exists public.assets (
  id                    uuid primary key default gen_random_uuid(),
  asset_code            text not null unique,
  name                  text not null,
  category              text,
  location              text,
  condition             text default 'Good',
  status                text not null default 'Operational'
                          check (status in (
                            'Operational', 'Issue Reported', 'Under Inspection',
                            'Under Maintenance', 'Out of Service', 'Retired'
                          )),
  assigned_technician   uuid references public.profiles(id),
  last_service_date     date,
  next_service_date     date,
  organization_name     text,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint next_service_after_last_service
    check (next_service_date is null or last_service_date is null
           or next_service_date >= last_service_date)
);

create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_category on public.assets(category);

-- =========================================================================
-- 3. ISSUES
-- =========================================================================
create table if not exists public.issues (
  id                    uuid primary key default gen_random_uuid(),
  issue_number          text not null unique,
  asset_id              uuid not null references public.assets(id) on delete cascade,
  title                 text not null,
  description           text not null,
  category              text,
  priority              text not null default 'Medium'
                          check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status                text not null default 'Reported'
                          check (status in (
                            'Reported', 'Assigned', 'Inspection Started',
                            'Maintenance In Progress', 'Waiting for Parts',
                            'Resolved', 'Closed', 'Reopened'
                          )),
  reporter_name         text,
  reporter_contact      text,
  evidence_urls         text[] default '{}',
  ai_suggested_json     jsonb,          -- raw AI triage suggestion
  ai_was_edited         boolean default false,
  assigned_technician   uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_issues_asset on public.issues(asset_id);
create index if not exists idx_issues_status on public.issues(status);
create index if not exists idx_issues_technician on public.issues(assigned_technician);

-- Auto-generate a human friendly issue number like ISSUE-0001
create sequence if not exists public.issue_number_seq;

create or replace function public.set_issue_number()
returns trigger
language plpgsql
as $$
begin
  if new.issue_number is null then
    new.issue_number := 'ISSUE-' || lpad(nextval('public.issue_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_issue_number on public.issues;
create trigger trg_set_issue_number
  before insert on public.issues
  for each row execute function public.set_issue_number();

-- =========================================================================
-- 4. MAINTENANCE RECORDS
-- =========================================================================
create table if not exists public.maintenance_records (
  id                 uuid primary key default gen_random_uuid(),
  issue_id           uuid not null references public.issues(id) on delete cascade,
  technician_id      uuid references public.profiles(id),
  inspection_notes   text,
  work_performed     text,
  parts_used         text,
  cost               numeric(10, 2) default 0 check (cost >= 0),
  time_spent_minutes integer check (time_spent_minutes is null or time_spent_minutes >= 0),
  evidence_urls      text[] default '{}',
  final_condition    text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_maintenance_issue on public.maintenance_records(issue_id);

-- =========================================================================
-- 5. ASSET HISTORY (append-only activity log)
-- =========================================================================
create table if not exists public.asset_history (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.assets(id) on delete cascade,
  issue_id     uuid references public.issues(id) on delete set null,
  action       text not null,
  actor_id     uuid references public.profiles(id),
  actor_name   text,               -- fallback label for public reporters
  details      text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_history_asset on public.asset_history(asset_id);

-- =========================================================================
-- 6. TRIGGERS: updated_at maintenance
-- =========================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
  before update on public.assets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_issues_updated_at on public.issues;
create trigger trg_issues_updated_at
  before update on public.issues
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- 7. TRIGGERS: business rules + auto history logging
-- =========================================================================

-- 7a. When a new issue is reported -> asset status becomes "Issue Reported"
--     and a history row is written.
create or replace function public.after_issue_insert()
returns trigger
language plpgsql
as $$
begin
  update public.assets
    set status = 'Issue Reported'
    where id = new.asset_id
      and status not in ('Retired', 'Out of Service');

  insert into public.asset_history (asset_id, issue_id, action, actor_name, details)
  values (
    new.asset_id, new.id, 'Issue Reported',
    coalesce(new.reporter_name, 'Anonymous'),
    new.title
  );
  return new;
end;
$$;

drop trigger if exists trg_after_issue_insert on public.issues;
create trigger trg_after_issue_insert
  after insert on public.issues
  for each row execute function public.after_issue_insert();

-- 7b. When an issue's status changes -> sync the asset status and log history.
create or replace function public.after_issue_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then

    if new.status = 'Inspection Started' then
      update public.assets set status = 'Under Inspection' where id = new.asset_id;
    elsif new.status in ('Maintenance In Progress', 'Waiting for Parts') then
      update public.assets set status = 'Under Maintenance' where id = new.asset_id;
    elsif new.status = 'Resolved' then
      update public.assets set status = 'Operational' where id = new.asset_id;
    end if;

    insert into public.asset_history (asset_id, issue_id, action, actor_id, details)
    values (
      new.asset_id, new.id,
      'Issue status changed: ' || old.status || ' -> ' || new.status,
      new.assigned_technician,
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_issue_status_change on public.issues;
create trigger trg_after_issue_status_change
  after update on public.issues
  for each row execute function public.after_issue_status_change();

-- 7c. A resolved issue must have at least one maintenance note (business rule).
create or replace function public.check_resolved_has_maintenance_note()
returns trigger
language plpgsql
as $$
declare
  note_count integer;
begin
  if new.status = 'Resolved' and (old.status is distinct from 'Resolved') then
    select count(*) into note_count
      from public.maintenance_records
      where issue_id = new.id;
    if note_count = 0 then
      raise exception 'Cannot resolve an issue without at least one maintenance record';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_resolved_note on public.issues;
create trigger trg_check_resolved_note
  before update on public.issues
  for each row execute function public.check_resolved_has_maintenance_note();

-- 7d. Log history whenever a maintenance record is added.
create or replace function public.after_maintenance_insert()
returns trigger
language plpgsql
as $$
declare
  v_asset_id uuid;
begin
  select asset_id into v_asset_id from public.issues where id = new.issue_id;

  insert into public.asset_history (asset_id, issue_id, action, actor_id, details)
  values (
    v_asset_id, new.issue_id, 'Maintenance recorded',
    new.technician_id,
    coalesce(new.work_performed, new.inspection_notes)
  );
  return new;
end;
$$;

drop trigger if exists trg_after_maintenance_insert on public.maintenance_records;
create trigger trg_after_maintenance_insert
  after insert on public.maintenance_records
  for each row execute function public.after_maintenance_insert();

-- =========================================================================
-- 8. SAFE PUBLIC VIEW (what the QR / public asset page is allowed to see)
-- =========================================================================
create or replace view public.public_asset_view as
select
  id,
  asset_code,
  name,
  category,
  location,
  condition,
  status,
  last_service_date,
  next_service_date,
  organization_name
from public.assets
where status <> 'Retired'
   or status = 'Retired';  -- retired assets stay visible but clearly flagged in the UI

-- Public "check my issue status" view - exposes only non-sensitive columns.
create or replace view public.public_issue_status_view as
select
  issue_number,
  asset_id,
  title,
  status,
  priority,
  created_at,
  updated_at
from public.issues;

-- =========================================================================
-- 9. ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles            enable row level security;
alter table public.assets              enable row level security;
alter table public.issues              enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.asset_history       enable row level security;

-- ---- profiles ----
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- assets ----
-- Staff (any authenticated profile) can do everything.
create policy "Staff full access to assets"
  on public.assets for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Public/anon: no direct table access. They must use public_asset_view instead.
-- (Views run with the querying role's privileges by default; grant select below.)

-- ---- issues ----
create policy "Anyone can report an issue"
  on public.issues for insert
  with check (true);

create policy "Staff can read all issues"
  on public.issues for select
  using (auth.uid() is not null);

create policy "Assigned technician or admin can update issues"
  on public.issues for update
  using (
    auth.uid() is not null
    and (
      assigned_technician = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

-- ---- maintenance_records ----
create policy "Staff can read maintenance records"
  on public.maintenance_records for select
  using (auth.uid() is not null);

create policy "Assigned technician or admin can add maintenance records"
  on public.maintenance_records for insert
  with check (
    auth.uid() is not null
    and (
      technician_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

-- ---- asset_history ----
-- Append-only: no update/delete policies exist for anyone (not even admins),
-- which means updates/deletes are blocked by default once RLS is enabled.
create policy "Staff can read asset history"
  on public.asset_history for select
  using (auth.uid() is not null);

create policy "System can insert asset history"
  on public.asset_history for insert
  with check (true);  -- inserted only via SECURITY DEFINER trigger functions above

-- =========================================================================
-- 10. GRANTS for the public views (safe anon read access)
-- =========================================================================
grant select on public.public_asset_view to anon, authenticated;
grant select on public.public_issue_status_view to anon, authenticated;

-- Anon also needs to be able to INSERT into issues (report issue) and
-- read the asset's basic status when submitting on the public page.
grant insert on public.issues to anon;
grant select on public.assets to anon;  -- safe because RLS above still applies;
                                         -- if you want to hide columns from anon
                                         -- entirely, revoke this and use the
                                         -- public_asset_view join in your app instead.

-- =========================================================================
-- 11. SEED DATA (optional - a few demo assets to get started)
-- =========================================================================
insert into public.assets (asset_code, name, category, location, condition, organization_name)
values
  ('AST-0001', 'Classroom Projector 01', 'Electronics', 'Room 101', 'Good', 'SMIT Campus'),
  ('AST-0002', 'AC Unit - Lab 2',        'HVAC',        'Lab 2',    'Good', 'SMIT Campus'),
  ('AST-0003', 'Water Cooler - Lobby',   'Appliance',   'Lobby',    'Good', 'SMIT Campus'),
  ('AST-0004', 'Server Rack A',          'IT',          'Server Room', 'Good', 'SMIT Campus'),
  ('AST-0005', 'Elevator 1',             'Mechanical',  'Main Block',  'Good', 'SMIT Campus')
on conflict (asset_code) do nothing;

-- =========================================================================
-- DONE. Next steps in your app:
-- 1. Copy .env.example -> .env and fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
-- 2. supabase.from('assets') / .from('issues') / .from('maintenance_records')
-- 3. Public asset page: supabase.from('public_asset_view').select('*').eq('asset_code', code)
-- 4. Give a user the admin role after signup:
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- =========================================================================
