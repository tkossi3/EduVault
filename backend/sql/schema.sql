-- ====================================================================
-- EDUVAULT 2026 — SCHÉMA DE BASE DE DONNÉES POSTGRESQL POUR SUPABASE
-- ====================================================================

-- 1. Extensions indispensables
create extension if not exists pgcrypto;

-- 2. Table des profils utilisateurs
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default '',
    institution text not null default 'École Polytechnique de Lomé (EPL)',
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
    sector text not null default 'private' check (sector in ('public', 'private', 'interstate')),
    created_at timestamptz not null default now()
);
alter table public.institutions
    add column if not exists sector text not null default 'private';
alter table public.institutions
    drop constraint if exists institutions_sector_check;
alter table public.institutions
    add constraint institutions_sector_check check (sector in ('public', 'private', 'interstate'));
alter table public.institutions
    add column if not exists aliases text[] not null default '{}',
    add column if not exists verification text not null default 'À confirmer auprès de l’établissement',
    add column if not exists website text;

-- 4. Table des filières et programmes universitaires
create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    name text not null,
    degree text not null default 'Licence / Master',
    is_listed boolean not null default true,
    verification text not null default 'À confirmer auprès de l’établissement',
    source_url text,
    created_at timestamptz not null default now(),
    unique (institution_id, name)
);
alter table public.programs
    add column if not exists is_listed boolean not null default true,
    add column if not exists verification text not null default 'À confirmer auprès de l’établissement',
    add column if not exists source_url text;

-- Modifications des filières soumises par les membres et publiées après validation.
create table if not exists public.program_change_requests (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    program_id uuid references public.programs(id) on delete restrict,
    request_type text not null check (request_type in ('add', 'rename')),
    requested_name text not null check (char_length(trim(requested_name)) between 2 and 100),
    requested_by uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    check ((request_type = 'add' and program_id is null) or (request_type = 'rename' and program_id is not null))
);

-- 5. Table des cours et unités d'enseignement (UE)
create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.programs(id) on delete cascade,
    name text not null,
    code text,
    semester smallint not null check (semester between 1 and 10),
    is_demo boolean not null default false,
    created_at timestamptz not null default now(),
    unique (program_id, semester, name)
);
alter table public.courses
    add column if not exists is_demo boolean not null default false;
alter table public.courses
    drop constraint if exists courses_semester_check;
alter table public.courses
    add constraint courses_semester_check check (semester between 1 and 10);

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
create index if not exists idx_program_change_requests_status on public.program_change_requests (status, created_at);
create index if not exists idx_program_change_requests_user on public.program_change_requests (requested_by, created_at desc);

-- 9. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.program_change_requests enable row level security;
alter table public.courses enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- Politiques RLS de lecture publique
create policy "Lecture publique des établissements" on public.institutions for select using (true);
create policy "Lecture publique des programmes" on public.programs for select using (true);
drop policy if exists "Lecture de ses demandes de filière" on public.program_change_requests;
create policy "Lecture de ses demandes de filière" on public.program_change_requests
    for select using (
        auth.uid() = requested_by
        or (auth.jwt() -> 'app_metadata' ->> 'catalog_role') = 'moderator'
    );
