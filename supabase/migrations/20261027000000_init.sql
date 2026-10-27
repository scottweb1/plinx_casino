-- Plinko Casino: konti (navn + adgangskode, ingen mail) og leaderboard.
-- Kør hele filen i Supabase -> SQL Editor, ELLER med CLI: supabase db push
-- Alle beløb er VIRTUELLE legepenge i hele cent.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text   not null check (char_length(username) between 3 and 16),
  balance       bigint not null default 0 check (balance >= 0),
  base          bigint not null default 0,
  start_amount  bigint not null default 0,
  total_won     bigint not null default 0 check (total_won  >= 0),  -- sum af nettogevinster
  total_lost    bigint not null default 0 check (total_lost >= 0),  -- sum af nettotab
  rounds        integer not null default 0 check (rounds >= 0),
  best_win      bigint not null default 0 check (best_win >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists profiles_balance_idx    on public.profiles (balance desc);
create index if not exists profiles_total_won_idx  on public.profiles (total_won desc);
create index if not exists profiles_total_lost_idx on public.profiles (total_lost desc);

-- Sikkerhed: kun indloggede kan læse leaderboardet; man kan kun ændre sin EGEN række,
-- og kun de kolonner der hører til spillet. Rækker oprettes kun af triggeren herunder.
alter table public.profiles enable row level security;

drop policy if exists "leaderboard kan læses af indloggede" on public.profiles;
create policy "leaderboard kan læses af indloggede"
  on public.profiles for select to authenticated using (true);

drop policy if exists "opdater egen række" on public.profiles;
create policy "opdater egen række"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (balance, base, total_won, total_lost, rounds, best_win) on public.profiles to authenticated;

-- Opret profil automatisk når en konto oprettes (navn og startsaldo kommer fra signUp-metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := left(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), 16);
  st    bigint;
begin
  if char_length(uname) < 3 then
    raise exception 'invalid username';
  end if;
  begin
    st := (new.raw_user_meta_data ->> 'start')::bigint;
  exception when others then
    st := 1000;
  end;
  if st is null or st not in (500, 1000, 10000, 50000) then st := 1000; end if;

  insert into public.profiles (id, username, balance, base, start_amount)
  values (new.id, uname, st * 100, st * 100, st * 100);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Simpel vagt: navn kan ikke ændres, og tællere kan ikke gå baglæns.
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if new.id <> old.id or new.username <> old.username then
    raise exception 'profile is immutable';
  end if;
  if new.rounds < old.rounds or new.total_won < old.total_won
     or new.total_lost < old.total_lost or new.best_win < old.best_win then
    raise exception 'counters cannot decrease';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles for each row execute function public.guard_profile_update();
