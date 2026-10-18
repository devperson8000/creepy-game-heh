-- Run once in the Supabase SQL editor (or `supabase db push`).
-- All writes use authenticated RPCs; browser clients cannot write table rows.
begin;

create table public.game_lobbies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 48),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','running')),
  seed bigint,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp()
);
create table public.game_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lobby_id uuid not null references public.game_lobbies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  slot smallint not null check (slot between 0 and 3),
  ready boolean not null default false,
  heartbeat_at timestamptz not null default clock_timestamp(),
  input jsonb, input_at timestamptz, input_seq bigint not null default 0,
  action jsonb, action_at timestamptz, action_seq bigint not null default 0,
  unique(lobby_id, slot)
);
create index game_members_room on public.game_members(lobby_id);
create table public.game_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lobby_id uuid not null references public.game_lobbies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '45 seconds')
);
create index game_requests_room on public.game_requests(lobby_id);
create table public.game_snapshots (
  lobby_id uuid primary key references public.game_lobbies(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  updated_at timestamptz not null default clock_timestamp()
);

create function public.game_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin if u is null then raise exception 'AUTH_REQUIRED'; end if; return u; end $$;
create function public.game_is_member(p_lobby uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.game_members where lobby_id = p_lobby and user_id = auth.uid())
$$;
create function public.game_is_owner(p_lobby uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.game_lobbies where id = p_lobby and owner_id = auth.uid())
$$;
create function public.game_clean_name(p_name text, p_max integer) returns text language plpgsql immutable set search_path = '' as $$
declare result text;
begin
  result := btrim(regexp_replace(regexp_replace(coalesce(p_name,''), '[<>[:cntrl:]]', '', 'g'), '\s+', ' ', 'g'));
  if char_length(result) < 1 or char_length(result) > p_max then raise exception 'INVALID_NAME'; end if;
  return result;
end $$;
create function public.game_cleanup() returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Host loss ends the room. Guests expire independently. No browser is trusted
  -- to claim that somebody else disconnected.
  delete from public.game_lobbies where heartbeat_at < clock_timestamp() - interval '90 seconds';
  delete from public.game_members m using public.game_lobbies l where m.lobby_id = l.id and m.user_id <> l.owner_id and m.heartbeat_at < clock_timestamp() - interval '90 seconds';
  update public.game_requests set status = 'rejected', reason = 'expired'
    where status = 'pending' and expires_at <= clock_timestamp();
  delete from public.game_requests where created_at < clock_timestamp() - interval '5 minutes' and status <> 'pending';
end $$;

alter table public.game_lobbies enable row level security;
alter table public.game_members enable row level security;
alter table public.game_requests enable row level security;
alter table public.game_snapshots enable row level security;
create policy room_members_read on public.game_lobbies for select to authenticated using (public.game_is_member(id));
create policy member_roster_read on public.game_members for select to authenticated using (public.game_is_member(lobby_id));
create policy request_parties_read on public.game_requests for select to authenticated using (user_id = auth.uid() or public.game_is_owner(lobby_id));
create policy snapshot_members_read on public.game_snapshots for select to authenticated using (public.game_is_member(lobby_id));
revoke all on public.game_lobbies, public.game_members, public.game_requests, public.game_snapshots from anon, authenticated;
grant select on public.game_lobbies, public.game_members, public.game_requests, public.game_snapshots to authenticated;

create function public.game_directory() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.game_user(); perform public.game_cleanup();
  return coalesce((select jsonb_agg(row_data order by created_at desc) from (
    select l.created_at, jsonb_build_object('id',l.id,'name',l.name,'hostName',m.name,'count',(select count(*) from public.game_members where lobby_id=l.id),'maxPlayers',4,'status',l.status) row_data
    from public.game_lobbies l join public.game_members m on m.user_id=l.owner_id and m.lobby_id=l.id
    where l.heartbeat_at >= clock_timestamp() - interval '90 seconds' order by l.created_at desc limit 200
  ) rooms), '[]'::jsonb);
end $$;
create function public.game_room() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies;
begin
  select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u;
  if l.id is null then return null; end if;
  return jsonb_build_object('id',l.id,'name',l.name,'ownerId',l.owner_id,'status',l.status,'seed',l.seed,
    'members',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name,'slot',slot,'ready',ready) order by slot),'[]'::jsonb) from public.game_members where lobby_id=l.id),
    'requests',case when l.owner_id=u then (select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name) order by created_at),'[]'::jsonb) from public.game_requests where lobby_id=l.id and status='pending' and expires_at > clock_timestamp()) else '[]'::jsonb end);
end $$;
create function public.game_request_state() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user();
begin
  return (select jsonb_build_object('lobbyId',lobby_id,'status',status,'reason',reason) from public.game_requests where user_id=u);