drop policy if exists "Soumission de demandes de filière" on public.program_change_requests;
create policy "Soumission de demandes de filière" on public.program_change_requests
    for insert with check (auth.uid() = requested_by and status = 'pending');
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
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'École Polytechnique de Lomé (EPL)')
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Appelée uniquement par l'API avec sa clé service-role après contrôle du rôle modérateur.
create or replace function public.review_program_change_request(
    p_request_id uuid,
    p_action text,
    p_reviewer_id uuid
)
returns table (request_id uuid, status text, program_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
    pending_request public.program_change_requests%rowtype;
    changed_program_id uuid;
begin
    if p_action is null or p_action not in ('approve', 'reject') then
        raise exception 'Action de modération invalide.';
    end if;

    select * into pending_request
    from public.program_change_requests
    where id = p_request_id and public.program_change_requests.status = 'pending'
    for update;

    if not found then
        raise exception 'Demande introuvable ou déjà traitée.';
    end if;

    if p_action = 'approve' then
        if pending_request.request_type = 'add' then
            insert into public.programs (institution_id, name)
            values (pending_request.institution_id, pending_request.requested_name)
            returning id into changed_program_id;
        else
            update public.programs
            set name = pending_request.requested_name
            where id = pending_request.program_id
              and institution_id = pending_request.institution_id
            returning id into changed_program_id;

            if changed_program_id is null then
                raise exception 'La filière à renommer est introuvable.';
            end if;
        end if;
    else
        changed_program_id := pending_request.program_id;
    end if;

    update public.program_change_requests
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    where id = p_request_id;

    return query
    select p_request_id,
           case when p_action = 'approve' then 'approved' else 'rejected' end,
           changed_program_id;
end;
$$;

revoke all on function public.review_program_change_request(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.review_program_change_request(uuid, text, uuid) to service_role;

-- 11. Catalogue initial du Togo (dérivé du catalogue de démonstration existant)
insert into public.institutions (id, name, city, country, description, sector, aliases, verification, website) values
    ('a0000000-0000-0000-0000-000000000001', 'École Polytechnique de Lomé (EPL)', 'Lomé', 'Togo', 'École de l’Université de Lomé; appellation officielle consultée : EPL.', 'public', array['EPL', 'ENP (à confirmer)'], 'Établissement confirmé; parcours 2026-2027 à confirmer', 'https://univ-lome.tg/'),
    ('a0000000-0000-0000-0000-000000000002', 'Université de Lomé (UL)', 'Lomé', 'Togo', 'Université publique; les masters recensés sont des appels antérieurs.', 'public', array['UL'], 'Établissement confirmé; offre 2026-2027 à vérifier', 'https://univ-lome.tg/'),
    ('a0000000-0000-0000-0000-000000000003', 'Université de Kara (UK)', 'Kara', 'Togo', 'Université publique; offre informatique actuelle à confirmer.', 'public', array['UK'], 'Établissement confirmé; offre informatique à vérifier', 'https://www.univkara.tg/'),
    ('a0000000-0000-0000-0000-000000000004', 'École Supérieure des Affaires (ESA)', 'Lomé', 'Togo', 'Établissement privé; offre informatique à confirmer.', 'private', array['ESA'], 'Piste à confirmer', null),
    ('a0000000-0000-0000-0000-000000000005', 'Institut Africain d''Informatique — Représentation du Togo (IAI-Togo)', 'Lomé', 'Togo', 'Établissement inter-États spécialisé en informatique.', 'interstate', array['IAI-Togo', 'IAI Togo'], 'Établissement confirmé; cycles vérifiés sur le site officiel', 'https://new.iai-togo.tg/officiel/admission'),
    ('a0000000-0000-0000-0000-000000000006', 'École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)', 'Lomé', 'Togo', 'Établissement privé; intitulés informatiques à confirmer.', 'private', array['ESGIS'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000007', 'IPNET Institute of Technology', 'Lomé', 'Togo', 'Établissement privé; formations informatiques à confirmer.', 'private', array['IPNET'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000008', 'Institut Polytechnique DEFITECH', 'Lomé', 'Togo', 'Établissement privé; formations informatiques à confirmer.', 'private', array['DEFITECH'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000009', 'Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)', 'Lomé', 'Togo', 'Établissement privé; formations informatiques à confirmer.', 'private', array['UCAO-UUT'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000010', 'École Supérieure d''Informatique et de Gestion (ESIG Global Success)', 'Lomé', 'Togo', 'Établissement privé; formations informatiques à confirmer.', 'private', array['ESIG Global Success'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000011', 'IAEC Université (Pôle Technologies & Informatique)', 'Lomé', 'Togo', 'Institut africain d’études commerciales et technologies numériques', 'private', array['IAEC'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000012', 'FORMATEC — Institut Supérieur Technologique', 'Lomé', 'Togo', 'Institut supérieur technologique; offre informatique à confirmer.', 'private', array['FORMATEC'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000013', 'Centre Informatique et Bureautique (CIB-INTA)', 'Lomé', 'Togo', 'Statut et offre actuels à confirmer.', 'private', array['CIB-INTA'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000014', 'Lomé Business School (LBS)', 'Lomé', 'Togo', 'Parcours informatique rapporté par une source secondaire; offre actuelle à confirmer.', 'private', array['LBS'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000015', 'Centre Informatique de Formation et d''Orientation Professionnelles (CIFOP)', 'Lomé', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['CIFOP'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000016', 'Institut Technique Supérieur La Maîtrise', 'Lomé', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['La Maîtrise'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000017', 'Institut Supérieur des Technologies et de Management (ISTM)', 'Lomé', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['ISTM'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000018', 'Institut des Sciences, Technologies et Arts de Kara (ISTA-Kara)', 'Kara', 'Togo', 'Formations rapportées par une source secondaire; offre actuelle à confirmer.', 'private', array['ISTA-Kara'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000019', 'Institut Supérieur de Gestion Monseigneur Bakpessi', 'Kara', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['ISG Mgr Bakpessi'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000020', 'Institut de Formation aux Normes et Technologies de l''Informatique (IFNTI)', 'Sokodé', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['IFNTI'], 'À confirmer auprès de l’établissement', null),
    ('a0000000-0000-0000-0000-000000000021', 'ESAT-Togo', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000022', 'AIC-Togo', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000023', 'IPM-Togo', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000024', 'IFTS', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000025', 'ISM Adonaï', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000026', 'ESIBA', 'Lomé', 'Togo', 'Piste de recherche; offre d’enseignement supérieur informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier', null),
    ('a0000000-0000-0000-0000-000000000027', 'Formation ENP signalée à Kara — à vérifier', 'Kara', 'Togo', 'Formation signalée dans la liste source mais non confirmée sur le site officiel consulté.', 'public', array['ENP Kara'], 'Piste à vérifier', null)
on conflict (id) do update set
    name = excluded.name,
    city = excluded.city,
    country = excluded.country,
    description = excluded.description,
    sector = excluded.sector,
    aliases = excluded.aliases,
    verification = excluded.verification,
    website = excluded.website;

update public.programs
set is_listed = false,
    verification = 'Ancienne entrée conservée; parcours actuel à vérifier'
where name in (
    'Génie Logiciel & Systèmes d''Information (GL)',
    'Génie Électrique & Télécommunications',
    'Systèmes, Réseaux & Sécurité Informatique (SRI)',
    'Intelligence Artificielle & Big Data',
    'Cybersécurité & Sécurité des Systèmes d''Information',
    'Mathématiques & Informatique Fondamentale (MIF)',
    'Informatique Fondamentale et Appliquée (IFA)',
    'Science des Données & Modélisation Mathématique',
    'Sciences Économiques & Gestion (FASEG)',
    'Mathématiques et Informatique (MI)',
    'Réseaux Informatiques & Télécommunications (RIT)',
    'Génie Logiciel & Technologies Web',
    'Ingénierie du Génie Logiciel (IGL)',
    'Administration Systèmes, Réseaux & Cloud (ASR)',
    'Ingénierie des Systèmes d''Information (ISI)',
    'Cybersécurité & Audit Informatique',
    'Audit, Contrôle de Gestion & Finance',
    'Marketing Digital & Stratégie Commerciale'
)
and institution_id in (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000004'
);

insert into public.programs (institution_id, name, degree)
select institutions.id, seed.name, seed.degree
from (values
    ('École Polytechnique de Lomé (EPL)', 'Génie Logiciel (GL)', 'Licence Professionnelle'),
    ('École Polytechnique de Lomé (EPL)', 'Systèmes et Réseaux Informatiques (SR)', 'Licence Professionnelle'),
    ('École Polytechnique de Lomé (EPL)', 'Intelligence Artificielle et Big Data (IA-BD)', 'Diplôme d''Ingénieur'),
    ('École Polytechnique de Lomé (EPL)', 'Informatique et Systèmes (IS)', 'Diplôme d''Ingénieur'),
    ('Université de Lomé (UL)', 'Master international en Génie Informatique (UTT)', 'Master international'),
    ('Université de Lomé (UL)', 'Master international Systèmes et Informatique (UTBM)', 'Master international'),
    ('Université de Lomé (UL)', 'Master international Intelligence Artificielle et Big Data (UTBM)', 'Master international'),
    ('Université de Kara (UK)', 'Mathématiques et Informatique Appliquées (LMIA)', 'Licence — intitulé historique à vérifier'),
    ('Université de Kara (UK)', 'Physique Appliquée, Électronique et Informatique (LPAEI)', 'Licence — intitulé historique à vérifier'),
    ('Institut Africain d''Informatique — Représentation du Togo (IAI-Togo)', 'Cycle Ingénieur Concepteur', 'Diplôme d''Ingénieur'),
    ('Institut Africain d''Informatique — Représentation du Togo (IAI-Togo)', 'Cycle Ingénieur des Travaux Informatiques (ITI) et Licence Professionnelle', 'Licence Professionnelle'),
    ('École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)', 'Génie Logiciel & Applications Mobiles', 'Licence Professionnelle'),
    ('École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)', 'Systèmes, Réseaux & Sécurité (LPSRI)', 'Licence Professionnelle'),
    ('École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)', 'Intelligence Artificielle & Big Data Analytics', 'Master Professionnel'),
    ('École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)', 'Informatique de Gestion & Systèmes d''Information (MIAGE)', 'Master Professionnel'),
    ('IPNET Institute of Technology', 'Réseaux, Systèmes & Cybersécurité Internationale', 'Licence Professionnelle'),
    ('IPNET Institute of Technology', 'Génie Logiciel, DevOps & Cloud Computing', 'Licence Professionnelle'),
    ('IPNET Institute of Technology', 'Intelligence Artificielle, IoT & Big Data', 'Master Professionnel'),
    ('IPNET Institute of Technology', 'Gouvernance IT & Systèmes d''Information', 'Master Professionnel'),
    ('Institut Polytechnique DEFITECH', 'Génie Logiciel & Systèmes d''Information', 'Licence Professionnelle'),
    ('Institut Polytechnique DEFITECH', 'Maintenance Informatique & Réseaux Télécoms', 'Licence Professionnelle'),
    ('Institut Polytechnique DEFITECH', 'Sécurité Réseaux & Systèmes d''Exploitation', 'Master Professionnel'),
    ('Institut Polytechnique DEFITECH', 'Administration de Bases de Données & Data Science', 'Master Professionnel'),
    ('Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)', 'Génie Informatique & Télécommunications', 'Diplôme d''Ingénieur'),
    ('Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)', 'Cybersécurité & Confiance Numérique', 'Master Professionnel'),
    ('Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)', 'Intelligence Artificielle & Sciences des Données', 'Master Professionnel'),
    ('Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)', 'Conception Logicielle & Systèmes Embarqués', 'Licence Professionnelle'),
    ('École Supérieure d''Informatique et de Gestion (ESIG Global Success)', 'Génie Logiciel & Développement Web/Mobile', 'Licence Professionnelle'),
    ('École Supérieure d''Informatique et de Gestion (ESIG Global Success)', 'Administration Systèmes, Réseaux & Bases de Données', 'Licence Professionnelle'),
    ('École Supérieure d''Informatique et de Gestion (ESIG Global Success)', 'Management des Systèmes d''Information', 'Master Professionnel'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Génie Logiciel & Multimédia Numérique', 'Licence Professionnelle'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Informatique de Gestion (IG)', 'Licence Professionnelle'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Réseaux Informatiques & Télécommunications', 'Licence Professionnelle'),
    ('FORMATEC — Institut Supérieur Technologique', 'Génie Informatique & Réseaux Industriels', 'Licence Professionnelle'),
    ('FORMATEC — Institut Supérieur Technologique', 'Télécommunications & Systèmes Connectés', 'Diplôme d''Ingénieur'),
    ('Centre Informatique et Bureautique (CIB-INTA)', 'Développement Web & Génie Logiciel', 'Licence Professionnelle'),
    ('Centre Informatique et Bureautique (CIB-INTA)', 'Maintenance Informatique & Réseaux Locaux', 'Licence Professionnelle'),
    ('Lomé Business School (LBS)', 'Génie Logiciel — spécialité Systèmes d''Information', 'Niveau à confirmer'),
    ('Centre Informatique de Formation et d''Orientation Professionnelles (CIFOP)', 'Développement d''Applications Informatiques', 'Niveau à confirmer'),
    ('Institut Technique Supérieur La Maîtrise', 'Informatique de Gestion', 'Niveau à confirmer'),
    ('Institut Supérieur des Technologies et de Management (ISTM)', 'Maintenance Informatique', 'Niveau à confirmer'),
    ('Institut des Sciences, Technologies et Arts de Kara (ISTA-Kara)', 'Maintenance Informatique et Réseaux', 'Niveau à confirmer'),
    ('Institut Supérieur de Gestion Monseigneur Bakpessi', 'Maintenance Informatique', 'Niveau à confirmer'),
    ('Institut de Formation aux Normes et Technologies de l''Informatique (IFNTI)', 'Informatique', 'Niveau à confirmer')
) as seed(institution_name, name, degree)
join public.institutions on institutions.name = seed.institution_name
on conflict (institution_id, name) do update set
    degree = excluded.degree,
    is_listed = true;

update public.programs
set is_listed = true,
    verification = 'Parcours rapporté; appel 2025-2026; reconduction 2026-2027 à confirmer',
    source_url = 'https://univ-lome.tg/wp-content/uploads/2025/08/Appel_a-Candidatures-2025-2026-EPL.pdf'
where institution_id = 'a0000000-0000-0000-0000-000000000001'
  and name in (
      'Génie Logiciel (GL)',
      'Systèmes et Réseaux Informatiques (SR)',
      'Intelligence Artificielle et Big Data (IA-BD)',
      'Informatique et Systèmes (IS)'
  );

update public.programs
set is_listed = true,
    verification = 'Appel officiel publié pour 2025-2026; reconduction 2026-2027 à confirmer',
    source_url = 'https://univ-lome.tg/appel-a-candidatures-2025-2026-master-international-en-genie-informatique/'
where institution_id = 'a0000000-0000-0000-0000-000000000002'
  and name = 'Master international en Génie Informatique (UTT)';

update public.programs
set is_listed = true,
    verification = 'Appel officiel antérieur; ouverture actuelle à confirmer',
    source_url = 'https://univ-lome.tg/appel-a-candidatures-aux-masters-systemes-et-informatique-intelligence-artificielle-et-big-data/'
where institution_id = 'a0000000-0000-0000-0000-000000000002'
  and name in (
      'Master international Systèmes et Informatique (UTBM)',
      'Master international Intelligence Artificielle et Big Data (UTBM)'
  );

update public.programs
set is_listed = true,
    verification = 'Cycle indiqué sur le site officiel de l’IAI-Togo; intitulés d’options à confirmer',
    source_url = 'https://new.iai-togo.tg/officiel/admission'
where institution_id = 'a0000000-0000-0000-0000-000000000005'
  and name in (
      'Cycle Ingénieur Concepteur',
      'Cycle Ingénieur des Travaux Informatiques (ITI) et Licence Professionnelle'
  );

update public.programs
set verification = 'Intitulé historique; offre actuelle à confirmer'
where institution_id = 'a0000000-0000-0000-0000-000000000003'
  and name in (
      'Mathématiques et Informatique Appliquées (LMIA)',
      'Physique Appliquée, Électronique et Informatique (LPAEI)'
  );

-- Les cours ne sont pas préremplis avec des curricula non vérifiés.
-- Les membres ajoutent les cours réels depuis la page d'un parcours.