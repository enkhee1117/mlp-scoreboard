-- Replace the server-side round-robin generator with a bulk-insert RPC.
-- The action layer now computes the schedule in JS (so we get three pairing
-- schemes + tests) and hands the resulting drafts here for atomic insertion.

set search_path = public;

create or replace function public.app_replace_pending_matches(
  p_tournament_id uuid,
  p_matches jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_count int := 0;
begin
  uid := public.app_require_auth();
  perform public.app_require_tournament_manager(p_tournament_id);

  if jsonb_typeof(p_matches) is distinct from 'array' then
    raise exception 'matches must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_matches) = 0 then
    raise exception 'no matches to insert' using errcode = '22023';
  end if;
  if jsonb_array_length(p_matches) > 500 then
    raise exception 'too many matches in one request (max 500)' using errcode = '22023';
  end if;

  -- Drop matches that haven't been scored yet; keep completed ones intact.
  delete from public.matches
   where tournament_id = p_tournament_id
     and team_a_score is null
     and team_b_score is null;

  insert into public.matches (
    tournament_id, round_label, court_label,
    team_a_label, team_b_label, created_by_user_id
  )
  select
    p_tournament_id,
    coalesce(nullif(trim(elem->>'round_label'), ''), 'Round'),
    coalesce(nullif(trim(elem->>'court_label'), ''), 'Court'),
    nullif(trim(elem->>'team_a_label'), ''),
    nullif(trim(elem->>'team_b_label'), ''),
    uid
  from jsonb_array_elements(p_matches) as elem
  where nullif(trim(elem->>'team_a_label'), '') is not null
    and nullif(trim(elem->>'team_b_label'), '') is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.app_replace_pending_matches(uuid, jsonb) from public;
grant execute on function public.app_replace_pending_matches(uuid, jsonb) to authenticated;
