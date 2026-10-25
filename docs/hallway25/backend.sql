-- Hallway 25 only. No accounts, IP addresses, secrets, or private family data.
-- Applied after confirming this dedicated project's public schema was empty.
begin;
create schema hallway25;
revoke all on schema hallway25 from public, anon, authenticated;

create table public.hallway25_scores (
  run_id uuid primary key,
  nickname text not null,
  encounters integer not null,
  health integer not null,
  outcome text not null,
  submitted_at timestamptz not null default clock_timestamp(),
  constraint hallway25_uuid_v4 check (run_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  constraint hallway25_nickname check (char_length(nickname) between 2 and 20 and nickname ~ '^[A-Za-z0-9 _-]+$' and nickname = btrim(nickname) and nickname not like '%  %'),
  constraint hallway25_stats check (encounters between 0 and 25 and health in (0,10,25,50,75,100) and ((outcome = 'won' and encounters = 25 and health > 0) or (outcome = 'lost' and encounters between 0 and 24)))
);
comment on table public.hallway25_scores is 'Public casual Hallway 25 scores. Nicknames are not authenticated identities. run_id is a random idempotency identifier, not an account identifier.';
alter table public.hallway25_scores enable row level security;
revoke all on table public.hallway25_scores from public, anon, authenticated;
grant select on table public.hallway25_scores to anon;
grant insert (run_id,nickname,encounters,health,outcome) on public.hallway25_scores to anon;
create policy hallway25_public_read on public.hallway25_scores for select to anon using (true);
create policy hallway25_valid_submission on public.hallway25_scores for insert to anon with check (
  char_length(nickname) between 2 and 20 and nickname ~ '^[A-Za-z0-9 _-]+$'
  and nickname = btrim(nickname) and nickname not like '%  %'
  and encounters between 0 and 25 and health in (0,10,25,50,75,100)
  and ((outcome = 'won' and encounters = 25 and health > 0) or (outcome = 'lost' and encounters between 0 and 24))
);
create index hallway25_submitted_at_idx on public.hallway25_scores (submitted_at);
create index hallway25_best_nickname_idx on public.hallway25_scores ((lower(nickname collate "C")),encounters desc,health desc,submitted_at,run_id);

-- Invoker trigger uses exactly the public score SELECT permission; no RLS bypass.
-- Serializes new inserts so burst/storage limits cannot be raced by concurrent requests.
create function hallway25.guard_score_insert() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  perform pg_advisory_xact_lock(25425, 1);
  if exists (select 1 from public.hallway25_scores s where s.run_id = new.run_id) then
    return new;
  end if;
  if (select count(*) from public.hallway25_scores) >= 10000 then
    raise sqlstate 'PT503' using message = 'This leaderboard is full. Your game still works.';
  end if;
  if (select count(*) from public.hallway25_scores s where s.submitted_at > clock_timestamp() - interval '1 minute') >= 60 then
    raise sqlstate 'PT429' using message = 'Too many scores just now. Please try again in a minute.';
  end if;
  return new;
end;
$$;
revoke all on function hallway25.guard_score_insert() from public, anon, authenticated;
create trigger hallway25_guard_score_insert before insert on public.hallway25_scores
for each row execute function hallway25.guard_score_insert();

create function public.hallway25_submit_score(p_run_id uuid,p_nickname text,p_encounters integer,p_health integer,p_outcome text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  v_nickname text;
  v_inserted uuid;
  v_existing public.hallway25_scores%rowtype;
begin
  if p_nickname is null or char_length(p_nickname) > 60 or p_nickname !~ '^[A-Za-z0-9 _-]+$' then
    raise sqlstate 'PT400' using message = 'Use a nickname of 2-20 letters, numbers, spaces, underscores or hyphens.';
  end if;
  v_nickname := regexp_replace(btrim(p_nickname),' +',' ','g');
  if char_length(v_nickname) not between 2 and 20 or p_run_id is null or p_encounters is null or p_health is null or p_outcome is null then
    raise sqlstate 'PT400' using message = 'Invalid Hallway 25 score.';
  end if;
  insert into public.hallway25_scores(run_id,nickname,encounters,health,outcome)
  values(p_run_id,v_nickname,p_encounters,p_health,p_outcome)
  on conflict (run_id) do nothing returning run_id into v_inserted;
  if v_inserted is not null then return jsonb_build_object('status','submitted'); end if;
  select * into v_existing from public.hallway25_scores s where s.run_id = p_run_id;
  if v_existing.nickname is distinct from v_nickname or v_existing.encounters is distinct from p_encounters
    or v_existing.health is distinct from p_health or v_existing.outcome is distinct from p_outcome then
    raise sqlstate 'PT409' using message = 'This run already has a different score. It cannot be changed.';
  end if;
  return jsonb_build_object('status','duplicate');
end;
$$;
revoke all on function public.hallway25_submit_score(uuid,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.hallway25_submit_score(uuid,text,integer,integer,text) to anon;

create function public.hallway25_leaderboard()
returns table(nickname text,encounters integer,health integer,outcome text,submitted_at timestamptz)
language sql stable security invoker set search_path = pg_catalog as $$
  select b.nickname,b.encounters,b.health,b.outcome,b.submitted_at
  from (
    select distinct on (lower(s.nickname collate "C")) s.*
    from public.hallway25_scores s
    order by lower(s.nickname collate "C"),s.encounters desc,s.health desc,s.submitted_at,s.run_id
  ) b
  order by b.encounters desc,b.health desc,b.submitted_at,b.run_id
  limit 20;
$$;
revoke all on function public.hallway25_leaderboard() from public, anon, authenticated;
grant execute on function public.hallway25_leaderboard() to anon;
notify pgrst, 'reload schema';
commit;
