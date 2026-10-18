\set ON_ERROR_STOP on
-- Committed fixture for two concurrent authenticated owner sessions.
insert into auth.users(id) select ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,5) n;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.game_create('Concurrent','Host');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select public.game_request((public.game_directory()->0->>'id')::uuid,'Second');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.game_approve('10000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select public.game_request((public.game_directory()->0->>'id')::uuid,'Third');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.game_approve('10000000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select public.game_request((public.game_directory()->0->>'id')::uuid,'Fourth');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',false);
select public.game_request((public.game_directory()->0->>'id')::uuid,'Fifth');
