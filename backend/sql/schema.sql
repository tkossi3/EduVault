-- ====================================================================
-- EDUVAULT 2026 — SCHÉMA DE BASE DE DONNÉES POSTGRESQL POUR SUPABASE
-- ====================================================================

-- 1. Extensions indispensables
create extension if not exists pgcrypto;

-- 2. Table des profils utilisateurs
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default '',
    institution text not null default 'ENP Campus Lomé',
    program text not null default '',
    level text not null default 'Licence 3',
    bio text not null default '',
    avatar_url text not null default '',
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- 3. Table des établissements / universités partenaires
create table if not exists public.institutions (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    city text not null default 'Lomé',
    country text not null default 'Togo',
    description text not null default '',
    created_at timestamptz not null default now()
);

-- 4. Table des filières et programmes universitaires
create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    name text not null,
    degree text not null default 'Licence / Master',
    created_at timestamptz not null default now(),
    unique (institution_id, name)
);

-- 5. Table des cours et unités d'enseignement (UE)
create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.programs(id) on delete cascade,
    name text not null,
    code text,
    semester smallint not null check (semester between 1 and 6),
    created_at timestamptz not null default now(),
    unique (program_id, semester, name)
);

-- 6. Table des documents et annales du coffre académique
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses(id) on delete cascade,
    uploaded_by uuid not null references auth.users(id) on delete restrict,
    title text not null check (char_length(trim(title)) between 5 and 160),
    category text not null check (category in ('Support de Cours', 'TD/TP', 'Examen/Annales', 'Fiche de révision')),
    academic_year text not null check (academic_year ~ '^\d{4}-\d{4}$'),
    storage_path text not null unique,
    mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
    file_size bigint not null check (file_size between 1 and 20971520),
    status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
    is_public boolean not null default true,
    views_count integer not null default 0,
    downloads_count integer not null default 0,
    created_at timestamptz not null default now()
);

-- 7. Table des notifications étudiantes
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    document_id uuid references public.documents(id) on delete set null,
    title text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

-- 8. Index de performance
create index if not exists idx_documents_search on public.documents (status, is_public, created_at desc);
create index if not exists idx_documents_course on public.documents (course_id);
create index if not exists idx_courses_program on public.courses (program_id, semester);
create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

-- 9. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.courses enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- Politiques RLS de lecture publique
create policy "Lecture publique des établissements" on public.institutions for select using (true);
create policy "Lecture publique des programmes" on public.programs for select using (true);
create policy "Lecture publique des cours" on public.courses for select using (true);
create policy "Lecture des documents publics" on public.documents for select using (is_public = true and status = 'approved');

-- Politiques de gestion du profil
create policy "Lecture de profil" on public.profiles for select using (true);
create policy "Modification de son propre profil" on public.profiles for update using (auth.uid() = id);
create policy "Création de profil" on public.profiles for insert with check (auth.uid() = id);

-- Politiques des notifications personnelles
create policy "Gestion de ses propres notifications" on public.notifications for all using (auth.uid() = user_id);

-- 10. Trigger automatique de création de profil à l'inscription Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.profiles (id, full_name, institution)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'ENP Campus Lomé')
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 11. Données initiales (Seed Data pour le Togo / Session 2026)
insert into public.institutions (id, name, city, country, description) values
    ('a0000000-0000-0000-0000-000000000001', 'ENP Campus Lomé', 'Lomé', 'Togo', 'École Nationale Polytechnique de Lomé'),
    ('a0000000-0000-0000-0000-000000000002', 'Université de Lomé', 'Lomé', 'Togo', 'FDS, FASEG, FDD, FSS - Campus Nord & Sud'),
    ('a0000000-0000-0000-0000-000000000003', 'Université de Kara', 'Kara', 'Togo', 'Campus Universitaire de Kara'),
    ('a0000000-0000-0000-0000-000000000004', 'École Supérieure des Affaires (ESA)', 'Lomé', 'Togo', 'Management, Droit & Économie')
on conflict (name) do nothing;