-- Enable this extension in Supabase if it is not already enabled.
create extension if not exists pgcrypto;

-- Roles are assigned by an administrator only. Browser clients cannot change profiles.role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'subscriber'
    check (role in ('super_admin','chief_editor','news_editor','reporter','writer','guest','subscriber')),
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'subscriber')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_newsroom_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('super_admin','chief_editor','news_editor'), false)
$$;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  category text not null,
  summary text not null check (char_length(summary) <= 300),
  body text not null,
  image_url text,
  status text not null default 'draft' check (status in ('draft','review','published','rejected')),
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_article_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_article_updated_at on public.articles;
create trigger set_article_updated_at before update on public.articles
for each row execute procedure public.set_article_updated_at();

alter table public.profiles enable row level security;
alter table public.articles enable row level security;

-- Profiles are readable only by their owner and newsroom editors. There is deliberately
-- no client insert/update/delete policy, so a user cannot grant themselves a role.
drop policy if exists "Profile owner or editor can read profiles" on public.profiles;
create policy "Profile owner or editor can read profiles" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_newsroom_editor());

-- Public can read published news. Signed-in writers see their own work; editors see all.
drop policy if exists "Read published or permitted newsroom articles" on public.articles;
create policy "Read published or permitted newsroom articles" on public.articles
for select to anon, authenticated
using (
  status = 'published'
  or (select auth.uid()) = author_id
  or public.is_newsroom_editor()
);

-- Insert policy prevents contributor/author roles from creating published content.
drop policy if exists "Authorized newsroom users can create articles" on public.articles;
create policy "Authorized newsroom users can create articles" on public.articles
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.current_user_role() in ('super_admin','chief_editor','news_editor')
    or (public.current_user_role() in ('reporter','writer') and status in ('draft','review'))
    or (public.current_user_role() = 'guest' and status = 'draft')
  )
);

-- Editors can manage newsroom content. Writers can only change their own non-published
-- work and cannot change its status to published. Guests can only keep their own drafts.
drop policy if exists "Editors and authors can update permitted articles" on public.articles;
create policy "Editors and authors can update permitted articles" on public.articles
for update to authenticated
using (
  public.current_user_role() in ('super_admin','chief_editor','news_editor')
  or (author_id = (select auth.uid()) and public.current_user_role() in ('reporter','writer') and status in ('draft','review','rejected'))
  or (author_id = (select auth.uid()) and public.current_user_role() = 'guest' and status = 'draft')
)
with check (
  (public.current_user_role() in ('super_admin','chief_editor','news_editor'))
  or (author_id = (select auth.uid()) and public.current_user_role() in ('reporter','writer') and status in ('draft','review','rejected'))
  or (author_id = (select auth.uid()) and public.current_user_role() = 'guest' and status = 'draft')
);

drop policy if exists "Only super admin can delete articles" on public.articles;
create policy "Only super admin can delete articles" on public.articles
for delete to authenticated
using (public.current_user_role() = 'super_admin');

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
