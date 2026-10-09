-- Run this in Supabase SQL Editor AFTER creating your Supabase Auth user.
-- Replace YOUR_AUTH_USER_UUID with the user's UUID from Authentication -> Users.

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;

drop policy if exists "admins can read their own admin record" on public.portfolio_admins;
create policy "admins can read their own admin record"
on public.portfolio_admins for select to authenticated
using (user_id = auth.uid());

-- Remove the broad starter policies that allow any authenticated account to edit projects.
drop policy if exists "published projects are public" on public.projects;
drop policy if exists "authenticated users can insert projects" on public.projects;
drop policy if exists "authenticated users can update projects" on public.projects;
drop policy if exists "authenticated users can delete projects" on public.projects;

create policy "public can read published projects; admins can read all"
on public.projects for select
using (
  published = true
  or exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid())
);

create policy "only portfolio admins can insert projects"
on public.projects for insert to authenticated
with check (exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid()));

create policy "only portfolio admins can update projects"
on public.projects for update to authenticated
using (exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid()));

create policy "only portfolio admins can delete projects"
on public.projects for delete to authenticated
using (exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid()));

-- After running the statements above, uncomment and run this insert separately,
-- replacing the UUID with your own Auth user ID:
-- insert into public.portfolio_admins (user_id) values ('YOUR_AUTH_USER_UUID');
