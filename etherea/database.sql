-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Kullanıcı rolleri enum tipi
create type user_role as enum ('user', 'therapist', 'admin');

-- Kullanıcı rolleri tablosu
create table if not exists user_roles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS politikası
alter table user_roles enable row level security;

drop policy if exists "Herkes rolleri görebilir" on user_roles;
drop policy if exists "Sadece adminler rol atayabilir" on user_roles;
drop policy if exists "Kullanıcılar kendi rollerini ekleyebilir" on user_roles;
drop policy if exists "Adminler tüm rolleri yönetebilir" on user_roles;

create policy "Herkes rolleri görebilir"
  on user_roles for select
  using ( true );

create policy "Kullanıcılar kendi rollerini ekleyebilir"
  on user_roles for insert
  with check ( auth.uid() = id );

create policy "Kullanıcılar kendi rollerini güncelleyebilir"
  on user_roles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

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
declare
  v_name text;
begin
  -- İsmi belirle
  v_name := new.raw_user_meta_data->>'name';
  
  -- Profil oluştur
  insert into public.profiles (id, name)
  values (new.id, coalesce(v_name, new.email));
  
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

-- Psikolog profilleri tablosu
create table if not exists therapist_profiles (
  id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  full_name text not null,
  title text not null,
  specializations text[] default '{}'::text[],
  education text[] default '{}'::text[],
  certifications text[] default '{}'::text[],
  about text,
  experience_years integer,
  session_fee decimal(10,2),
  avatar_url text,
  diploma_url text,
  certificates_url text,
  is_verified boolean default false,
  is_active boolean default true,
  languages text[] default '{}'::text[],
  session_types text[] default '{}'::text[],
  rating decimal(3,2),
  rating_count integer default 0,
  primary key (id)
);

-- Psikolog çalışma saatleri tablosu
create table if not exists therapist_availability (
  id uuid default uuid_generate_v4() primary key,
  therapist_id uuid references therapist_profiles(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Randevu tablosu
create table if not exists appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  therapist_id uuid references therapist_profiles(id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  session_type text check (session_type in ('online', 'in_person')) not null,
  session_link text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Mesajlaşma tablosu
drop table if exists messages;
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint fk_sender_profile foreign key (sender_id) references profiles(id),
  constraint fk_receiver_profile foreign key (receiver_id) references profiles(id)
);

-- RLS politikası
alter table messages enable row level security;
create policy "Kullanıcılar kendi mesajlarını görebilir"
  on messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Kullanıcılar mesaj gönderebilir"
  on messages for insert
  with check ( auth.uid() = sender_id );

-- Değerlendirme tablosu
create table if not exists therapist_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  therapist_id uuid references therapist_profiles(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  rating integer check (rating between 1 and 5) not null,
  comment text,
  is_anonymous boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS politikaları
alter table therapist_profiles enable row level security;

-- Eski politikaları kaldır
drop policy if exists "Psikologlar kendi profillerini düzenleyebilir" on therapist_profiles;
drop policy if exists "Herkes psikolog profillerini görebilir" on therapist_profiles;
drop policy if exists "Psikologlar kendi profillerini yönetebilir" on therapist_profiles;
drop policy if exists "Yeni psikolog profili oluşturulabilir" on therapist_profiles;

-- Yeni politikalar
create policy "Psikologlar kendi profillerini yönetebilir"
  on therapist_profiles for all
  using ( auth.uid() = id );

create policy "Herkes psikolog profillerini görebilir"
  on therapist_profiles for select
  using ( true );

create policy "Yeni psikolog profili oluşturulabilir"
  on therapist_profiles for insert
  with check ( true );

alter table therapist_availability enable row level security;
create policy "Psikologlar kendi müsaitlik durumlarını yönetebilir"
  on therapist_availability for all
  using ( auth.uid() = therapist_id )
  with check ( auth.uid() = therapist_id );

create policy "Herkes psikolog müsaitlik durumlarını görebilir"
  on therapist_availability for select
  using ( true );

alter table appointments enable row level security;
create policy "Kullanıcılar kendi randevularını görebilir"
  on appointments for select
  using ( auth.uid() = user_id or auth.uid() = therapist_id );

create policy "Kullanıcılar randevu oluşturabilir"
  on appointments for insert
  with check ( auth.uid() = user_id );

create policy "İlgili kişiler randevuları güncelleyebilir"
  on appointments for update
  using ( auth.uid() = user_id or auth.uid() = therapist_id )
  with check ( auth.uid() = user_id or auth.uid() = therapist_id );

alter table therapist_reviews enable row level security;
create policy "Kullanıcılar kendi değerlendirmelerini yönetebilir"
  on therapist_reviews for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Herkes değerlendirmeleri görebilir"
  on therapist_reviews for select
  using ( true );

-- Psikolog ortalama puanını güncelleme fonksiyonu
create or replace function update_therapist_rating()
returns trigger as $$
begin
  update therapist_profiles
  set 
    rating = (
      select avg(rating)::decimal(3,2)
      from therapist_reviews
      where therapist_id = new.therapist_id
    ),
    rating_count = (
      select count(*)
      from therapist_reviews
      where therapist_id = new.therapist_id
    )
  where id = new.therapist_id;
  return new;
end;
$$ language plpgsql security definer;

-- Değerlendirme eklendiğinde/güncellendiğinde/silindiğinde tetikleyici
create trigger update_therapist_rating_trigger
  after insert or update or delete on therapist_reviews
  for each row execute procedure update_therapist_rating();

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

-- Mevcut kullanıcıları user_roles tablosuna aktar
create or replace function migrate_existing_users_to_roles()
returns void as $$
begin
  -- Önce user_roles tablosunu temizle
  delete from user_roles;
  
  -- Tüm auth.users kullanıcılarını ekle
  insert into user_roles (id, role)
  select 
    au.id,
    case 
      when exists (
        select 1 
        from therapist_profiles tp 
        where tp.id = au.id
      ) then 'therapist'::user_role
      else 'user'::user_role
    end as role
  from auth.users au
  where not exists (
    select 1 
    from user_roles ur 
    where ur.id = au.id
  );
end;
$$ language plpgsql security definer;

-- Fonksiyonu çalıştır
select migrate_existing_users_to_roles();

-- Sistem ayarları tablosu
create table if not exists system_settings (
  id serial primary key,
  key text not null unique,
  value jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS politikası
alter table system_settings enable row level security;

create policy "Sadece adminler sistem ayarlarını yönetebilir"
  on system_settings for all
  using ( auth.uid() in (
    select id from user_roles where role = 'admin'
  ))
  with check ( auth.uid() in (
    select id from user_roles where role = 'admin'
  ));

-- Varsayılan sistem ayarlarını ekle
insert into system_settings (key, value)
values 
  ('general', '{"allowNewRegistrations": true, "allowTherapistRegistrations": true, "maintenanceMode": false, "sessionFeePercentage": 10}'::jsonb),
  ('email', '{"sendWelcomeEmails": true, "sendAppointmentReminders": true, "reminderHoursBeforeAppointment": 24, "adminEmail": "admin@etherea.com"}'::jsonb)
on conflict (key) do nothing; 