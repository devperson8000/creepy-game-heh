-- Retain the existing authenticated API and seven-field legacy commands.
-- New clients resend a bounded history; the host acknowledges simulated commands.
create or replace function public.game_send_input(p_input jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); m public.game_members; c jsonb; previous_seq numeric := 0;
begin
  if p_input is null or jsonb_typeof(p_input) is distinct from 'object' then raise exception 'INVALID_INPUT'; end if;
  if octet_length(p_input::text)>64000 then raise exception 'INVALID_INPUT'; end if;
  if (select count(*) from jsonb_object_keys(p_input)) not in (7,9)
    or not (p_input ?& array['forward','right','yaw','pitch','sprint','torch','paused'])
    then raise exception 'INVALID_INPUT'; end if;
  if p_input ? 'commands' then
    if (select count(*) from jsonb_object_keys(p_input))<>9
      or jsonb_typeof(p_input->'motionId') is distinct from 'string'
      or (p_input->>'motionId') !~ '^[0-9a-f-]{36}$'
      or jsonb_typeof(p_input->'commands') is distinct from 'array' then raise exception 'INVALID_INPUT'; end if;
    if jsonb_array_length(p_input->'commands')>180 then raise exception 'INVALID_INPUT'; end if;
  elsif (select count(*) from jsonb_object_keys(p_input))<>7 then raise exception 'INVALID_INPUT';
  end if;
  for c in select value from jsonb_array_elements(jsonb_build_array(p_input) || coalesce(p_input->'commands','[]'::jsonb)) loop
    if jsonb_typeof(c) is distinct from 'object' then raise exception 'INVALID_INPUT'; end if;
    if jsonb_typeof(c->'forward') is distinct from 'number' or jsonb_typeof(c->'right') is distinct from 'number'
      or jsonb_typeof(c->'yaw') is distinct from 'number' or jsonb_typeof(c->'pitch') is distinct from 'number'
      or jsonb_typeof(c->'sprint') is distinct from 'boolean' or jsonb_typeof(c->'torch') is distinct from 'boolean' or jsonb_typeof(c->'paused') is distinct from 'boolean'
      then raise exception 'INVALID_INPUT'; end if;
    if abs((c->>'forward')::numeric)>1 or abs((c->>'right')::numeric)>1 or abs((c->>'yaw')::numeric)>1000000 or abs((c->>'pitch')::numeric)>1.571 then raise exception 'INVALID_INPUT'; end if;
    if c is distinct from p_input then
      if (select count(*) from jsonb_object_keys(c))<>9 or not(c ?& array['sequence','duration'])
        or jsonb_typeof(c->'sequence') is distinct from 'number' or jsonb_typeof(c->'duration') is distinct from 'number' then raise exception 'INVALID_INPUT'; end if;
      if (c->>'sequence')::numeric<=previous_seq or (c->>'sequence')::numeric>9007199254740991
        or trunc((c->>'sequence')::numeric)<>(c->>'sequence')::numeric
        or (c->>'duration')::numeric<=0 or (c->>'duration')::numeric>.05 then raise exception 'INVALID_INPUT'; end if;
      previous_seq:=(c->>'sequence')::numeric;
    end if;
  end loop;
  select * into m from public.game_members where user_id=u for update;
  if m.user_id is null then raise exception 'NOT_MEMBER'; end if;
  if not exists(select 1 from public.game_lobbies where id=m.lobby_id and status='running') then raise exception 'NOT_RUNNING'; end if;
  if m.input_at > clock_timestamp() - interval '45 milliseconds' then raise exception 'RATE_LIMIT'; end if;
  update public.game_members set input=p_input,input_at=clock_timestamp(),input_seq=input_seq+1 where user_id=u;
end $$;
revoke all on function public.game_send_input(jsonb) from public,anon;
grant execute on function public.game_send_input(jsonb) to authenticated;
