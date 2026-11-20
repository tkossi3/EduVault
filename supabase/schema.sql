-- =====================================================================
-- EDUVAULT — Base Supabase complète (tables, sécurité, stockage des PDF)
-- À exécuter dans Supabase → SQL Editor. Le script peut être relancé.
-- Le site parle directement à Supabase : toute la sécurité est ici (RLS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Rôle modérateur
-- Un compte est modérateur si son app_metadata contient catalog_role = moderator
-- (attribué par SQL, jamais modifiable par l'utilisateur lui-même).
-- ---------------------------------------------------------------------
create or replace function public.is_moderator()
returns boolean
language sql
stable
set search_path = ''
as $$
    select coalesce((auth.jwt() -> 'app_metadata' ->> 'catalog_role') = 'moderator', false);
$$;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default '',
    institution text not null default '',
    program text not null default '',
    level text not null default '',
    bio text not null default '',
    avatar_url text not null default '',
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists public.institutions (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    city text not null default 'Lomé',
    country text not null default 'Togo',
    description text not null default '',
    sector text not null default 'private' check (sector in ('public', 'private', 'interstate')),
    aliases text[] not null default '{}',
    verification text not null default 'À confirmer auprès de l’établissement',
    website text,
    created_at timestamptz not null default now()
);

create table if not exists public.programs (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    name text not null,
    degree text not null default 'Licence Professionnelle',
    is_listed boolean not null default true,
    verification text not null default 'À confirmer auprès de l’établissement',
    source_url text,
    created_at timestamptz not null default now(),
    unique (institution_id, name)
);

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

create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references public.programs(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 2 and 160),
    code text,
    semester smallint not null check (semester between 1 and 10),
    is_demo boolean not null default false,
    created_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    unique (program_id, semester, name)
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses(id) on delete cascade,
    uploaded_by uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(trim(title)) between 5 and 160),
    category text not null check (category in ('Support de Cours', 'TD/TP', 'Examen/Annales', 'Fiche de révision')),
    academic_year text not null check (academic_year ~ '^\d{4}-\d{4}$'),
    storage_path text not null unique,
    mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
    file_size bigint not null check (file_size between 1 and 20971520),
    -- Tout dépôt commence « en attente »; un modérateur le passe à « approved ».
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    is_public boolean not null default true,
    views_count integer not null default 0,
    downloads_count integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    document_id uuid references public.documents(id) on delete set null,
    title text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Index
-- ---------------------------------------------------------------------
create index if not exists idx_programs_institution on public.programs (institution_id);
create index if not exists idx_courses_program on public.courses (program_id, semester);
create index if not exists idx_documents_public on public.documents (status, is_public, created_at desc);
create index if not exists idx_documents_course on public.documents (course_id);
create index if not exists idx_documents_uploader on public.documents (uploaded_by, created_at desc);
create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);
create index if not exists idx_program_requests_status on public.program_change_requests (status, created_at);
create index if not exists idx_program_requests_user on public.program_change_requests (requested_by, created_at desc);
create index if not exists idx_program_requests_institution on public.program_change_requests (institution_id);
create index if not exists idx_program_requests_program on public.program_change_requests (program_id);
create index if not exists idx_program_requests_reviewer on public.program_change_requests (reviewed_by);
create index if not exists idx_courses_created_by on public.courses (created_by);
create index if not exists idx_notifications_document on public.notifications (document_id);

-- ---------------------------------------------------------------------
-- 4. Règles d'accès (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.program_change_requests enable row level security;
alter table public.courses enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- Catalogue : lecture publique; seules les matières peuvent être ajoutées par les membres.
drop policy if exists "Lecture publique des établissements" on public.institutions;
create policy "Lecture publique des établissements" on public.institutions for select using (true);

drop policy if exists "Lecture publique des programmes" on public.programs;
create policy "Lecture publique des programmes" on public.programs for select using (true);

drop policy if exists "Lecture publique des cours" on public.courses;
create policy "Lecture publique des cours" on public.courses for select using (true);

drop policy if exists "Ajout de cours par les membres" on public.courses;
create policy "Ajout de cours par les membres" on public.courses for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and is_demo = false
        and exists (select 1 from public.programs p where p.id = program_id and p.is_listed)
    );

-- Documents : tout le monde voit les documents approuvés; chacun voit les siens; le modérateur voit tout.
drop policy if exists "Lecture des documents publics" on public.documents;
drop policy if exists "Lecture des documents" on public.documents;
create policy "Lecture des documents" on public.documents for select
    using (
        (is_public and status = 'approved')
        or uploaded_by = (select auth.uid())
        or (select public.is_moderator())
    );

drop policy if exists "Dépôt de documents" on public.documents;
create policy "Dépôt de documents" on public.documents for insert to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and status = 'pending'
        and views_count = 0
        and downloads_count = 0
        and storage_path like (select auth.uid())::text || '/%'
    );

drop policy if exists "Modération des documents" on public.documents;
create policy "Modération des documents" on public.documents for update to authenticated
    using ((select public.is_moderator()))
    with check ((select public.is_moderator()));

drop policy if exists "Suppression de ses documents" on public.documents;
create policy "Suppression de ses documents" on public.documents for delete to authenticated
    using (uploaded_by = (select auth.uid()) or (select public.is_moderator()));

