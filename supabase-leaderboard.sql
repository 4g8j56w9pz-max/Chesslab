create extension if not exists pgcrypto;

create table if not exists public.pizzeria_leaderboard (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 18),
  score integer not null check (score >= 0),
  highest_tile integer not null check (highest_tile >= 0),
  moves integer not null check (moves > 0),
  achieved_midnight boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pizzeria_leaderboard enable row level security;

drop policy if exists "Scores are readable by everyone" on public.pizzeria_leaderboard;
create policy "Scores are readable by everyone"
  on public.pizzeria_leaderboard
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit a completed score" on public.pizzeria_leaderboard;
create policy "Anyone can submit a completed score"
  on public.pizzeria_leaderboard
  for insert
  to anon
  with check (
    char_length(name) between 1 and 18
    and score >= 0
    and highest_tile >= 0
    and moves > 0
  );

grant select, insert on public.pizzeria_leaderboard to anon;
