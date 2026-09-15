-- Supabase SQL Editor'da bir kez çalıştırın. Bu şema mevcut mock verileri taşımaz.
-- Rol ve jeton bakiyesi istemciden güncellenemez; ödeme kredisi güvenilir sunucudan yazılmalıdır.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 40),
  avatar_url text,
  secret_code text not null unique check (secret_code ~ '^[A-Z0-9]{12}$'),
  role text not null default 'user' check (role in ('admin', 'falci', 'user')),
  token_balance integer not null default 0 check (token_balance >= 0),
  ban_type text not null default 'none' check (ban_type in ('none', 'full_ban', 'chat_only_ban')),
  admin_title text check (admin_title is null or char_length(admin_title) <= 30),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.generate_secret_code()
returns text language sql volatile set search_path = '' as $$
  select upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  candidate_username text;
  attempt integer;
begin
  candidate_username := left(coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data->>'username'), ''), 'user_' || left(new.id::text, 8)), 40);
  if char_length(candidate_username) < 3 then candidate_username := 'user_' || left(new.id::text, 8); end if;
  for attempt in 1..5 loop
    begin
      insert into public.profiles (id, username, secret_code)
      values (new.id, candidate_username, public.generate_secret_code());
      return new;
    exception when unique_violation then
      if exists (select 1 from public.profiles where id = new.id) then raise; end if;
    end;
  end loop;
  raise exception 'Could not allocate a unique secret code';
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create schema if not exists private;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and ban_type = 'none');
$$;
create or replace function private.can_write()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and ban_type <> 'full_ban');
$$;
create or replace function private.can_chat()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and ban_type = 'none');
$$;
create or replace function private.is_active_falci()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and role = 'falci' and ban_type = 'none');
$$;

create table if not exists public.stories (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  caption text check (caption is null or char_length(caption) <= 2000),
  created_at timestamptz not null default now(),
  constraint story_has_content check (image_url is not null or nullif(pg_catalog.btrim(caption), '') is not null)
);
create index if not exists stories_created_at_idx on public.stories (created_at desc);
create index if not exists stories_user_id_idx on public.stories (user_id);

create table if not exists public.story_replies (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(pg_catalog.btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists story_replies_story_id_idx on public.story_replies (story_id, created_at);
create index if not exists story_replies_sender_id_idx on public.story_replies (sender_id);

create or replace function public.valid_eight_photos(photos text[])
returns boolean language sql immutable set search_path = '' as $$
  select pg_catalog.cardinality(photos) = 8
    and not exists (select 1 from pg_catalog.unnest(photos) as photo(path) where path is null or pg_catalog.btrim(path) = '')
    and (select count(distinct path) from pg_catalog.unnest(photos) as photo(path)) = 8;
$$;

create table if not exists public.coffee_fal_requests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  falci_id uuid references public.profiles(id) on delete set null,
  "8_photos_array" text[] not null check (public.valid_eight_photos("8_photos_array")),
  expert_style text check (expert_style is null or expert_style in ('aylin', 'mira', 'luna')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'rejected')),
  result_text text,
  created_at timestamptz not null default now()
);
create index if not exists coffee_requests_user_id_idx on public.coffee_fal_requests (user_id, created_at desc);
create index if not exists coffee_requests_falci_id_idx on public.coffee_fal_requests (falci_id, status);

create or replace function public.validate_falci_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.falci_id is not null and not exists (
    select 1 from public.profiles where id = new.falci_id and role = 'falci' and ban_type = 'none'
  ) then raise exception 'falci_id must reference an active falci profile'; end if;
  return new;
end;
$$;
drop trigger if exists validate_falci_assignment on public.coffee_fal_requests;
create trigger validate_falci_assignment before insert or update of falci_id
on public.coffee_fal_requests for each row execute function public.validate_falci_assignment();

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_replies enable row level security;
alter table public.coffee_fal_requests enable row level security;

-- Eski Supabase projelerinde otomatik verilmiş geniş izinleri kaldır.
revoke all on public.profiles, public.stories, public.story_replies, public.coffee_fal_requests from anon, authenticated;
grant select (id, username, avatar_url, role, ban_type, admin_title, is_private, created_at)
  on public.profiles to authenticated;
grant update (username, avatar_url, is_private) on public.profiles to authenticated;
grant select, insert, delete on public.stories to authenticated;
grant select, insert on public.story_replies to authenticated;
grant select, insert on public.coffee_fal_requests to authenticated;
grant update (status, result_text) on public.coffee_fal_requests to authenticated;

