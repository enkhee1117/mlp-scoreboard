-- Skill-balanced pairing needs DUPR per player + a tournament-level
-- pairing_mode so the generator knows whether to ignore skill (random)
-- or use it (balanced / snake).
--
-- Default DUPR is 3.20 — used when the organizer doesn't supply one and
-- the player has no profile to copy from. This keeps the balanced pairing
-- algorithm deterministic without forcing the organizer to enter a number
-- for every casual player.

set search_path = public;

alter table public.tournament_players
  add column if not exists dupr numeric(3,2);
alter table public.tournament_players
  drop constraint if exists tournament_players_dupr_chk;
alter table public.tournament_players
  add constraint tournament_players_dupr_chk
  check (dupr is null or (dupr >= 2 and dupr <= 8));

alter table public.tournaments
  add column if not exists pairing_mode text not null default 'random';
alter table public.tournaments
  drop constraint if exists tournaments_pairing_mode_chk;
alter table public.tournaments
  add constraint tournaments_pairing_mode_chk
  check (pairing_mode in ('random', 'balanced', 'snake'));

-- Bump app_create_tournament to also persist pairing_mode.
drop function if exists public.app_create_tournament(text, text, text, int, text);
drop function if exists public.app_create_tournament(text, text, text, int, text, text);
create or replace function public.app_create_tournament(
  p_name text,
  p_format text,
  p_whatsapp_group_url text,
  p_player_count int,
  p_gender_mode text default 'open',
  p_pairing_mode text default 'random'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := public.app_require_auth();
  v_name    text := trim(coalesce(p_name, ''));
  v_format  text := coalesce(nullif(trim(p_format), ''), 'round_robin');
  v_url     text := nullif(trim(coalesce(p_whatsapp_group_url, '')), '');
  v_count   int  := greatest(0, least(coalesce(p_player_count, 0), 64));
  v_gender_mode text := lower(trim(coalesce(p_gender_mode, 'open')));
  v_pairing text := lower(trim(coalesce(p_pairing_mode, 'random')));
  new_id    uuid;
  v_names   text[] := ARRAY[
    'Alex Rivera','Jordan Lee','Sam Patel','Casey Kim','Morgan Chen',
    'Taylor Nguyen','Blake Santos','Quinn Hernandez','Avery Ramirez','Drew Flores',
    'Jamie Torres','Reese Diaz','Parker Morales','Skyler Reyes','Cameron Ortiz',
    'Dakota Gutierrez','Hayden Vargas','Sage Castro','River Romero','Emery Mendez',
    'Phoenix Alvarez','Logan Banks','Finley Webb','Harper Stone','Oakley Brooks',
    'Elliot Hayes','Monroe Reid','Rowan Cole','Emerson Ward','Sloane Grant',
    'Kendall Holt','Lennon Fox','Marlowe Hunt','Sutton Day','Caspian Marsh',
    'Indigo Lane','Wren Park','Cypress Bell','Juniper Cross','Arlo Shaw',
    'Bodhi Walsh','Zara Quinn','Milo Sterling','Nova King','Leo Mercer',
    'Isla Tran','Eli Carr','Vera Nash','Kai Hammond','Ada Monroe',
    'Ivan Frost','Lena York','Hugo Steele','Mila Pierce','Theo Vance',
    'Nora Blake','Felix Cannon','Cora Bright','Oscar Page','Luna Hale',
    'Miles Knox','Iris West','Jude Hart','Violet Ray','Finn Moss',
    'Hazel Snow','Asher Lynn','Ruby Dale','Atticus Green','Stella Ford'
  ];
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
  if v_gender_mode not in ('open', 'mixed', 'same') then
    raise exception 'unknown gender_mode' using errcode = '22023';
  end if;
  if v_pairing not in ('random', 'balanced', 'snake') then
    raise exception 'unknown pairing_mode' using errcode = '22023';
  end if;

  insert into public.tournaments (owner_user_id, name, format, whatsapp_group_url, gender_mode, pairing_mode)
  values (uid, v_name, v_format, v_url, v_gender_mode, v_pairing)
  returning id into new_id;

  if v_count > 0 then
    insert into public.tournament_players (tournament_id, display_name)
    select
      new_id,
      v_names[(((row_number() over (order by random())) - 1) % array_length(v_names, 1) + 1)::int]
    from generate_series(1, v_count);
  end if;

  return new_id;
end;
$$;

revoke all on function public.app_create_tournament(text, text, text, int, text, text) from public;
grant execute on function public.app_create_tournament(text, text, text, int, text, text) to authenticated;

-- Bump app_add_tournament_player so the form can record DUPR. When the
-- caller doesn't supply one, copy from profiles.dupr_doubles (preferred)
-- or dupr_singles for an auto-linked profile, else default to 3.20 so
-- the balanced generator has a number to work with.
drop function if exists public.app_add_tournament_player(uuid, text, text, text);
drop function if exists public.app_add_tournament_player(uuid, text, text, text, numeric);
create or replace function public.app_add_tournament_player(
  p_tournament_id uuid,
  p_display_name text,
  p_email text default null,
  p_phone text default null,
  p_dupr numeric default null
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
  v_dupr numeric(3,2) := p_dupr;
  v_profile_dupr numeric(3,2);
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
  if v_dupr is not null and (v_dupr < 2 or v_dupr > 8) then
    raise exception 'DUPR must be between 2 and 8' using errcode = '22023';
  end if;

  if v_phone is not null then
    select id into v_profile from public.profiles where phone = v_phone limit 1;
  end if;

  -- Pull DUPR from the linked profile when the caller didn't supply one.
  if v_dupr is null and v_profile is not null then
    select coalesce(dupr_doubles, dupr_singles)::numeric(3,2)
      into v_profile_dupr
      from public.profiles where id = v_profile;
    v_dupr := v_profile_dupr;
  end if;
  -- Fallback so the balanced pairing generator has a number to work with.
  if v_dupr is null then
    v_dupr := 3.20;
  end if;

  insert into public.tournament_players (tournament_id, display_name, email, phone, profile_id, dupr)
  values (p_tournament_id, v_name, v_email, v_phone, v_profile, v_dupr)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.app_add_tournament_player(uuid, text, text, text, numeric) from public;
grant execute on function public.app_add_tournament_player(uuid, text, text, text, numeric) to authenticated;

-- Bump app_update_tournament_player to accept dupr.
drop function if exists public.app_update_tournament_player(uuid, text, text, text, text);
drop function if exists public.app_update_tournament_player(uuid, text, text, text, text, numeric);
create or replace function public.app_update_tournament_player(
  p_player_id uuid,
  p_display_name text,
  p_email text default null,
  p_gender text default null,
  p_phone text default null,
  p_dupr numeric default null
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
  v_dupr numeric(3,2) := p_dupr;
begin
  if v_gender is not null and v_gender not in ('m', 'f', 'x') then
    raise exception 'gender must be m, f, x, or null' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'phone must be in E.164 format' using errcode = '22023';
  end if;
  if v_dupr is not null and (v_dupr < 2 or v_dupr > 8) then
    raise exception 'DUPR must be between 2 and 8' using errcode = '22023';
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
         phone = v_phone,
         dupr = v_dupr
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

revoke all on function public.app_update_tournament_player(uuid, text, text, text, text, numeric) from public;
grant execute on function public.app_update_tournament_player(uuid, text, text, text, text, numeric) to authenticated;

-- Search invitees now also returns dupr_doubles so the AddPlayerForm can
-- prefill the DUPR field when an organizer picks a registered profile.
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
      'gender', p.gender,
      'dupr', coalesce(p.dupr_doubles, p.dupr_singles)
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
    select p.id as user_id, p.display_name, p.phone, p.gender,
           coalesce(p.dupr_doubles, p.dupr_singles) as dupr
      from public.profiles p
     where lower(p.display_name) like '%' || q_lower || '%'
       and p.id <> uid
     order by p.display_name
     limit 5
  ) t;
  return result;
end;
$$;