end $$;
create function public.game_create(p_name text, p_player_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); room_id uuid; clean_name text := public.game_clean_name(p_name,48); player_name text := public.game_clean_name(p_player_name,24);
begin
  perform public.game_cleanup();
  -- Serialize a user's create/join/leave operations across concurrent tabs.
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if exists(select 1 from public.game_members where user_id=u) then raise exception 'ALREADY_MEMBER'; end if;
  if (select count(*) from public.game_lobbies) >= 1000 then raise exception 'SERVER_FULL'; end if;
  delete from public.game_requests where user_id=u;
  insert into public.game_lobbies(name,owner_id) values(clean_name,u) returning id into room_id;
  insert into public.game_members(user_id,lobby_id,name,slot,ready) values(u,room_id,player_name,0,true);
  return room_id;
end $$;
create function public.game_request(p_lobby_id uuid, p_player_name text) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies; player_name text := public.game_clean_name(p_player_name,24);
begin
  perform public.game_cleanup(); perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if exists(select 1 from public.game_members where user_id=u) then raise exception 'ALREADY_MEMBER'; end if;
  select * into l from public.game_lobbies where id=p_lobby_id for update;
  if l.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  if l.status <> 'waiting' then raise exception 'ROOM_RUNNING'; end if;
  if (select count(*) from public.game_members where lobby_id=l.id) >= 4 then raise exception 'ROOM_FULL'; end if;
  if exists(select 1 from public.game_requests where user_id=u and created_at > clock_timestamp() - interval '1 second') then raise exception 'RATE_LIMIT'; end if;
  insert into public.game_requests(user_id,lobby_id,name) values(u,l.id,player_name)
    on conflict(user_id) do update set lobby_id=excluded.lobby_id,name=excluded.name,status='pending',reason=null,created_at=clock_timestamp(),expires_at=clock_timestamp()+interval '45 seconds';
end $$;
create function public.game_approve(p_request_id uuid, p_accept boolean) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies; r public.game_requests; free_slot smallint;
begin
  if p_accept is null then raise exception 'INVALID_MESSAGE'; end if;
  -- The room row serializes concurrent approvals and start operations.
  select * into l from public.game_lobbies where owner_id=u for update;
  if l.id is null then raise exception 'NOT_OWNER'; end if;
  select * into r from public.game_requests where user_id=p_request_id and lobby_id=l.id and status='pending' for update;
  if r.user_id is null or r.expires_at <= clock_timestamp() then raise exception 'REQUEST_EXPIRED'; end if;
  if l.status <> 'waiting' then raise exception 'ROOM_RUNNING'; end if;
  if not p_accept then update public.game_requests set status='rejected',reason='declined' where user_id=r.user_id; return; end if;
  if exists(select 1 from public.game_members where user_id=r.user_id) then raise exception 'ALREADY_MEMBER'; end if;
  select n::smallint into free_slot from generate_series(0,3) n where not exists(select 1 from public.game_members where lobby_id=l.id and slot=n) order by n limit 1;
  if free_slot is null then raise exception 'ROOM_FULL'; end if;
  insert into public.game_members(user_id,lobby_id,name,slot) values(r.user_id,l.id,r.name,free_slot);
  update public.game_requests set status='approved' where user_id=r.user_id;
  update public.game_lobbies set updated_at=clock_timestamp() where id=l.id;
end $$;
create function public.game_ready(p_ready boolean) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies;
begin
  if p_ready is null then raise exception 'INVALID_MESSAGE'; end if;
  select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u for update of r;
  if l.id is null then raise exception 'NOT_MEMBER'; end if;
  if l.status <> 'waiting' then raise exception 'ROOM_RUNNING'; end if;
  update public.game_members set ready=p_ready where user_id=u;
  update public.game_lobbies set updated_at=clock_timestamp() where id=l.id;
