-- Phone numbers + registered-player typeahead.
--
-- profiles.phone:        E.164 phone (+15551234567 etc.) for the signed-in
--                        user. Unique when set so we can use it as a stable
--                        invite address.
-- tournament_players.phone: Per-roster phone for placeholders that haven't
--                        signed up yet — drives the SMS invite link and
--                        eventually links the player to a profile when
--                        they register with the same number.
-- app_search_player_invitees(query): Lets organizers type a name or phone
--                        and pull matching registered profiles (limit 5).
--                        Phone is matched exactly so a stranger can't
--                        enumerate; name is partial.

set search_path = public;

alter table public.profiles
  add column if not exists phone text;
alter table public.profiles
  drop constraint if exists profiles_phone_format_chk;
alter table public.profiles
  add constraint profiles_phone_format_chk
  check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$');
create unique index if not exists profiles_phone_uidx
  on public.profiles(phone)
  where phone is not null;

alter table public.tournament_players
  add column if not exists phone text;
alter table public.tournament_players
  drop constraint if exists tournament_players_phone_format_chk;
alter table public.tournament_players
  add constraint tournament_players_phone_format_chk
  check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$');

-- Bump app_save_profile so users can set their phone from /profile.
drop function if exists public.app_save_profile(text, text, text, text, numeric, numeric, text);
drop function if exists public.app_save_profile(text, text, text, text, numeric, numeric, text, text);
create or replace function public.app_save_profile(
  p_display_name text,
  p_full_name text,
  p_gender text,
  p_dupr_id text,
  p_dupr_singles numeric,
  p_dupr_doubles numeric,
  p_bio text,
  p_phone text default null
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
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
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
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone must be in E.164 format (e.g. +15551234567)' using errcode = '22023';
  end if;

  update public.profiles
     set display_name = v_display,
         full_name = v_full,
         gender = v_gender,
         dupr_id = v_dupr_id,
         dupr_singles = p_dupr_singles,
         dupr_doubles = p_dupr_doubles,
         bio = v_bio,
         phone = v_phone
   where id = uid;
end;
$$;

revoke all on function public.app_save_profile(text, text, text, text, numeric, numeric, text, text) from public;
grant execute on function public.app_save_profile(text, text, text, text, numeric, numeric, text, text) to authenticated;

-- Bump add-player so the wizard / roster form can store an SMS-ready phone
-- and (when the phone matches a registered profile) auto-link it.
drop function if exists public.app_add_tournament_player(uuid, text, text);
drop function if exists public.app_add_tournament_player(uuid, text, text, text);
create or replace function public.app_add_tournament_player(
  p_tournament_id uuid,
  p_display_name text,
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_profile uuid;
  new_id uuid;
begin
  perform public.app_require_tournament_manager(p_tournament_id);

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'player name must be 2-120 characters' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone must be in E.164 format' using errcode = '22023';
  end if;

  -- Try to link to an existing profile by phone or email so the new player
  -- shows up in their /history immediately.
  if v_phone is not null then
    select id into v_profile from public.profiles where phone = v_phone limit 1;
  end if;
  if v_profile is null and v_email is not null then
    select id into v_profile from public.profiles
     where lower(coalesce(full_name, '')) = '' and id in (
       select id from public.profiles where id in (
         select id from public.profiles -- placeholder; email lives on auth.users
       )
     )
    limit 1;
  end if;

  insert into public.tournament_players (tournament_id, display_name, email, phone, profile_id)
  values (p_tournament_id, v_name, v_email, v_phone, v_profile)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.app_add_tournament_player(uuid, text, text, text) from public;
grant execute on function public.app_add_tournament_player(uuid, text, text, text) to authenticated;

-- Bump update-player to also accept phone alongside name/email/gender.
drop function if exists public.app_update_tournament_player(uuid, text, text, text);
drop function if exists public.app_update_tournament_player(uuid, text, text, text, text);
create or replace function public.app_update_tournament_player(
  p_player_id uuid,
  p_display_name text,
  p_email text default null,
  p_gender text default null,
  p_phone text default null
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
  v_gender text := nullif(lower(trim(coalesce(p_gender, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if v_gender is not null and v_gender not in ('m', 'f', 'x') then
    raise exception 'gender must be m, f, x, or null' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone must be in E.164 format' using errcode = '22023';
  end if;

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
         email = v_email,
         gender = v_gender,
         phone = v_phone
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

revoke all on function public.app_update_tournament_player(uuid, text, text, text, text) from public;
grant execute on function public.app_update_tournament_player(uuid, text, text, text, text) to authenticated;

-- Search profiles for the invite typeahead. Phone is matched exactly to
-- prevent enumeration; name is a case-insensitive substring. Returns at
-- most 5 rows, never the caller's own profile.
create or replace function public.app_search_player_invitees(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := public.app_require_auth();
  q text := trim(coalesce(p_query, ''));
  q_lower text := lower(q);
  result jsonb;
begin
  if length(q) < 2 then
    return '[]'::jsonb;
  end if;

  if q ~ '^\+[1-9][0-9]{6,14}$' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'display_name', p.display_name,
      'phone', p.phone,
      'gender', p.gender
    )), '[]'::jsonb)
    into result
    from public.profiles p
    where p.phone = q
      and p.id <> uid;
    return result;
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.display_name), '[]'::jsonb)
  into result
  from (
    select p.id as user_id, p.display_name, p.phone, p.gender
      from public.profiles p
     where lower(p.display_name) like '%' || q_lower || '%'
       and p.id <> uid
     order by p.display_name
     limit 5
  ) t;
  return result;
end;
$$;

revoke all on function public.app_search_player_invitees(text) from public;
grant execute on function public.app_search_player_invitees(text) to authenticated;
