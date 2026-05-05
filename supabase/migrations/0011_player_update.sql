-- Combined rename + email update for tournament players. The existing
-- app_rename_tournament_player only touches display_name; the invite/roster
-- screen needs to set or change a player's email so we can link them to
-- their profile when they sign up.

set search_path = public;

create or replace function public.app_update_tournament_player(
  p_player_id uuid,
  p_display_name text,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_name text := trim(coalesce(p_display_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  select tournament_id into v_tournament_id
    from public.tournament_players where id = p_player_id;
  if v_tournament_id is null then
    raise exception 'player not found' using errcode = '02000';
  end if;
  perform public.app_require_tournament_manager(v_tournament_id);

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'player name must be 2-120 characters' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid email address' using errcode = '22023';
  end if;

  update public.tournament_players
     set display_name = v_name,
         email = v_email
   where id = p_player_id;
end;
$$;

revoke all on function public.app_update_tournament_player(uuid, text, text) from public;
grant execute on function public.app_update_tournament_player(uuid, text, text) to authenticated;
