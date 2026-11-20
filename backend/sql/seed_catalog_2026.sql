-- EduVault — Catalogue des établissements et filières informatiques au Togo (novembre 2026)
-- Idempotent : peut être rejoué. Généré depuis frontend/scripts/store.js.
begin;

-- 1. Harmoniser les anciens noms créés par schema.sql (évite les doublons)
update public.institutions set name = 'Institut Africain d''Informatique (IAI-Togo)' where name = 'Institut Africain d''Informatique — Représentation du Togo (IAI-Togo)';
update public.institutions set name = 'ESGIS Togo' where name = 'École Supérieure de Gestion, d''Informatique et des Sciences (ESGIS)';
update public.institutions set name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)' where name = 'Université Catholique de l''Afrique de l''Ouest — Unité Universitaire du Togo (UCAO-UUT)';
update public.institutions set name = 'ESIG Global Success' where name = 'École Supérieure d''Informatique et de Gestion (ESIG Global Success)';
update public.institutions set name = 'Institut Africain d''Administration et d''Études Commerciales (IAEC)' where name = 'IAEC Université (Pôle Technologies & Informatique)';
update public.institutions set name = 'CIB-INTA' where name = 'Centre Informatique et Bureautique (CIB-INTA)';
update public.institutions set name = 'CIFOP Lomé' where name = 'Centre Informatique de Formation et d''Orientation Professionnelles (CIFOP)';
update public.institutions set name = 'ISTA Kara' where name = 'Institut des Sciences, Technologies et Arts de Kara (ISTA-Kara)';
update public.institutions set name = 'IFNTI Sokodé' where name = 'Institut de Formation aux Normes et Technologies de l''Informatique (IFNTI)';
delete from public.institutions where name = 'Formation ENP signalée à Kara — à vérifier';

-- 2. Masquer toutes les filières; seules celles du catalogue vérifié ci-dessous redeviennent visibles
update public.programs set is_listed = false;

