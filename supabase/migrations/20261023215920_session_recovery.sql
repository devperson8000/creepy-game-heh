-- Compatible with existing rooms: succession requires every remaining member to opt in.
begin;
alter table public.game_lobbies add column if not exists owner_epoch integer not null default 0 check(owner_epoch>=0);
alter table public.game_members add column if not exists recovery_capable boolean not null default false;
create index if not exists game_lobbies_owner on public.game_lobbies(owner_id);
create index if not exists game_lobbies_heartbeat on public.game_lobbies(heartbeat_at);
create schema if not exists game_private;
revoke all on schema game_private from public,anon,authenticated;
create or replace function game_private.rotate_owner(p_lobby uuid,p_previous uuid,p_departing boolean default false)
returns boolean language plpgsql set search_path='' as $$
declare l public.game_lobbies; successor uuid; stamp timestamptz:=clock_timestamp();
begin
 select * into l from public.game_lobbies where id=p_lobby for update;
 if l.id is null or l.owner_id<>p_previous or l.status<>'running' or (not p_departing and l.heartbeat_at>=stamp-interval '45 seconds') then return false;end if;
 if not exists(select 1 from public.game_snapshots where lobby_id=l.id) or exists(select 1 from public.game_members where lobby_id=l.id and user_id<>p_previous and not recovery_capable) then return false;end if;
 select user_id into successor from public.game_members where lobby_id=l.id and user_id<>p_previous and recovery_capable and heartbeat_at>=stamp-interval '45 seconds' order by slot limit 1;
 if successor is null then return false;end if;
 update public.game_lobbies set owner_id=successor,owner_epoch=owner_epoch+1,heartbeat_at=stamp,updated_at=stamp where id=l.id returning * into l;
 delete from public.game_members where lobby_id=l.id and user_id=p_previous;
 update public.game_members set input=null,action=null,input_at=null,action_at=null where lobby_id=l.id;
 update public.game_snapshots set payload=jsonb_set(payload||jsonb_build_object('authority',jsonb_build_object('ownerId',successor,'epoch',l.owner_epoch)),'{state,ownerId}',to_jsonb(successor::text),true) where lobby_id=l.id;
 return true;
end $$;
revoke all on function game_private.rotate_owner(uuid,uuid,boolean) from public,anon,authenticated;
create or replace function public.game_cleanup() returns void language plpgsql security definer set search_path='' as $$
declare l public.game_lobbies;
begin
 for l in select * from public.game_lobbies where status='running' and heartbeat_at<clock_timestamp()-interval '45 seconds' order by id for update skip locked loop
  perform game_private.rotate_owner(l.id,l.owner_id,false);
 end loop;
 delete from public.game_lobbies where heartbeat_at<clock_timestamp()-interval '90 seconds';
 delete from public.game_members m using public.game_lobbies rooms where m.lobby_id=rooms.id and m.user_id<>rooms.owner_id and m.heartbeat_at<clock_timestamp()-interval '90 seconds';
 update public.game_requests set status='rejected',reason='expired' where status='pending' and expires_at<=clock_timestamp();
 delete from public.game_requests where created_at<clock_timestamp()-interval '5 minutes' and status<>'pending';
end $$;
create or replace function public.game_heartbeat() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();
begin
 -- All paths lock the room before its member, so lease renewal and succession serialize.
 perform 1 from public.game_lobbies l join public.game_members m on m.lobby_id=l.id where m.user_id=u for update of l;
 update public.game_lobbies set heartbeat_at=clock_timestamp() where owner_id=u;
 update public.game_members set heartbeat_at=clock_timestamp() where user_id=u;
 perform public.game_cleanup();
end $$;
create or replace function public.game_leave() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();l public.game_lobbies;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u for update of r;
 delete from public.game_requests where user_id=u;
 if l.id is null then return;end if;
 if l.owner_id=u then
  if not game_private.rotate_owner(l.id,u,true) then delete from public.game_lobbies where id=l.id;end if;
 else delete from public.game_members where user_id=u;update public.game_lobbies set updated_at=clock_timestamp() where id=l.id;end if;
end $$;
create or replace function public.game_room() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();l public.game_lobbies;
begin
 select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u;
 if l.id is null then return null;end if;
 return jsonb_build_object('id',l.id,'name',l.name,'ownerId',l.owner_id,'ownerEpoch',l.owner_epoch,'status',l.status,'seed',l.seed,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name,'slot',slot,'ready',ready,'recoveryCapable',recovery_capable) order by slot),'[]'::jsonb) from public.game_members where lobby_id=l.id),
 'requests',case when l.owner_id=u then(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name) order by created_at),'[]'::jsonb) from public.game_requests where lobby_id=l.id and status='pending' and expires_at>clock_timestamp()) else '[]'::jsonb end);
end $$;
create or replace function public.game_support_recovery() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();
begin
 update public.game_members set recovery_capable=true where user_id=u;
 if not found then raise exception 'NOT_MEMBER';end if;
end $$;
create or replace function public.game_recover(p_resume boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();l public.game_lobbies;s jsonb;
begin
 perform public.game_heartbeat();
 select r.* into l from public.game_lobbies r join public.game_members m on m.lobby_id=r.id where m.user_id=u for update of r;
 if l.id is null then raise exception 'NOT_MEMBER';end if;
 if p_resume and l.owner_id=u and l.status='running' and exists(select 1 from public.game_snapshots where lobby_id=l.id) then
  update public.game_lobbies set owner_epoch=owner_epoch+1,updated_at=clock_timestamp() where id=l.id returning * into l;
  update public.game_members set input=null,action=null,input_at=null,action_at=null where lobby_id=l.id;
  update public.game_snapshots set payload=payload||jsonb_build_object('authority',jsonb_build_object('ownerId',u,'epoch',l.owner_epoch)) where lobby_id=l.id;
 end if;
 select payload into s from public.game_snapshots where lobby_id=l.id;
 return jsonb_build_object('room',public.game_room(),'snapshot',s,'serverNow',extract(epoch from clock_timestamp()));
end $$;
create or replace function public.game_publish_snapshot(p_snapshot jsonb) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=public.game_user();l public.game_lobbies;authority jsonb;
begin
 select * into l from public.game_lobbies where owner_id=u for update;
 if l.id is null then raise exception 'NOT_OWNER';end if;
 if l.status<>'running' then raise exception 'NOT_RUNNING';end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>65536 then raise exception 'INVALID_SNAPSHOT';end if;
 authority:=jsonb_build_object('ownerId',u,'epoch',l.owner_epoch);
 if (p_snapshot ? 'authority' and p_snapshot->'authority'<>authority) or (l.owner_epoch>0 and not(p_snapshot ? 'authority')) then raise exception 'INVALID_AUTHORITY';end if;
 if exists(select 1 from public.game_snapshots where lobby_id=l.id and updated_at>clock_timestamp()-interval '95 milliseconds') then raise exception 'RATE_LIMIT';end if;
 insert into public.game_snapshots(lobby_id,payload) values(l.id,p_snapshot||jsonb_build_object('authority',authority)) on conflict(lobby_id) do update set payload=excluded.payload,updated_at=clock_timestamp();
end $$;
-- Keep the existing accepted-member/owner RPC boundary; no direct browser writes.
revoke all on function public.game_support_recovery(),public.game_recover(boolean) from public,anon,authenticated;
grant execute on function public.game_support_recovery(),public.game_recover(boolean) to authenticated;
alter policy request_parties_read on public.game_requests using(user_id=(select auth.uid()) or public.game_is_owner(lobby_id));
commit;
