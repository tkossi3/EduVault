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
    sector text not null default 'private' check (sector in ('public', 'private')),
    created_at timestamptz not null default now()
);
alter table public.institutions
    add column if not exists sector text not null default 'private'
    check (sector in ('public', 'private'));

-- 4. Table des filières et programmes universitaires
create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    name text not null,
    degree text not null default 'Licence / Master',
    created_at timestamptz not null default now(),
    unique (institution_id, name)
);

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
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'ENP Campus Lomé')
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
insert into public.institutions (id, name, city, country, description, sector) values
    ('a0000000-0000-0000-0000-000000000001', 'ENP Campus Lomé (EPL)', 'Lomé', 'Togo', 'École Polytechnique de Lomé — formations d’ingénieurs et licences professionnelles', 'public'),
    ('a0000000-0000-0000-0000-000000000002', 'Université de Lomé (FDS - Informatique)', 'Lomé', 'Togo', 'Faculté des Sciences — département de mathématiques et informatique fondamentale', 'public'),
    ('a0000000-0000-0000-0000-000000000003', 'Université de Kara (FST)', 'Kara', 'Togo', 'Faculté des Sciences et Techniques', 'public'),
    ('a0000000-0000-0000-0000-000000000004', 'École Supérieure des Affaires (ESA)', 'Lomé', 'Togo', 'Management technologique, finance et systèmes d’information', 'private'),
    ('a0000000-0000-0000-0000-000000000005', 'IAI-Togo (Institut Africain d''Informatique)', 'Lomé', 'Togo', 'Institution inter-États de formation en informatique', 'public'),
    ('a0000000-0000-0000-0000-000000000006', 'ESGIS (École Supérieure de Gestion, d''Informatique et des Sciences)', 'Lomé', 'Togo', 'Établissement supérieur de gestion, informatique et sciences', 'private'),
    ('a0000000-0000-0000-0000-000000000007', 'IPNET Institute of Technology', 'Lomé', 'Togo', 'Institut supérieur de technologie', 'private'),
    ('a0000000-0000-0000-0000-000000000008', 'DEFITECH (Institut Polytechnique DEFITECH)', 'Lomé', 'Togo', 'Institut polytechnique', 'private'),
    ('a0000000-0000-0000-0000-000000000009', 'UCAO-UUT (École Supérieure d''Ingénieurs - ESI)', 'Lomé', 'Togo', 'Université catholique — école supérieure d’ingénieurs', 'private'),
    ('a0000000-0000-0000-0000-000000000010', 'ESIG Global Success', 'Lomé', 'Togo', 'Établissement supérieur de gestion et d’informatique', 'private'),
    ('a0000000-0000-0000-0000-000000000011', 'IAEC Université (Pôle Technologies & Informatique)', 'Lomé', 'Togo', 'Institut africain d’études commerciales et technologies numériques', 'private'),
    ('a0000000-0000-0000-0000-000000000012', 'FORMATEC (Institut Supérieur Technologique)', 'Lomé', 'Togo', 'Institut supérieur technologique', 'private'),
    ('a0000000-0000-0000-0000-000000000013', 'CIB-INTA', 'Lomé', 'Togo', 'Institut de formation en informatique', 'private')
on conflict (id) do update set
    name = excluded.name,
    city = excluded.city,
    country = excluded.country,
    description = excluded.description,
    sector = excluded.sector;

