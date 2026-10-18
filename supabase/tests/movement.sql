\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('20000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.game_create('Movement test','Host');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select public.game_request((public.game_directory()->0->>'id')::uuid,'Guest');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.game_approve('20000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select public.game_ready(true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.game_start();
do $$
declare base jsonb:='{"forward":1,"right":0,"yaw":0,"pitch":0,"sprint":false,"torch":true,"paused":false}'; packet jsonb; rejected boolean;
begin
 packet:=base||jsonb_build_object('motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.016}'::jsonb,base||'{"sequence":2,"duration":0.016}'::jsonb));
 perform public.game_send_input(packet);
 if not exists(select 1 from public.game_members where user_id=auth.uid() and input=packet) then raise exception 'movement batch not saved'; end if;
 for packet in select value from jsonb_array_elements(jsonb_build_array(
  base||jsonb_build_object('motionId','bad','commands','[]'::jsonb),
  base||jsonb_build_object('motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":5}'::jsonb)),
  base||jsonb_build_object('motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.01}'::jsonb,base||'{"sequence":1,"duration":0.01}'::jsonb)),
  base||'{"clientPosition":{"x":999}}'::jsonb,
  base||'{"forward":null}'::jsonb,
  base||jsonb_build_object('motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.01,"position":999}'::jsonb))
 )) loop
  rejected:=false;
  begin perform public.game_send_input(packet); exception when others then if sqlerrm<>'INVALID_INPUT' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'malformed packet accepted: %',packet; end if;
 end loop;
end $$;
rollback;
