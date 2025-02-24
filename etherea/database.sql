-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Kullanıcı profilleri tablosu
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  name text,
  avatar_url text,
  primary key (id)
);

-- Yeni kullanıcı kaydında otomatik profil oluşturma
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS politikası
alter table profiles disable row level security;
alter table profiles enable row level security;
drop policy if exists "Kullanıcılar kendi profillerini görebilir ve düzenleyebilir" on profiles;
create policy "Kullanıcılar kendi profillerini görebilir ve düzenleyebilir"
  on profiles for all
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- Günlük girdileri tablosu
create table if not exists journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  mood integer not null check (mood between 1 and 5),
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  keywords text[] default '{}'::text[],
  ai_summary text,
  ai_suggestions text[]
);

-- RLS politikası
alter table journal_entries disable row level security;
alter table journal_entries enable row level security;
drop policy if exists "Kullanıcılar kendi günlüklerini görebilir ve düzenleyebilir" on journal_entries;
create policy "Kullanıcılar kendi günlüklerini görebilir ve düzenleyebilir"
  on journal_entries for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Öneriler tablosu
create table if not exists recommendations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  type text not null check (type in ('music', 'meditation', 'reading')),
  image_url text,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_viewed boolean default false
);

-- RLS politikası
alter table recommendations disable row level security;
alter table recommendations enable row level security;
drop policy if exists "Kullanıcılar kendi önerilerini görebilir" on recommendations;
create policy "Kullanıcılar kendi önerilerini görebilir"
  on recommendations for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Anahtar kelime analizi için fonksiyon
create or replace function get_common_keywords(
  p_user_id uuid,
  p_limit integer default 20
)
returns table (
  keyword text,
  frequency bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    unnest(keywords) as keyword,
    count(*) as frequency
  from journal_entries
  where user_id = p_user_id
  group by keyword
  order by frequency desc
  limit p_limit;
end;
$$; 