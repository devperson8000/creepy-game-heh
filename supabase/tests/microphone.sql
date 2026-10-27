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
 -- Old clients and new clients share exactly the same authenticated input API.
 for packet in select value from jsonb_array_elements(jsonb_build_array(
  base,
  base||'{"voiceLevel":0,"voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":2}'::jsonb,
  base||jsonb_build_object('motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.016}'::jsonb)),
  base||jsonb_build_object('voiceLevel',4,'voiceSequence',3,'motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.016}'::jsonb))
 )) loop
  perform pg_sleep(.05);perform public.game_send_input(packet);
  if not exists(select 1 from public.game_members where user_id=auth.uid() and input=packet) then raise exception 'input not retained: %',packet; end if;
 end loop;
 for packet in select value from jsonb_array_elements(jsonb_build_array(
  base||'{"voiceLevel":4}'::jsonb,
  base||'{"voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":5,"voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":-1,"voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":2.5,"voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":"4","voiceSequence":1}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":null}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":0}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":1.1}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":9007199254740992}'::jsonb,
  base||'{"voiceLevel":4,"voiceSequence":1,"position":{"x":999}}'::jsonb,
  base||jsonb_build_object('voiceLevel',4,'voiceSequence',1,'motionId','20000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||'{"sequence":1,"duration":0.016,"voiceLevel":4}'::jsonb))
 )) loop
  rejected:=false;
  begin perform public.game_send_input(packet); exception when others then if sqlerrm<>'INVALID_INPUT' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'invalid voice packet accepted: %',packet; end if;
 end loop;
end $$;
rollback;
