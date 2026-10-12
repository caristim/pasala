-- Ejecutar completo en Supabase → SQL Editor

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('book','movie','series')),
  title text not null check (char_length(title) between 1 and 120),
  creator text,
  year int,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) <= 500),
  cover_url text,
  created_at timestamptz not null default now()
);

create table public.likes (
  rec_id uuid references public.recommendations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (rec_id, user_id)
);

-- Crea el perfil automáticamente al registrarse
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seguridad (RLS)
alter table public.profiles enable row level security;
alter table public.recommendations enable row level security;
alter table public.likes enable row level security;

create policy "perfiles visibles" on public.profiles for select using (true);
create policy "recs visibles" on public.recommendations for select using (true);
create policy "crear mis recs" on public.recommendations for insert with check (auth.uid() = user_id);
create policy "borrar mis recs" on public.recommendations for delete using (auth.uid() = user_id);
create policy "likes visibles" on public.likes for select using (true);
create policy "dar like" on public.likes for insert with check (auth.uid() = user_id);
create policy "quitar like" on public.likes for delete using (auth.uid() = user_id);
