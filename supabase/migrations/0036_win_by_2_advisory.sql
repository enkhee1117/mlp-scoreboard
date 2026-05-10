-- Win-by-2 is now advisory on the client (warning instead of hard gate),
-- so the server has to be willing to finalize an 11-10 when the user
-- explicitly hits End. Drop the win_by check from app_score_match_v2 —
-- whoever is ahead at target score takes the game.
--
-- Tied-at-target (e.g., 11-11) stays as an in-progress row since there's
-- no winner yet. The keypad UI doesn't allow ties at the target anyway
-- without going past it, but the server stays defensive.

set search_path = public;

create or replace function public.app_score_match_v2(
  p_match_id uuid,
  p_games jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_division_id uuid;
  v_target int := 11;
  v_win_by int := 2;
  v_best_of int := 1;
  v_count int := 0;
  v_games_a int := 0;
  v_games_b int := 0;
  v_total_a int := 0;
  v_total_b int := 0;
  v_winner text := null;
  v_completed timestamptz := null;
  i int;
  game_elem jsonb;
  a int;
  b int;
begin
  v_tournament_id := public.app_require_match_scorer(p_match_id);

  select m.division_id into v_division_id from public.matches m where m.id = p_match_id;

  if v_division_id is not null then
    select target_score, win_by, best_of
      into v_target, v_win_by, v_best_of
      from public.divisions where id = v_division_id;
  end if;

  if jsonb_typeof(p_games) is distinct from 'array' then
    raise exception 'games must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_games) > 5 then
    raise exception 'too many games' using errcode = '22023';
  end if;

  delete from public.match_games where match_id = p_match_id;

  for i in 0..(jsonb_array_length(p_games) - 1) loop
    game_elem := p_games -> i;
    if jsonb_typeof(game_elem) is distinct from 'array'
       or jsonb_array_length(game_elem) <> 2 then
      raise exception 'each game must be [a, b]' using errcode = '22023';
    end if;
    a := (game_elem ->> 0)::int;
    b := (game_elem ->> 1)::int;
    if a < 0 or b < 0 or a > 99 or b > 99 then
      raise exception 'score out of range' using errcode = '22023';
    end if;
    insert into public.match_games(match_id, game_no, team_a_score, team_b_score)
      values (p_match_id, i + 1, a, b);
    v_count := v_count + 1;
    v_total_a := v_total_a + a;
    v_total_b := v_total_b + b;
    -- Whoever is ahead at target wins. Win-by-2 is advisory (the client
    -- shows a warning when the gap is < 2 but lets the user finish anyway).
    if (a >= v_target or b >= v_target) and a <> b then
      if a > b then v_games_a := v_games_a + 1; else v_games_b := v_games_b + 1; end if;
    end if;
  end loop;

  if v_games_a > v_games_b and v_games_a >= (v_best_of / 2) + 1 then
    v_winner := 'a';
    v_completed := now();
  elsif v_games_b > v_games_a and v_games_b >= (v_best_of / 2) + 1 then
    v_winner := 'b';
    v_completed := now();
  end if;

  update public.matches
     set team_a_score = v_total_a,
         team_b_score = v_total_b,
         winner_side = v_winner,
         completed_at = v_completed
   where id = p_match_id;
end;
$$;

revoke all on function public.app_score_match_v2(uuid, jsonb) from public;
grant execute on function public.app_score_match_v2(uuid, jsonb) to authenticated;
