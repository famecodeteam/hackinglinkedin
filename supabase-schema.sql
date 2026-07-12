-- LinkedIn Content System - Supabase schema
-- Run this once in the Supabase SQL editor.
-- Each table stores one item per row as a JSON blob (so the app's data shape is preserved).

create table if not exists ideas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists creators (
  handle text primary key,
  data jsonb not null
);

create table if not exists inspiration (
  id text primary key,
  data jsonb not null
);

create table if not exists photos (
  id text primary key,
  data jsonb not null
);

-- Single-user personal tool: let the anon key read/write.
-- (If you ever want to lock it to a login, we swap these for auth-based policies.)
alter table ideas       enable row level security;
alter table creators    enable row level security;
alter table inspiration enable row level security;
alter table photos      enable row level security;

create policy "anon full access - ideas"       on ideas       for all to anon, authenticated using (true) with check (true);
create policy "anon full access - creators"    on creators    for all to anon, authenticated using (true) with check (true);
create policy "anon full access - inspiration" on inspiration for all to anon, authenticated using (true) with check (true);
create policy "anon full access - photos"      on photos      for all to anon, authenticated using (true) with check (true);