-- Demandes de filière
drop policy if exists "Lecture de ses demandes de filière" on public.program_change_requests;
create policy "Lecture de ses demandes de filière" on public.program_change_requests for select to authenticated
    using (requested_by = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists "Soumission de demandes de filière" on public.program_change_requests;
create policy "Soumission de demandes de filière" on public.program_change_requests for insert to authenticated
    with check (requested_by = (select auth.uid()) and status = 'pending' and reviewed_by is null);

-- Profils
drop policy if exists "Lecture de profil" on public.profiles;
create policy "Lecture de profil" on public.profiles for select using (true);

drop policy if exists "Modification de son propre profil" on public.profiles;
create policy "Modification de son propre profil" on public.profiles for update to authenticated
    using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Création de profil" on public.profiles;
create policy "Création de profil" on public.profiles for insert to authenticated
    with check (id = (select auth.uid()));

-- Notifications personnelles
drop policy if exists "Gestion de ses propres notifications" on public.notifications;
create policy "Gestion de ses propres notifications" on public.notifications for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Profil créé automatiquement à l'inscription (e-mail ou Google)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, institution, program, level, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
        coalesce(new.raw_user_meta_data ->> 'institution', ''),
        coalesce(new.raw_user_meta_data ->> 'program', ''),
        coalesce(new.raw_user_meta_data ->> 'level', ''),
        -- Photo du compte Google (connexion Google), sinon vide : l'interface affiche l'initiale.
        coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- Fonction réservée au déclencheur : personne ne peut l'appeler via l'API.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Compteurs de vues / téléchargements (documents approuvés uniquement)
-- ---------------------------------------------------------------------
create or replace function public.increment_document_views(p_document_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    update public.documents set views_count = views_count + 1
    where id = p_document_id and status = 'approved' and is_public;
$$;

create or replace function public.increment_document_downloads(p_document_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    update public.documents set downloads_count = downloads_count + 1
    where id = p_document_id and status = 'approved' and is_public;
$$;

revoke all on function public.increment_document_views(uuid) from public;
revoke all on function public.increment_document_downloads(uuid) from public;
grant execute on function public.increment_document_views(uuid) to anon, authenticated;
grant execute on function public.increment_document_downloads(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Validation des propositions de filière (modérateur uniquement)
-- ---------------------------------------------------------------------
drop function if exists public.review_program_change_request(uuid, text, uuid);

create or replace function public.review_program_change_request(p_request_id uuid, p_action text)
returns table (request_id uuid, status text, program_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
    pending_request public.program_change_requests%rowtype;
    changed_program_id uuid;
begin
    if not public.is_moderator() then
        raise exception 'Droits de modération requis.' using errcode = '42501';
    end if;
    if p_action is null or p_action not in ('approve', 'reject') then
        raise exception 'Action de modération invalide.';
    end if;

    select * into pending_request
    from public.program_change_requests r
    where r.id = p_request_id and r.status = 'pending'
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
            update public.programs p
            set name = pending_request.requested_name
            where p.id = pending_request.program_id
              and p.institution_id = pending_request.institution_id
            returning p.id into changed_program_id;

            if changed_program_id is null then
                raise exception 'La filière à renommer est introuvable.';
            end if;
        end if;
    else
        changed_program_id := pending_request.program_id;
    end if;

    update public.program_change_requests r
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where r.id = p_request_id;

    return query
    select p_request_id,
           case when p_action = 'approve' then 'approved' else 'rejected' end,
           changed_program_id;
end;
$$;

revoke all on function public.review_program_change_request(uuid, text) from public, anon;
grant execute on function public.review_program_change_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Stockage des PDF (bucket privé « academic-documents »)
-- Chaque fichier est rangé dans un dossier au nom de l'utilisateur : <user_id>/<uuid>.pdf
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academic-documents', 'academic-documents', false, 20971520, array['application/pdf'])
on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "EduVault : dépôt dans son dossier" on storage.objects;
create policy "EduVault : dépôt dans son dossier" on storage.objects for insert to authenticated
    with check (
        bucket_id = 'academic-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "EduVault : lecture des PDF autorisés" on storage.objects;
create policy "EduVault : lecture des PDF autorisés" on storage.objects for select to anon, authenticated
    using (
        bucket_id = 'academic-documents'
        and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or (select public.is_moderator())
            or exists (
                select 1 from public.documents d
                where d.storage_path = storage.objects.name
                  and d.status = 'approved'
                  and d.is_public
            )
        )
    );

drop policy if exists "EduVault : suppression de ses PDF" on storage.objects;
create policy "EduVault : suppression de ses PDF" on storage.objects for delete to authenticated
    using (
        bucket_id = 'academic-documents'
        and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or (select public.is_moderator())
        )
    );

-- ---------------------------------------------------------------------
-- 9. Photos de profil (bucket public « avatars », une photo par utilisateur)
-- Chemin : <user_id>/avatar.jpg — lecture publique, écriture dans son propre dossier uniquement.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
    public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "EduVault : envoi de sa photo" on storage.objects;
create policy "EduVault : envoi de sa photo" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "EduVault : remplacement de sa photo" on storage.objects;
create policy "EduVault : remplacement de sa photo" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "EduVault : lecture de sa photo" on storage.objects;
create policy "EduVault : lecture de sa photo" on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "EduVault : suppression de sa photo" on storage.objects;
create policy "EduVault : suppression de sa photo" on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Comptes Google déjà inscrits sans photo : reprendre celle de Google.
update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url = ''
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '') <> '';
