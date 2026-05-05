-- Tournament management RPCs + rename propagation + match search.
--
-- Reported gaps:
--   * No way to delete a tournament from the UI.
--   * No way to reset/clear all matches without deleting the whole thing.
--   * Renaming a placeholder player did not update the match labels that
--     already embedded their old name as a static string.
--   * No way to search match history by player name.

set search_path = public;

-- ---------------------------------------------------------------------------
-- 1. relabel_team helper: replaces an exact-match player name in a team
-- label like "Alice & Bob" without touching substrings inside other names.
-- ---------------------------------------------------------------------------
create or replace function public.relabel_team(p_label text, p_old text, p_new text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
  i int;
  changed boolean := false;
begin
  if p_label is null or p_old is null or p_new is null or p_old = p_new then
    return p_label;
  end if;
  parts := regexp_split_to_array(p_label, '\s*&\s*|\s*/\s*');
  if parts is null or array_length(parts, 1) is null then return p_label; end if;
  for i in 1..array_length(parts, 1) loop
    if trim(parts[i]) = p_old then
      parts[i] := p_new;
      changed := true;
    end if;
  end loop;
  if not changed then return p_label; end if;
  return array_to_string(parts, ' & ');
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. app_update_tournament_player now propagates renames to match labels.
-- Existing matches keep their scores; only the team labels update so the
-- scoreboard reflects the player's real name.
-- ---------------------------------------------------------------------------
drop function if exists public.app_update_tournament_player(uuid, text, text);
create or replace function public.app_update_tournament_player(
  p_player_id uuid,
  p_display_name text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_old_name text;
  v_new_name text := trim(coalesce(p_display_name, ''));
  v_email text := nullif(trim(coalesce(p_email, '')), '');
begin
  select tp.tournament_id, tp.display_name
    into v_tournament_id, v_old_name
    from public.tournament_players tp
   where tp.id = p_player_id;
  if v_tournament_id is null then
    raise exception 'player not found' using errcode = '02000';
  end if;
  perform public.app_require_tournament_manager(v_tournament_id);

  if length(v_new_name) < 2 or length(v_new_name) > 120 then
    raise exception 'display name must be 2-120 characters' using errcode = '22023';
  end if;

  update public.tournament_players
     set display_name = v_new_name,
         email = v_email
   where id = p_player_id;

  if v_old_name is distinct from v_new_name then
    update public.matches m
       set team_a_label = public.relabel_team(m.team_a_label, v_old_name, v_new_name),
           team_b_label = public.relabel_team(m.team_b_label, v_old_name, v_new_name)
     where m.tournament_id = v_tournament_id
       and (m.team_a_label like '%' || v_old_name || '%'
         or m.team_b_label like '%' || v_old_name || '%');
  end if;

  return p_player_id;
end;
$$;

revoke all on function public.app_update_tournament_player(uuid, text, text) from public;
grant execute on function public.app_update_tournament_player(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. app_bulk_rename_tournament_players also propagates renames now.
-- Same shape as before (jsonb array of {id, display_name}); we look up the
-- old names first so we know what to replace in the match labels.
-- ---------------------------------------------------------------------------
create or replace function public.app_bulk_rename_tournament_players(
  p_tournament_id uuid,
  p_renames jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  rec record;
begin
  perform public.app_require_tournament_manager(p_tournament_id);

  if jsonb_typeof(p_renames) is distinct from 'array' then
    raise exception 'renames must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_renames) > 200 then
    raise exception 'too many renames in one request (max 200)' using errcode = '22023';
  end if;

  for rec in
    select
      (elem->>'id')::uuid as player_id,
      trim(coalesce(elem->>'display_name', '')) as new_name
    from jsonb_array_elements(p_renames) as elem
  loop
    if length(rec.new_name) between 2 and 120 then
      with old as (
        select display_name from public.tournament_players
         where id = rec.player_id and tournament_id = p_tournament_id
      ),
      upd as (
        update public.tournament_players
           set display_name = rec.new_name
         where id = rec.player_id
           and tournament_id = p_tournament_id
        returning 1
      )
      update public.matches m
         set team_a_label = public.relabel_team(m.team_a_label, (select display_name from old), rec.new_name),
             team_b_label = public.relabel_team(m.team_b_label, (select display_name from old), rec.new_name)
       where m.tournament_id = p_tournament_id
         and exists (select 1 from upd)
         and (select display_name from old) is distinct from rec.new_name
         and (m.team_a_label like '%' || (select display_name from old) || '%'
           or m.team_b_label like '%' || (select display_name from old) || '%');
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.app_bulk_rename_tournament_players(uuid, jsonb) from public;
grant execute on function public.app_bulk_rename_tournament_players(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reset all matches in a tournament (manager-only). Cascades wipe
-- match_games. Status auto-recomputes back to 'draft'.
-- ---------------------------------------------------------------------------
create or replace function public.app_reset_tournament_matches(
  p_tournament_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform public.app_require_tournament_manager(p_tournament_id);
  delete from public.matches where tournament_id = p_tournament_id;
  get diagnostics v_count = row_count;
  perform public.app_refresh_tournament_status(p_tournament_id);
  return v_count;
end;
$$;

revoke all on function public.app_reset_tournament_matches(uuid) from public;
grant execute on function public.app_reset_tournament_matches(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Delete a tournament (owner-only). Schema cascades wipe matches,
-- match_games, tournament_players, tournament_members, divisions.
-- ---------------------------------------------------------------------------
create or replace function public.app_delete_tournament(
  p_tournament_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  v_owner uuid;
begin
  select owner_user_id into v_owner from public.tournaments where id = p_tournament_id;
  if v_owner is null then
    raise exception 'tournament not found' using errcode = '02000';
  end if;
  if v_owner <> uid then
    raise exception 'only the tournament owner can delete it' using errcode = '42501';
  end if;
  delete from public.tournaments where id = p_tournament_id;
end;
$$;

revoke all on function public.app_delete_tournament(uuid) from public;
grant execute on function public.app_delete_tournament(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Search matches by player name within tournaments the caller belongs to.
-- Case-insensitive substring match against either team's label.
-- ---------------------------------------------------------------------------
create or replace function public.app_search_my_matches(
  p_query text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  v_query text := lower(trim(coalesce(p_query, '')));
  v_results jsonb;
begin
  if length(v_query) < 2 then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'tournament_id', m.tournament_id,
        'tournament_name', t.name,
        'round_label', m.round_label,
        'court_label', m.court_label,
        'team_a_label', m.team_a_label,
        'team_b_label', m.team_b_label,
        'team_a_score', m.team_a_score,
        'team_b_score', m.team_b_score,
        'winner_side', m.winner_side,
        'completed_at', m.completed_at
      ) order by m.created_at desc
    ),
    '[]'::jsonb
  )
  into v_results
  from public.matches m
  join public.tournaments t on t.id = m.tournament_id
  join public.tournament_members tm on tm.tournament_id = m.tournament_id and tm.user_id = uid
  where lower(m.team_a_label) like '%' || v_query || '%'
     or lower(m.team_b_label) like '%' || v_query || '%';

  return v_results;
end;
$$;

revoke all on function public.app_search_my_matches(text) from public;
grant execute on function public.app_search_my_matches(text) to authenticated;