insert into public.programs (institution_id, name, degree)
select institutions.id, seed.name, seed.degree
from (values
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Licence Professionnelle'),
    ('ENP Campus Lomé (EPL)', 'Génie Électrique & Télécommunications', 'Diplôme d''Ingénieur'),
    ('ENP Campus Lomé (EPL)', 'Systèmes, Réseaux & Sécurité Informatique (SRI)', 'Licence Professionnelle'),
    ('ENP Campus Lomé (EPL)', 'Intelligence Artificielle & Big Data', 'Master Professionnel'),
    ('ENP Campus Lomé (EPL)', 'Informatique et Systèmes (IS)', 'Licence Fondamentale'),
    ('ENP Campus Lomé (EPL)', 'Cybersécurité & Sécurité des Systèmes d''Information', 'Master Professionnel'),
    ('Université de Lomé (FDS - Informatique)', 'Mathématiques & Informatique Fondamentale (MIF)', 'Licence Fondamentale'),
    ('Université de Lomé (FDS - Informatique)', 'Informatique Fondamentale et Appliquée (IFA)', 'Licence Fondamentale'),
    ('Université de Lomé (FDS - Informatique)', 'Science des Données & Modélisation Mathématique', 'Master Recherche'),
    ('Université de Lomé (FDS - Informatique)', 'Sciences Économiques & Gestion (FASEG)', 'Licence Fondamentale'),
    ('Université de Kara (FST)', 'Mathématiques et Informatique (MI)', 'Licence Fondamentale'),
    ('Université de Kara (FST)', 'Réseaux Informatiques & Télécommunications (RIT)', 'Licence Professionnelle'),
    ('Université de Kara (FST)', 'Génie Logiciel & Technologies Web', 'Licence Professionnelle'),
    ('IAI-Togo (Institut Africain d''Informatique)', 'Ingénierie du Génie Logiciel (IGL)', 'Licence Professionnelle'),
    ('IAI-Togo (Institut Africain d''Informatique)', 'Administration Systèmes, Réseaux & Cloud (ASR)', 'Licence Professionnelle'),
    ('IAI-Togo (Institut Africain d''Informatique)', 'Ingénierie des Systèmes d''Information (ISI)', 'Master Professionnel'),
    ('IAI-Togo (Institut Africain d''Informatique)', 'Cybersécurité & Audit Informatique', 'Master Professionnel'),
    ('ESGIS (École Supérieure de Gestion, d''Informatique et des Sciences)', 'Génie Logiciel & Applications Mobiles', 'Licence Professionnelle'),
    ('ESGIS (École Supérieure de Gestion, d''Informatique et des Sciences)', 'Systèmes, Réseaux & Sécurité (LPSRI)', 'Licence Professionnelle'),
    ('ESGIS (École Supérieure de Gestion, d''Informatique et des Sciences)', 'Intelligence Artificielle & Big Data Analytics', 'Master Professionnel'),
    ('ESGIS (École Supérieure de Gestion, d''Informatique et des Sciences)', 'Informatique de Gestion & Systèmes d''Information (MIAGE)', 'Master Professionnel'),
    ('IPNET Institute of Technology', 'Réseaux, Systèmes & Cybersécurité Internationale', 'Licence Professionnelle'),
    ('IPNET Institute of Technology', 'Génie Logiciel, DevOps & Cloud Computing', 'Licence Professionnelle'),
    ('IPNET Institute of Technology', 'Intelligence Artificielle, IoT & Big Data', 'Master Professionnel'),
    ('IPNET Institute of Technology', 'Gouvernance IT & Systèmes d''Information', 'Master Professionnel'),
    ('DEFITECH (Institut Polytechnique DEFITECH)', 'Génie Logiciel & Systèmes d''Information', 'Licence Professionnelle'),
    ('DEFITECH (Institut Polytechnique DEFITECH)', 'Maintenance Informatique & Réseaux Télécoms', 'Licence Professionnelle'),
    ('DEFITECH (Institut Polytechnique DEFITECH)', 'Sécurité Réseaux & Systèmes d''Exploitation', 'Master Professionnel'),
    ('DEFITECH (Institut Polytechnique DEFITECH)', 'Administration de Bases de Données & Data Science', 'Master Professionnel'),
    ('UCAO-UUT (École Supérieure d''Ingénieurs - ESI)', 'Génie Informatique & Télécommunications', 'Diplôme d''Ingénieur'),
    ('UCAO-UUT (École Supérieure d''Ingénieurs - ESI)', 'Cybersécurité & Confiance Numérique', 'Master Professionnel'),
    ('UCAO-UUT (École Supérieure d''Ingénieurs - ESI)', 'Intelligence Artificielle & Sciences des Données', 'Master Professionnel'),
    ('UCAO-UUT (École Supérieure d''Ingénieurs - ESI)', 'Conception Logicielle & Systèmes Embarqués', 'Licence Professionnelle'),
    ('ESIG Global Success', 'Génie Logiciel & Développement Web/Mobile', 'Licence Professionnelle'),
    ('ESIG Global Success', 'Administration Systèmes, Réseaux & Bases de Données', 'Licence Professionnelle'),
    ('ESIG Global Success', 'Management des Systèmes d''Information', 'Master Professionnel'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Génie Logiciel & Multimédia Numérique', 'Licence Professionnelle'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Informatique de Gestion (IG)', 'Licence Professionnelle'),
    ('IAEC Université (Pôle Technologies & Informatique)', 'Réseaux Informatiques & Télécommunications', 'Licence Professionnelle'),
    ('FORMATEC (Institut Supérieur Technologique)', 'Génie Informatique & Réseaux Industriels', 'Licence Professionnelle'),
    ('FORMATEC (Institut Supérieur Technologique)', 'Télécommunications & Systèmes Connectés', 'Diplôme d''Ingénieur'),
    ('CIB-INTA', 'Développement Web & Génie Logiciel', 'Licence Professionnelle'),
    ('CIB-INTA', 'Maintenance Informatique & Réseaux Locaux', 'Licence Professionnelle'),
    ('École Supérieure des Affaires (ESA)', 'Audit, Contrôle de Gestion & Finance', 'Master Professionnel'),
    ('École Supérieure des Affaires (ESA)', 'Marketing Digital & Stratégie Commerciale', 'Licence Professionnelle')
) as seed(institution_name, name, degree)
join public.institutions on institutions.name = seed.institution_name
on conflict (institution_id, name) do update set degree = excluded.degree;

