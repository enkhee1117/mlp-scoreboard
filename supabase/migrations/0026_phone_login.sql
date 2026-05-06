-- Switch primary auth from email to phone. Existing email accounts keep
-- working (Supabase auth supports both side-by-side); the change here is
-- the new-user trigger so signups via phone end up with a populated
-- profiles row + profiles.phone.

set search_path = public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invite_role public.app_role;
  v_phone text := nullif(new.phone, '');
  v_email text := nullif(new.email, '');
  -- Display name precedence: explicit metadata > prefix-of-email > phone
  -- (we never want a NOT NULL profiles.display_name to be blank).
  v_display text := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    case when v_email is not null then split_part(v_email, '@', 1) end,
    v_phone,
    'Player'
  );
begin
  if v_email is not null then
    select i.role into invite_role
    from public.invites i
    where lower(i.email) = lower(v_email) and i.accepted_at is null
    order by i.created_at desc
    limit 1;
  end if;

  insert into public.profiles (id, display_name, role, phone)
  values (
    new.id,
    v_display,
    coalesce(invite_role, 'player'),
    -- Auth.users phone may not match our E.164 constraint exactly; only
    -- adopt it when it does to avoid a constraint failure.
    case when v_phone ~ '^\+[1-9][0-9]{6,14}$' then v_phone end
  );

  if v_email is not null then
    update public.invites
       set accepted_at = now(), accepted_by = new.id
     where lower(email) = lower(v_email) and accepted_at is null;
  end if;

  return new;
end;
$$;