revoke all on function public.generate_secret_code() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_falci_assignment() from public, anon, authenticated;
revoke all on function public.valid_eight_photos(text[]) from public, anon;
grant execute on function public.valid_eight_photos(text[]) to authenticated;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.can_write() from public, anon;
revoke all on function private.can_chat() from public, anon;
revoke all on function private.is_active_falci() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(), private.can_write(), private.can_chat(), private.is_active_falci() to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or ((select private.can_write()) and (
    (not is_private and ban_type <> 'full_ban') or (select private.is_admin())
  ))
);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid()) and ban_type <> 'full_ban')
with check (id = (select auth.uid()) and ban_type <> 'full_ban');

drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories for select to authenticated using (
  (select private.can_write()) and (user_id = (select auth.uid()) or (select private.is_admin()) or exists (
    select 1 from public.profiles p where p.id = user_id
      and p.is_private = false and p.ban_type <> 'full_ban'
  ))
);
drop policy if exists stories_insert_own on public.stories;
create policy stories_insert_own on public.stories for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_write()));
drop policy if exists stories_delete_own on public.stories;
create policy stories_delete_own on public.stories for delete to authenticated
using ((select private.can_write()) and (user_id = (select auth.uid()) or (select private.is_admin())));

drop policy if exists story_replies_read on public.story_replies;
create policy story_replies_read on public.story_replies for select to authenticated using (
  (select private.can_write()) and (sender_id = (select auth.uid()) or exists (
    select 1 from public.stories s where s.id = story_id and s.user_id = (select auth.uid())
  ) or (select private.is_admin()))
);
drop policy if exists story_replies_insert on public.story_replies;
create policy story_replies_insert on public.story_replies for insert to authenticated with check (
  sender_id = (select auth.uid()) and (select private.can_chat()) and exists (
    select 1 from public.stories s join public.profiles p on p.id = s.user_id
    where s.id = story_id and s.user_id <> (select auth.uid()) and p.ban_type = 'none'
  )
);

drop policy if exists coffee_requests_read on public.coffee_fal_requests;
create policy coffee_requests_read on public.coffee_fal_requests for select to authenticated using (
  (select private.can_write()) and (user_id = (select auth.uid()) or (falci_id = (select auth.uid()) and (select private.is_active_falci())) or (select private.is_admin()))
);
drop policy if exists coffee_requests_insert_own on public.coffee_fal_requests;
create policy coffee_requests_insert_own on public.coffee_fal_requests for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'queued' and result_text is null
  and (select private.can_write())
);
drop policy if exists coffee_requests_update_result on public.coffee_fal_requests;
create policy coffee_requests_update_result on public.coffee_fal_requests for update to authenticated
using ((falci_id = (select auth.uid()) and (select private.is_active_falci())) or (select private.is_admin()))
with check ((falci_id = (select auth.uid()) and (select private.is_active_falci())) or (select private.is_admin()));

-- Kahve ve story kovaları özel; avatar kovası herkese açık URL üretir.
insert into storage.buckets (id, name, public) values
  ('story-media', 'story-media', false),
  ('coffee-photos', 'coffee-photos', false),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists story_media_read on storage.objects;
create policy story_media_read on storage.objects for select to authenticated
using ((select private.can_write()) and (bucket_id = 'avatars' or (bucket_id = 'story-media' and (
  pg_catalog.split_part(name, '/', 1) = (select auth.uid())::text
  or (select private.is_admin())
  or exists (select 1 from public.profiles p
    where p.id::text = pg_catalog.split_part(name, '/', 1)
      and p.is_private = false and p.ban_type <> 'full_ban')
))));
drop policy if exists story_media_insert on storage.objects;
create policy story_media_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('story-media', 'avatars')
  and pg_catalog.split_part(name, '/', 1) = (select auth.uid())::text
  and (select private.can_write())
);
drop policy if exists coffee_photos_read on storage.objects;
create policy coffee_photos_read on storage.objects for select to authenticated using (
  (select private.can_write()) and bucket_id = 'coffee-photos' and (
    pg_catalog.split_part(name, '/', 1) = (select auth.uid())::text
    or (select private.is_admin())
    or ((select private.is_active_falci()) and exists (
      select 1 from public.coffee_fal_requests r
      where r.falci_id = (select auth.uid()) and name = any(r."8_photos_array")
    ))
  )
);
drop policy if exists coffee_photos_insert on storage.objects;
create policy coffee_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'coffee-photos'
  and pg_catalog.split_part(name, '/', 1) = (select auth.uid())::text
  and (select private.can_write())
);
drop policy if exists own_media_delete on storage.objects;
create policy own_media_delete on storage.objects for delete to authenticated using (
  bucket_id in ('story-media', 'coffee-photos', 'avatars')
  and pg_catalog.split_part(name, '/', 1) = (select auth.uid())::text
  and (select private.can_write())
);

-- İlk admini yalnızca SQL Editor / güvenilir servis rolüyle atayın:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