insert into public.courses (program_id, name, code, semester)
select programs.id, seed.name, seed.code, seed.semester
from (values
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Architecture des Ordinateurs & Systèmes', 'INF101', 1),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Algorithmique & Programmation C/C++', 'INF102', 1),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Mathématiques pour l''Informatique (Algèbre & Analyse)', 'MAT101', 1),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Programmation Orientée Objet (Java / Python)', 'INF201', 2),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Structures de Données Avancées & Graphes', 'INF202', 2),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Bases de Données Relationnelles & SQL', 'INF301', 3),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Génie Logiciel & Modélisation UML', 'INF302', 3),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Développement Web Full-Stack (JS/Node)', 'INF401', 4),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Systèmes d''Exploitation & Linux Avancé', 'INF402', 4),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Architectures Cloud & Microservices', 'INF501', 5),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Cybersécurité & Tests Logiciels', 'INF502', 5),
    ('ENP Campus Lomé (EPL)', 'Génie Logiciel & Systèmes d''Information (GL)', 'Projet de Fin d''Études & Stage Professionnel', 'INF601', 6),
    ('Université de Lomé (FDS - Informatique)', 'Mathématiques & Informatique Fondamentale (MIF)', 'Analyse Mathématique I (Suites & Séries)', 'MAT101', 1),
    ('Université de Lomé (FDS - Informatique)', 'Mathématiques & Informatique Fondamentale (MIF)', 'Analyse Mathématique II & Équations Différentielles', 'MAT201', 2),
    ('Université de Lomé (FDS - Informatique)', 'Mathématiques & Informatique Fondamentale (MIF)', 'Probabilités & Statistiques Inférentielles', 'MAT301', 3),
    ('Université de Lomé (FDS - Informatique)', 'Sciences Économiques & Gestion (FASEG)', 'Microéconomie Appliquée & Marchés', 'ECO102', 2),
    ('Université de Lomé (FDS - Informatique)', 'Sciences Économiques & Gestion (FASEG)', 'Macroéconomie & Politiques Monétaires', 'ECO201', 3),
    ('Université de Lomé (FDS - Informatique)', 'Sciences Économiques & Gestion (FASEG)', 'Comptabilité Générale & Analytique', 'GES101', 1),
    ('ENP Campus Lomé (EPL)', 'Génie Électrique & Télécommunications', 'Électronique Numérique & Microprocesseurs', 'ELC301', 4),
    ('ENP Campus Lomé (EPL)', 'Génie Électrique & Télécommunications', 'Traitement du Signal & Télécoms', 'TEL401', 5)
) as seed(institution_name, program_name, name, code, semester)
join public.institutions on institutions.name = seed.institution_name
join public.programs on programs.institution_id = institutions.id and programs.name = seed.program_name
on conflict (program_id, semester, name) do update set code = excluded.code;