end $$;
create function public.game_start() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies;
begin
  select * into l from public.game_lobbies where owner_id=u for update;
  if l.id is null then raise exception 'NOT_OWNER'; end if;
  if l.status <> 'waiting' then raise exception 'ROOM_RUNNING'; end if;
  if (select count(*) from public.game_members where lobby_id=l.id) not between 2 and 4 or exists(select 1 from public.game_members where lobby_id=l.id and (not ready or heartbeat_at < clock_timestamp() - interval '90 seconds')) then raise exception 'NOT_READY'; end if;
  update public.game_lobbies set status='running',seed=('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint,updated_at=clock_timestamp() where id=l.id;
  update public.game_requests set status='rejected',reason='started' where lobby_id=l.id and status='pending';
end $$;
create function public.game_leave() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies;
begin
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u for update of r;
  delete from public.game_requests where user_id=u;
  if l.owner_id=u then delete from public.game_lobbies where id=l.id;
  else delete from public.game_members where user_id=u;
    update public.game_lobbies set updated_at=clock_timestamp() where id=l.id;
  end if;
end $$;
create function public.game_heartbeat() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user();
begin
  perform public.game_cleanup();
  update public.game_members set heartbeat_at=clock_timestamp() where user_id=u;
  update public.game_lobbies set heartbeat_at=clock_timestamp() where owner_id=u;
end $$;

create function public.game_send_input(p_input jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); m public.game_members;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' or (select count(*) from jsonb_object_keys(p_input)) <> 7
    or not (p_input ?& array['forward','right','yaw','pitch','sprint','torch','paused'])
    or jsonb_typeof(p_input->'forward') <> 'number' or jsonb_typeof(p_input->'right') <> 'number'
    or jsonb_typeof(p_input->'yaw') <> 'number' or jsonb_typeof(p_input->'pitch') <> 'number'
    or jsonb_typeof(p_input->'sprint') <> 'boolean' or jsonb_typeof(p_input->'torch') <> 'boolean' or jsonb_typeof(p_input->'paused') <> 'boolean'
    then raise exception 'INVALID_INPUT'; end if;
  if abs((p_input->>'forward')::numeric)>1 or abs((p_input->>'right')::numeric)>1 or abs((p_input->>'yaw')::numeric)>1000000 or abs((p_input->>'pitch')::numeric)>1.571 then raise exception 'INVALID_INPUT'; end if;
  select * into m from public.game_members where user_id=u for update;
  if m.user_id is null then raise exception 'NOT_MEMBER'; end if;
  if not exists(select 1 from public.game_lobbies where id=m.lobby_id and status='running') then raise exception 'NOT_RUNNING'; end if;
  if m.input_at > clock_timestamp() - interval '45 milliseconds' then raise exception 'RATE_LIMIT'; end if;
  update public.game_members set input=p_input,input_at=clock_timestamp(),input_seq=input_seq+1 where user_id=u;
end $$;
create function public.game_send_action(p_action jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); m public.game_members;
begin
  if p_action is null or jsonb_typeof(p_action) <> 'object' or (select count(*) from jsonb_object_keys(p_action)) <> 2
    or jsonb_typeof(p_action->'targetId') is distinct from 'string' or jsonb_typeof(p_action->'code') is distinct from 'string'
    or char_length(p_action->>'targetId') not between 1 and 80 or char_length(p_action->>'code') not between 1 and 64 then raise exception 'INVALID_ACTION'; end if;
  select * into m from public.game_members where user_id=u for update;
  if m.user_id is null then raise exception 'NOT_MEMBER'; end if;
  if not exists(select 1 from public.game_lobbies where id=m.lobby_id and status='running') then raise exception 'NOT_RUNNING'; end if;
  if m.action_at > clock_timestamp() - interval '100 milliseconds' then raise exception 'RATE_LIMIT'; end if;
  update public.game_members set action=p_action,action_at=clock_timestamp(),action_seq=action_seq+1 where user_id=u;
end $$;
create function public.game_publish_snapshot(p_snapshot jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.game_user(); l public.game_lobbies;
begin
  select * into l from public.game_lobbies where owner_id=u for update;
  if l.id is null then raise exception 'NOT_OWNER'; end if;
  if l.status <> 'running' then raise exception 'NOT_RUNNING'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text)>65536 then raise exception 'INVALID_SNAPSHOT'; end if;
  if exists(select 1 from public.game_snapshots where lobby_id=l.id and updated_at > clock_timestamp() - interval '95 milliseconds') then raise exception 'RATE_LIMIT'; end if;
  insert into public.game_snapshots(lobby_id,payload) values(l.id,p_snapshot)
    on conflict(lobby_id) do update set payload=excluded.payload,updated_at=clock_timestamp();
end $$;

-- PostgreSQL gives PUBLIC execute by default: explicitly revoke every helper
-- and RPC before granting only the public, authenticated API.
revoke all on function public.game_user(), public.game_is_member(uuid), public.game_is_owner(uuid), public.game_clean_name(text,integer), public.game_cleanup(), public.game_directory(), public.game_room(), public.game_request_state(), public.game_create(text,text), public.game_request(uuid,text), public.game_approve(uuid,boolean), public.game_ready(boolean), public.game_start(), public.game_leave(), public.game_heartbeat(), public.game_send_input(jsonb), public.game_send_action(jsonb), public.game_publish_snapshot(jsonb) from public, anon, authenticated;
grant execute on function public.game_is_member(uuid), public.game_is_owner(uuid), public.game_directory(), public.game_room(), public.game_request_state(), public.game_create(text,text), public.game_request(uuid,text), public.game_approve(uuid,boolean), public.game_ready(boolean), public.game_start(), public.game_leave(), public.game_heartbeat(), public.game_send_input(jsonb), public.game_send_action(jsonb), public.game_publish_snapshot(jsonb) to authenticated;

alter publication supabase_realtime add table public.game_lobbies, public.game_members, public.game_requests, public.game_snapshots;
commit;
