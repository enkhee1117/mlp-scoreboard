-- App-level write RPCs.
--
-- All write paths run through SECURITY DEFINER functions so that:
--   - permissions are enforced in one place (auth.uid() + tournament_members),
--   - related rows (e.g. owner membership, placeholder players) are inserted
--     atomically alongside their parent,
--   - the action layer never has to write to multiple tables and worry about
--     partial failures.
--
-- Functions raise SQLSTATE 28000 ('insufficient_privilege') for unauthenticated
-- callers and 42501 ('insufficient_privilege') for callers without the
-- required role on a given tournament. The action layer maps both to a
-- friendly error message.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Helper: assert the caller is authenticated. Returns auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.app_require_auth()
returns uuid
language plpgsql
stable
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: assert the caller manages a tournament. Raises if not.
-- ---------------------------------------------------------------------------
create or replace function public.app_require_tournament_manager(p_tournament_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  ok boolean;
begin
  select exists (
    select 1 from public.tournament_members tm
    where tm.tournament_id = p_tournament_id
      and tm.user_id = uid
      and tm.role in ('owner', 'organizer')
  ) into ok;
  if not ok then
    raise exception 'not authorized to manage tournament %', p_tournament_id
      using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create a tournament and (optionally) bulk-insert placeholder players.
-- Returns the new tournament's id.
-- ---------------------------------------------------------------------------
create or replace function public.app_create_tournament(
  p_name text,
  p_format text,
  p_whatsapp_group_url text,
  p_player_count int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  v_name text := trim(coalesce(p_name, ''));
  v_format text := coalesce(nullif(trim(p_format), ''), 'round_robin');
  v_url text := nullif(trim(coalesce(p_whatsapp_group_url, '')), '');
  v_count int := greatest(0, least(coalesce(p_player_count, 0), 64));
  new_id uuid;
begin
  if length(v_name) < 3 or length(v_name) > 120 then
    raise exception 'tournament name must be 3-120 characters' using errcode = '22023';
  end if;
  if v_format not in ('round_robin', 'fixed_partners', 'bracket') then
    raise exception 'unknown format %', v_format using errcode = '22023';
  end if;
  if v_url is not null and v_url not like 'https://chat.whatsapp.com/%' then
    raise exception 'invalid WhatsApp group URL' using errcode = '22023';
  end if;

  insert into public.tournaments (owner_user_id, name, format, whatsapp_group_url)
  values (uid, v_name, v_format, v_url)
  returning id into new_id;

  -- The tournament_owner_member trigger seeds tournament_members; we just
  -- need to add placeholder players if requested.
  if v_count > 0 then
    insert into public.tournament_players (tournament_id, display_name)
    select new_id, format('Player %s', g)
    from generate_series(1, v_count) as g;
  end if;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Update tournament metadata (name + WhatsApp link).
-- ---------------------------------------------------------------------------
create or replace function public.app_update_tournament(
  p_tournament_id uuid,
  p_name text,
  p_whatsapp_group_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_url text := nullif(trim(coalesce(p_whatsapp_group_url, '')), '');
begin
  perform public.app_require_tournament_manager(p_tournament_id);

  if length(v_name) < 3 or length(v_name) > 120 then
    raise exception 'tournament name must be 3-120 characters' using errcode = '22023';
  end if;
  if v_url is not null and v_url not like 'https://chat.whatsapp.com/%' then
    raise exception 'invalid WhatsApp group URL' using errcode = '22023';
  end if;

  update public.tournaments
     set name = v_name,
         whatsapp_group_url = v_url
   where id = p_tournament_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Add a single player to a tournament.
-- ---------------------------------------------------------------------------
create or replace function public.app_add_tournament_player(
  p_tournament_id uuid,
  p_display_name text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  new_id uuid;
begin
  perform public.app_require_tournament_manager(p_tournament_id);

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'player name must be 2-120 characters' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;

  insert into public.tournament_players (tournament_id, display_name, email)
  values (p_tournament_id, v_name, v_email)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rename a player (display name only).
-- ---------------------------------------------------------------------------
create or replace function public.app_rename_tournament_player(
  p_player_id uuid,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
  v_tournament_id uuid;
begin
  select tp.tournament_id into v_tournament_id
    from public.tournament_players tp
   where tp.id = p_player_id;
  if v_tournament_id is null then
    raise exception 'player not found' using errcode = '02000';
  end if;
  perform public.app_require_tournament_manager(v_tournament_id);

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'player name must be 2-120 characters' using errcode = '22023';
  end if;

  update public.tournament_players
     set display_name = v_name
   where id = p_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete a player.
-- ---------------------------------------------------------------------------
create or replace function public.app_remove_tournament_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
begin
  select tp.tournament_id into v_tournament_id
    from public.tournament_players tp
   where tp.id = p_player_id;
  if v_tournament_id is null then
    raise exception 'player not found' using errcode = '02000';
  end if;
  perform public.app_require_tournament_manager(v_tournament_id);

  delete from public.tournament_players where id = p_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Round-robin match generation.
-- Wipes existing matches for the tournament and inserts pairings A vs B for
-- every (i,j) where i<j across the player roster ordered by created_at.
-- Matches are spread across courts 1..p_court_count.
-- ---------------------------------------------------------------------------
create or replace function public.app_generate_round_robin_matches(
  p_tournament_id uuid,
  p_court_count int default 4
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_courts int := greatest(1, least(coalesce(p_court_count, 4), 16));
  v_count int;
begin
  uid := public.app_require_auth();
  perform public.app_require_tournament_manager(p_tournament_id);

  if (select count(*) from public.tournament_players where tournament_id = p_tournament_id) < 2 then
    raise exception 'add at least 2 players before generating matches' using errcode = '22023';
  end if;

  delete from public.matches
   where tournament_id = p_tournament_id
     and team_a_score is null
     and team_b_score is null;

  with players as (
    select display_name,
           row_number() over (order by created_at, id) as rn
      from public.tournament_players
     where tournament_id = p_tournament_id
  ),
  pairs as (
    select a.display_name as a_name,
           b.display_name as b_name,
           row_number() over (order by a.rn, b.rn) as idx
      from players a
      join players b on b.rn > a.rn
  ),
  inserted as (
    insert into public.matches (
      tournament_id, round_label, court_label,
      team_a_label, team_b_label, created_by_user_id
    )
    select
      p_tournament_id,
      format('Round %s', ((idx - 1) / v_courts) + 1),
      format('Court %s', ((idx - 1) % v_courts) + 1),
      a_name,
      b_name,
      uid
    from pairs
    returning id
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Score a match (sets team scores + winner_side + completed_at).
-- Either both scores or neither must be supplied (clearing).
-- ---------------------------------------------------------------------------
create or replace function public.app_score_match(
  p_match_id uuid,
  p_team_a_score int,
  p_team_b_score int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_winner text;
begin
  select tournament_id into v_tournament_id from public.matches where id = p_match_id;
  if v_tournament_id is null then
    raise exception 'match not found' using errcode = '02000';
  end if;
  perform public.app_require_tournament_manager(v_tournament_id);

  if p_team_a_score is null and p_team_b_score is null then
    update public.matches
       set team_a_score = null,
           team_b_score = null,
           winner_side = null,
           completed_at = null
     where id = p_match_id;
    return;
  end if;

  if p_team_a_score is null or p_team_b_score is null then
    raise exception 'both scores required when reporting a result' using errcode = '22023';
  end if;
  if p_team_a_score < 0 or p_team_b_score < 0 then
    raise exception 'scores cannot be negative' using errcode = '22023';
  end if;

  v_winner := case
    when p_team_a_score > p_team_b_score then 'a'
    when p_team_b_score > p_team_a_score then 'b'
    else null
  end;

  update public.matches
     set team_a_score = p_team_a_score,
         team_b_score = p_team_b_score,
         winner_side = v_winner,
         completed_at = case when v_winner is null then null else now() end
   where id = p_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Save profile fields for the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.app_save_profile(
  p_display_name text,
  p_full_name text,
  p_gender text,
  p_dupr_id text,
  p_dupr_singles numeric,
  p_dupr_doubles numeric,
  p_bio text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  v_display text := trim(coalesce(p_display_name, ''));
  v_full text := nullif(trim(coalesce(p_full_name, '')), '');
  v_gender text := nullif(trim(coalesce(p_gender, '')), '');
  v_dupr_id text := nullif(trim(coalesce(p_dupr_id, '')), '');
  v_bio text := nullif(trim(coalesce(p_bio, '')), '');
begin
  if length(v_display) < 1 or length(v_display) > 80 then
    raise exception 'display name must be 1-80 characters' using errcode = '22023';
  end if;
  if v_gender is not null and v_gender not in ('m','f','x') then
    raise exception 'invalid gender' using errcode = '22023';
  end if;
  if p_dupr_singles is not null and (p_dupr_singles < 2 or p_dupr_singles > 8) then
    raise exception 'DUPR singles out of range (2-8)' using errcode = '22023';
  end if;
  if p_dupr_doubles is not null and (p_dupr_doubles < 2 or p_dupr_doubles > 8) then
    raise exception 'DUPR doubles out of range (2-8)' using errcode = '22023';
  end if;
  if v_bio is not null and length(v_bio) > 500 then
    raise exception 'bio must be at most 500 characters' using errcode = '22023';
  end if;

  update public.profiles
     set display_name = v_display,
         full_name = v_full,
         gender = v_gender,
         dupr_id = v_dupr_id,
         dupr_singles = p_dupr_singles,
         dupr_doubles = p_dupr_doubles,
         bio = v_bio
   where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. SECURITY DEFINER alone is not enough; authenticated must be allowed
-- to EXECUTE these functions. Anonymous users cannot call them.
-- ---------------------------------------------------------------------------
revoke all on function public.app_require_auth() from public;
revoke all on function public.app_require_tournament_manager(uuid) from public;

revoke all on function public.app_create_tournament(text, text, text, int) from public;
grant  execute on function public.app_create_tournament(text, text, text, int) to authenticated;

revoke all on function public.app_update_tournament(uuid, text, text) from public;
grant  execute on function public.app_update_tournament(uuid, text, text) to authenticated;

revoke all on function public.app_add_tournament_player(uuid, text, text) from public;
grant  execute on function public.app_add_tournament_player(uuid, text, text) to authenticated;

revoke all on function public.app_rename_tournament_player(uuid, text) from public;
grant  execute on function public.app_rename_tournament_player(uuid, text) to authenticated;

revoke all on function public.app_remove_tournament_player(uuid) from public;
grant  execute on function public.app_remove_tournament_player(uuid) to authenticated;

revoke all on function public.app_generate_round_robin_matches(uuid, int) from public;
grant  execute on function public.app_generate_round_robin_matches(uuid, int) to authenticated;

revoke all on function public.app_score_match(uuid, int, int) from public;
grant  execute on function public.app_score_match(uuid, int, int) to authenticated;

revoke all on function public.app_save_profile(text, text, text, text, numeric, numeric, text) from public;
grant  execute on function public.app_save_profile(text, text, text, text, numeric, numeric, text) to authenticated;