-- 3. Catalogue vérifié
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('École Polytechnique de Lomé (EPL)', 'Lomé', 'Togo', 'École d''ingénieurs publique de l''Université de Lomé (issue de l''ENSI et du CIC), présentée en 2026 comme École Nationale Polytechnique (ENP) avec un campus à Kara. Parcours : génie logiciel, systèmes et réseaux, informatique et systèmes, IA et Big Data.', 'public', array['EPL','ENP','École Nationale Polytechnique']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Université de Lomé (UL)', 'Lomé', 'Togo', 'Université publique de Lomé : masters internationaux en génie informatique, systèmes et IA.', 'public', array['UL']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Université de Kara (UK)', 'Kara', 'Togo', 'Université publique de Kara — Département d''informatique de la Faculté des Sciences et Techniques (FaST).', 'public', array['UK']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://univkara.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Africain d''Informatique (IAI-Togo)', 'Lomé', 'Togo', 'Établissement inter-États spécialisé en informatique : licence professionnelle (GLSI, ASR, Multimédia & Web) et cycle ingénieur.', 'interstate', array['IAI-Togo','IAI Togo','IAI']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://new.iai-togo.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ESGIS Togo', 'Lomé', 'Togo', 'École Supérieure de Gestion, d''Informatique et des Sciences : informatique, réseaux, télécommunications et développement d''applications.', 'private', array['ESGIS','École Supérieure de Gestion, d''Informatique et des Sciences']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('IPNET Institute of Technology', 'Lomé', 'Togo', 'Institut privé spécialisé en technologies : génie logiciel, réseaux, cybersécurité, IA et science des données.', 'private', array['IPNET']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Polytechnique DEFITECH', 'Lomé', 'Togo', 'Établissement privé : génie logiciel, systèmes et réseaux informatiques, intelligence artificielle et Big Data.', 'private', array['DEFITECH']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://defitech.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ESIG Global Success', 'Lomé', 'Togo', 'École Supérieure d''Informatique et de Gestion : génie logiciel, réseaux, cybersécurité et intelligence artificielle.', 'private', array['ESIG','École Supérieure d''Informatique et de Gestion']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://esig.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('UCAO — Unité Universitaire du Togo (UCAO-UUT)', 'Lomé', 'Togo', 'Université Catholique de l''Afrique de l''Ouest : licence professionnelle et cycle ingénieur en sciences et technologies informatiques.', 'private', array['UCAO-UUT','UCAO']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ESIBA', 'Lomé', 'Togo', 'École Supérieure d''Informatique, de Business et d''Administration : systèmes informatiques et logiciel, réseaux et développement d''applications.', 'private', array['ESIBA','École Supérieure d''Informatique, de Business et d''Administration']::text[], 'Vérifié (sources publiques, nov. 2026)', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('IFNTI Sokodé', 'Sokodé', 'Togo', 'Institut de Formation aux Normes et Technologies de l''Informatique : sécurité informatique et administration des réseaux.', 'private', array['IFNTI']::text[], 'Vérifié (sources publiques, nov. 2026)', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ESCEN', 'Lomé', 'Togo', 'École Supérieure de Commerce et de l''Économie Numérique : intelligence artificielle et génie logiciel, gestion de projets numériques.', 'private', array['ESCEN','École Supérieure de Commerce et de l''Économie Numérique']::text[], 'Vérifié (sources publiques, nov. 2026)', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Africain d''Administration et d''Études Commerciales (IAEC)', 'Lomé', 'Togo', 'Présence d''un parcours informatique à confirmer.', 'private', array['IAEC']::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('FORMATEC — Institut Supérieur Technologique', 'Lomé', 'Togo', 'Présence d''un parcours informatique à confirmer.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('CIB-INTA', 'Lomé', 'Togo', 'Établissement agréé 2026-2027; parcours informatiques à confirmer.', 'private', array['CIB-INTA']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('École Supérieure des Affaires (ESA)', 'Lomé', 'Togo', 'Présence d''un parcours informatique à confirmer.', 'private', array['ESA']::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Lomé Business School (LBS)', 'Lomé', 'Togo', 'Parcours en génie logiciel rapporté par une source secondaire; offre actuelle à confirmer.', 'private', array['LBS']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('CIFOP Lomé', 'Lomé', 'Togo', 'Établissement agréé; formations informatiques à confirmer.', 'private', array['CIFOP']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Technique Supérieur La Maîtrise', 'Lomé', 'Togo', 'Formation informatique rapportée par une source secondaire; offre actuelle à confirmer.', 'private', array['La Maîtrise']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Supérieur des Technologies et de Management (ISTM)', 'Lomé', 'Togo', 'Formation en maintenance informatique rapportée par une source secondaire.', 'private', array['ISTM']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ISTA Kara', 'Kara', 'Togo', 'Maintenance informatique et réseaux rapportées par une source secondaire.', 'private', array['ISTA-Kara']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Institut Supérieur de Gestion Monseigneur Bakpessi', 'Kara', 'Togo', 'Maintenance informatique rapportée par une source secondaire.', 'private', array['ISG Mgr Bakpessi']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ESAT-Togo', 'Lomé', 'Togo', 'Technologies avancées et métiers du numérique; parcours exacts à confirmer.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ISBIC-ALG', 'Lomé', 'Togo', 'Institut Supérieur Bilingue d''Informatique et de Calcul « Auguste Le Grand »; parcours exacts à confirmer.', 'private', array['ISBIC']::text[], 'À confirmer auprès de l''école', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('AIC-Togo', 'Lomé', 'Togo', 'Piste de recherche citée dans un annuaire.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('IPM-Togo', 'Lomé', 'Togo', 'Piste de recherche citée dans un annuaire.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('IFTS', 'Lomé', 'Togo', 'Piste de recherche citée dans un annuaire.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('ISM Adonaï', 'Lomé', 'Togo', 'Piste de recherche citée dans un annuaire.', 'private', array[]::text[], 'Piste à vérifier; aucun parcours informatique confirmé', null)
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Faculté d''Informatique — Université Alexandru Ioan Cuza', 'Iași', 'Roumanie', 'Faculté publique proposant des licences en informatique et intelligence artificielle, ainsi que des masters en informatique.', 'public', array['UAIC','FII UAIC']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://info.uaic.ro/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Faculté d''Automatique et d''Informatique — POLITEHNICA Bucarest', 'Bucarest', 'Roumanie', 'Faculté publique formant en ingénierie des systèmes et en informatique et technologies de l''information.', 'public', array['ACS UPB','POLITEHNICA Bucarest']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://acs.upb.ro/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values ('Faculté de Mathématiques et d''Informatique — Université Babeș-Bolyai', 'Cluj-Napoca', 'Roumanie', 'Faculté publique proposant des études de mathématiques et d''informatique.', 'public', array['UBB','FMI UBB']::text[], 'Vérifié (sources publiques, nov. 2026)', 'https://www.cs.ubbcluj.ro/')
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description, sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel (GL)', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/wp-content/uploads/2025/08/Appel_a-Candidatures-2025-2026-EPL.pdf' from public.institutions where name = 'École Polytechnique de Lomé (EPL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Systèmes et Réseaux Informatiques (SR)', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/wp-content/uploads/2025/08/Appel_a-Candidatures-2025-2026-EPL.pdf' from public.institutions where name = 'École Polytechnique de Lomé (EPL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Informatique et Systèmes (IS)', 'Cycle ingénieur (S1 à S10)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/wp-content/uploads/2025/08/Appel_a-Candidatures-2025-2026-EPL.pdf' from public.institutions where name = 'École Polytechnique de Lomé (EPL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence Artificielle et Big Data (IA-BD)', 'Cycle ingénieur (S1 à S10)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/wp-content/uploads/2025/08/Appel_a-Candidatures-2025-2026-EPL.pdf' from public.institutions where name = 'École Polytechnique de Lomé (EPL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Master international en Génie Informatique (UTT)', 'Master (S1 à S4)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/appel-a-candidatures-2025-2026-master-international-en-genie-informatique/' from public.institutions where name = 'Université de Lomé (UL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Master international Systèmes et Informatique (UTBM)', 'Master (S1 à S4)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/appel-a-candidatures-aux-masters-systemes-et-informatique-intelligence-artificielle-et-big-data/' from public.institutions where name = 'Université de Lomé (UL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Master international Intelligence Artificielle et Big Data (UTBM)', 'Master (S1 à S4)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univ-lome.tg/appel-a-candidatures-aux-masters-systemes-et-informatique-intelligence-artificielle-et-big-data/' from public.institutions where name = 'Université de Lomé (UL)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Développement Web et Mobile (LPDM)', 'Licence professionnelle (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univkara.tg/facultes-et-instituts/fast/' from public.institutions where name = 'Université de Kara (UK)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Sécurité Informatique et Cybersécurité (LPSIC)', 'Licence professionnelle (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://univkara.tg/facultes-et-instituts/fast/' from public.institutions where name = 'Université de Kara (UK)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel et Systèmes d''Information (GLSI)', 'Licence professionnelle en informatique (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://new.iai-togo.tg/officiel/admission' from public.institutions where name = 'Institut Africain d''Informatique (IAI-Togo)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Administration des Systèmes et Réseaux (ASR)', 'Licence professionnelle en informatique (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://new.iai-togo.tg/officiel/admission' from public.institutions where name = 'Institut Africain d''Informatique (IAI-Togo)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Multimédia, Technologies Web et Infographie (MTWI)', 'Licence professionnelle en informatique (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://new.iai-togo.tg/officiel/admission' from public.institutions where name = 'Institut Africain d''Informatique (IAI-Togo)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Cycle Ingénieur Concepteur', 'Cycle ingénieur (S1 à S10)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://new.iai-togo.tg/officiel/admission' from public.institutions where name = 'Institut Africain d''Informatique (IAI-Togo)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Informatique, Réseaux et Télécommunications', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/' from public.institutions where name = 'ESGIS Togo'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Développement d''applications', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/' from public.institutions where name = 'ESGIS Togo'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Réseaux informatiques', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/' from public.institutions where name = 'ESGIS Togo'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Sécurité informatique', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/' from public.institutions where name = 'ESGIS Togo'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence artificielle', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.esgis.org/' from public.institutions where name = 'ESGIS Togo'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Réseaux, Systèmes et Sécurité', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Cybersécurité', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Développement Web, Bases de Données et Big Data', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence Artificielle', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Science des Données', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.ipnetinstitute.com/' from public.institutions where name = 'IPNET Institute of Technology'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://defitech.tg/' from public.institutions where name = 'Institut Polytechnique DEFITECH'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Systèmes et Réseaux Informatiques', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://defitech.tg/' from public.institutions where name = 'Institut Polytechnique DEFITECH'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence Artificielle et Big Data', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://defitech.tg/' from public.institutions where name = 'Institut Polytechnique DEFITECH'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://esig.tg/parcours-academique.html' from public.institutions where name = 'ESIG Global Success'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Réseaux, Systèmes et Cybersécurité', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://esig.tg/parcours-academique.html' from public.institutions where name = 'ESIG Global Success'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence Artificielle', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://esig.tg/parcours-academique.html' from public.institutions where name = 'ESIG Global Success'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Génie Logiciel', 'Licence professionnelle (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/' from public.institutions where name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Cybersécurité', 'Licence professionnelle (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/' from public.institutions where name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Big Data et Intelligence Artificielle', 'Licence professionnelle (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/' from public.institutions where name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Réseaux Informatiques et Télécommunications', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/' from public.institutions where name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Cycle Ingénieur en Informatique', 'Cycle ingénieur (S1 à S10)', true, 'Vérifié (sources publiques, nov. 2026)', 'https://ucao-uut.tg/' from public.institutions where name = 'UCAO — Unité Universitaire du Togo (UCAO-UUT)'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Systèmes Informatiques et Logiciel', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'ESIBA'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Réseaux Mobiles et Sécurité', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'ESIBA'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Développement d''Applications', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'ESIBA'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Sécurité Informatique', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'IFNTI Sokodé'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Administration des Réseaux', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'IFNTI Sokodé'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence Artificielle et Génie Logiciel', 'Licence (S1 à S6)', true, 'Vérifié (sources publiques, nov. 2026)', null from public.institutions where name = 'ESCEN'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Informatique (licence)', 'Licence en informatique', true, 'Vérifié (sources publiques, nov. 2026)', 'https://info.uaic.ro/studii-de-licenta/' from public.institutions where name = 'Faculté d''Informatique — Université Alexandru Ioan Cuza'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Intelligence artificielle (licence)', 'Licence en intelligence artificielle', true, 'Vérifié (sources publiques, nov. 2026)', 'https://info.uaic.ro/studii-de-licenta/' from public.institutions where name = 'Faculté d''Informatique — Université Alexandru Ioan Cuza'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Software Engineering (master)', 'Master en anglais', true, 'Vérifié (sources publiques, nov. 2026)', 'https://info.uaic.ro/programe-studii/' from public.institutions where name = 'Faculté d''Informatique — Université Alexandru Ioan Cuza'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Information Security (master)', 'Master en anglais', true, 'Vérifié (sources publiques, nov. 2026)', 'https://info.uaic.ro/programe-studii/' from public.institutions where name = 'Faculté d''Informatique — Université Alexandru Ioan Cuza'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Calculatoare și Tehnologia Informației', 'Domaine de licence', true, 'Vérifié (sources publiques, nov. 2026)', 'https://acs.upb.ro/' from public.institutions where name = 'Faculté d''Automatique et d''Informatique — POLITEHNICA Bucarest'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Ingineria Sistemelor', 'Domaine de licence', true, 'Vérifié (sources publiques, nov. 2026)', 'https://acs.upb.ro/' from public.institutions where name = 'Faculté d''Automatique et d''Informatique — POLITEHNICA Bucarest'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, 'Informatique', 'Études en informatique', true, 'Vérifié (sources publiques, nov. 2026)', 'https://www.cs.ubbcluj.ro/' from public.institutions where name = 'Faculté de Mathématiques et d''Informatique — Université Babeș-Bolyai'
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed, verification = excluded.verification, source_url = excluded.source_url;
commit;
