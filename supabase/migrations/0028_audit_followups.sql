-- Audit follow-ups + balanced-pairing data prep.
--
-- 1. tournament_players.dupr was numeric(3,2) but profiles.dupr_doubles is
--    numeric(4,3). Copying via cast to (3,2) silently truncated 4.123 to
--    4.12. Bumping to (4,3) so DUPR scores round-trip cleanly.
-- 2. The wizard's app_create_tournament seeded placeholder players with
--    only a display_name; dupr was null. Balanced/snake pairing on a
--    fresh tournament collapsed to "every player == 3.20 default". Now
--    we seed dupr=3.20 in the same INSERT so balanced pairing has a
--    consistent baseline until the organizer overrides per player.
-- 3. app_create_tournament_minimal was a sibling RPC nobody calls; drop
--    it before the next dev wonders which to maintain.

set search_path = public;

-- 1. Bump DUPR precision so casts from profiles don't lose digits.
alter table public.tournament_players
  alter column dupr type numeric(4,3) using dupr::numeric(4,3);

-- 2. Re-issue app_create_tournament so the wizard seed sets dupr=3.20.
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
    insert into public.tournament_players (tournament_id, display_name, dupr)
    select
      new_id,
      v_names[(((row_number() over (order by random())) - 1) % array_length(v_names, 1) + 1)::int],
      3.200
    from generate_series(1, v_count);
  end if;

  return new_id;
end;
$$;

revoke all on function public.app_create_tournament(text, text, text, int, text, text) from public;
grant execute on function public.app_create_tournament(text, text, text, int, text, text) to authenticated;

-- 3. Drop the unreferenced minimal variant so future contributors don't
-- patch the wrong one.
drop function if exists public.app_create_tournament_minimal(text, text, text, int, text);

-- 4. Fix the cast in app_add_tournament_player so the dupr from profile
-- preserves all three decimals.
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
  v_dupr numeric(4,3) := p_dupr;
  v_profile_dupr numeric(4,3);
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

  if v_dupr is null and v_profile is not null then
    select coalesce(dupr_doubles, dupr_singles)
      into v_profile_dupr
      from public.profiles where id = v_profile;
    v_dupr := v_profile_dupr;
  end if;
  if v_dupr is null then
    v_dupr := 3.200;
  end if;

  insert into public.tournament_players (tournament_id, display_name, email, phone, profile_id, dupr)
  values (p_tournament_id, v_name, v_email, v_phone, v_profile, v_dupr)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.app_add_tournament_player(uuid, text, text, text, numeric) from public;
grant execute on function public.app_add_tournament_player(uuid, text, text, text, numeric) to authenticated;
