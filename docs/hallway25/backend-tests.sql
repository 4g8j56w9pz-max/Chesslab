-- These rollback tests were run on the dedicated empty Hallway25 database before release.
-- Do not run capacity/ranking fixtures against a populated live leaderboard.
-- All fixtures roll back. Execute against the Hallway 25 project only.
begin;
set local role anon;
do $$
declare
  v jsonb;
  v_rows integer;
  v_count integer := 0;
begin
  v := public.hallway25_submit_score('d2542500-0000-4000-8000-000000000001','  QA  Player  ',24,100,'lost');
  if v->>'status' <> 'submitted' then raise exception 'new submission failed'; end if;
  v := public.hallway25_submit_score('d2542500-0000-4000-8000-000000000001','QA Player',24,100,'lost');
  if v->>'status' <> 'duplicate' then raise exception 'duplicate failed'; end if;
  select count(*) into v_rows from public.hallway25_scores where run_id='d2542500-0000-4000-8000-000000000001';
  if v_rows <> 1 then raise exception 'duplicate row'; end if;
  begin perform public.hallway25_submit_score('d2542500-0000-4000-8000-000000000001','Changed',25,100,'won'); raise exception 'conflict accepted'; exception when sqlstate 'PT409' then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'<img onerror=x>',1,100,'lost'); raise exception 'HTML accepted'; exception when sqlstate 'PT400' then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),E'QA\nName',1,100,'lost'); raise exception 'control accepted'; exception when sqlstate 'PT400' then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'Q',1,100,'lost'); raise exception 'short name accepted'; exception when sqlstate 'PT400' then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),repeat('A',21),1,100,'lost'); raise exception 'long name accepted'; exception when sqlstate 'PT400' then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'QA',26,100,'lost'); raise exception '26 encounters accepted'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'QA',25,0,'won'); raise exception 'dead win accepted'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'QA',24,100,'won'); raise exception 'early win accepted'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'QA',25,100,'lost'); raise exception 'late loss accepted'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(gen_random_uuid(),'QA',2,15,'lost'); raise exception 'illegal health accepted'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  begin perform public.hallway25_submit_score(null,'QA',2,100,'lost'); raise exception 'null run accepted'; exception when sqlstate 'PT400' then v_count:=v_count+1; end;
  begin insert into public.hallway25_scores(run_id,nickname,encounters,health,outcome,submitted_at) values(gen_random_uuid(),'QA',1,100,'lost','2000-01-01'); raise exception 'client timestamp accepted'; exception when insufficient_privilege then v_count:=v_count+1; end;
  begin update public.hallway25_scores set nickname='Changed'; raise exception 'update allowed'; exception when insufficient_privilege then v_count:=v_count+1; end;
  begin delete from public.hallway25_scores; raise exception 'delete allowed'; exception when insufficient_privilege then v_count:=v_count+1; end;
  begin truncate public.hallway25_scores; raise exception 'truncate allowed'; exception when insufficient_privilege then v_count:=v_count+1; end;
  begin insert into public.hallway25_scores(run_id,nickname,encounters,health,outcome) values(gen_random_uuid(),'<script>',1,100,'lost'); raise exception 'direct invalid insert allowed'; exception when check_violation or insufficient_privilege then v_count:=v_count+1; end;
  perform public.hallway25_submit_score('d2542500-0000-4000-8000-000000000002','qa player',25,10,'won');
  perform public.hallway25_submit_score('d2542500-0000-4000-8000-000000000003','QA Champ',25,100,'won');
  select count(*) into v_rows from public.hallway25_leaderboard() where lower(nickname)='qa player';
  if v_rows<>1 then raise exception 'best per name not deduped'; end if;
  if (select health from public.hallway25_leaderboard() where lower(nickname)='qa player')<>10 then raise exception 'name best not chosen'; end if;
  if (select nickname from public.hallway25_leaderboard() limit 1)<>'QA Champ' then raise exception 'rank order wrong'; end if;
  if v_count<>16 then raise exception 'expected16 negative checks, got%',v_count; end if;
  raise notice 'PASS: submission, exact retry, conflict,16 rejection checks, best-per-name and ranking';
end;
$$;
rollback;

begin;
set local role anon;
do $$
declare i integer; v jsonb;
begin
for i in 1..60 loop
perform public.hallway25_submit_score(('e2542500-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'QA Rate',0,100,'lost');
end loop;
v:=public.hallway25_submit_score('e2542500-0000-4000-8000-000000000001','QA Rate',0,100,'lost');
if v->>'status'<>'duplicate' then raise exception 'rate-limited retry failed'; end if;
begin
perform public.hallway25_submit_score(gen_random_uuid(),'QA Rate',0,100,'lost');
raise exception '61st new score was accepted';
exception when sqlstate 'PT429' then null;
end;
end $$;
rollback;
select 'PASS:60 accepted;61st rate-limited;duplicate retry allowed;fixtures rolled back' as result;

begin;
insert into public.hallway25_scores(run_id,nickname,encounters,health,outcome,submitted_at)
select gen_random_uuid(),'QA Capacity',0,100,'lost',clock_timestamp()-interval '1 day' from generate_series(1,9999);
set local role anon;
do $$
declare v jsonb;
begin
v:=public.hallway25_submit_score('f2542500-0000-4000-8000-000000000001','QA Last',1,100,'lost');
if v->>'status'<>'submitted' then raise exception '10000th score failed'; end if;
if (select count(*) from public.hallway25_scores)<>10000 then raise exception 'wrong capacity'; end if;
begin
insert into public.hallway25_scores(run_id,nickname,encounters,health,outcome) values(gen_random_uuid(),'QA Overflow',1,100,'lost');
raise exception '10001st direct insert accepted';
exception when sqlstate 'PT503' then null;
end;
v:=public.hallway25_submit_score('f2542500-0000-4000-8000-000000000001','QA Last',1,100,'lost');
if v->>'status'<>'duplicate' then raise exception 'full-capacity retry failed'; end if;
end $$;
rollback;
select 'PASS:10000th accepted;10001st direct insert rejected;duplicate allowed;fixtures rolled back' as result;
