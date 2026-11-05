\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('30000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select public.game_create('Backrooms input test','Host');
select set_config('backrooms_test.lobby_id',(select id::text from public.game_lobbies where owner_id=auth.uid()),true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.game_request(current_setting('backrooms_test.lobby_id')::uuid,'Guest');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select public.game_approve('30000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.game_ready(true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select public.game_start();
do $$
declare base jsonb:='{"forward":1,"right":0,"yaw":0,"pitch":0,"sprint":false,"torch":true,"paused":false}'; packet jsonb; posture jsonb; command jsonb; rejected boolean;
begin
 -- Each optional field works independently and with the microphone extension.
 for posture in select value from jsonb_array_elements('[{}, {"lean":-1}, {"lean":0.5}, {"lean":1}, {"crouch":true}, {"crouch":false}, {"lean":-0.25,"crouch":true}]') loop
  for packet in select value from jsonb_array_elements(jsonb_build_array(
   base||posture,
   base||posture||'{"voiceLevel":4,"voiceSequence":1}'::jsonb,
   base||posture||jsonb_build_object('motionId','30000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||posture||'{"sequence":1,"duration":0.025}'::jsonb)),
   base||posture||jsonb_build_object('voiceLevel',4,'voiceSequence',1,'motionId','30000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||posture||'{"sequence":1,"duration":0.025}'::jsonb))
  )) loop
   perform pg_sleep(.05);perform public.game_send_input(packet);
   if not exists(select 1 from public.game_members where user_id=auth.uid() and input=packet) then raise exception 'input not retained: %',packet; end if;
  end loop;
 end loop;
 -- Check both the top-level input and replay commands; neither may use extra fields.
 for posture in select value from jsonb_array_elements('[{"lean":-1.001},{"lean":1.001},{"lean":"1"},{"lean":null},{"lean":true},{"crouch":1},{"crouch":"true"},{"crouch":null},{"lean":0,"position":{"x":999}},{"crouch":true,"unknown":0}]') loop
  for packet in select value from jsonb_array_elements(jsonb_build_array(
   base||posture,
   base||jsonb_build_object('motionId','30000000-0000-0000-0000-000000000001','commands',jsonb_build_array(base||posture||'{"sequence":1,"duration":0.025}'::jsonb))
  )) loop
   rejected:=false;
   begin perform public.game_send_input(packet);exception when others then if sqlerrm<>'INVALID_INPUT' then raise;end if;rejected:=true;end;
   if not rejected then raise exception 'invalid posture accepted: %',packet;end if;
  end loop;
 end loop;
end $$;
rollback;
