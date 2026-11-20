// Génère supabase/catalog.sql à partir du catalogue de frontend/scripts/store.js.
// Usage : node supabase/generate-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("..", import.meta.url);
const context = {
    window: {},
    document: { addEventListener() {}, readyState: "complete", querySelectorAll: () => [], dispatchEvent() {} },
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: {},
    CustomEvent: class {}
};
runInNewContext(readFileSync(new URL("frontend/scripts/store.js", root), "utf8"), context);
const { institutions, programs } = context.window.EduVaultStore.loadState();

const q = (value) => (value == null ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const textArray = (values = []) => `array[${values.map(q).join(", ")}]::text[]`;
const VERIFIED = "Vérifié (sources publiques, nov. 2026)";

let sql = `-- EduVault — Catalogue des établissements et filières informatiques (Togo, novembre 2026)
-- Fichier généré par supabase/generate-catalog.mjs — ne pas modifier à la main.
-- À exécuter APRÈS supabase/schema.sql. Peut être relancé sans créer de doublons.
begin;

`;
for (const institution of institutions) {
    const verification = institution.is_listed ? VERIFIED : institution.verification || "À confirmer auprès de l’établissement";
    sql += `insert into public.institutions (name, city, country, description, sector, aliases, verification, website)
values (${q(institution.name)}, ${q(institution.city)}, ${q(institution.country)}, ${q(institution.description || "")}, ${q(institution.sector || "private")}, ${textArray(institution.aliases)}, ${q(verification)}, ${q(institution.website)})
on conflict (name) do update set city = excluded.city, country = excluded.country, description = excluded.description,
    sector = excluded.sector, aliases = excluded.aliases, verification = excluded.verification, website = excluded.website;
`;
}
sql += "\n";
for (const program of programs) {
    const institution = institutions.find((item) => item.id === program.institution_id);
    if (!institution) continue;
    // « degree » contient le type de diplôme : il pilote le filtre du formulaire de dépôt et le nombre de semestres.
    sql += `insert into public.programs (institution_id, name, degree, is_listed, verification, source_url)
select id, ${q(program.name)}, ${q(program.degree_type || program.degree)}, ${institution.is_listed}, ${q(program.verification || VERIFIED)}, ${q(program.source_url)}
from public.institutions where name = ${q(institution.name)}
on conflict (institution_id, name) do update set degree = excluded.degree, is_listed = excluded.is_listed,
    verification = excluded.verification, source_url = excluded.source_url;
`;
}
sql += "\ncommit;\n";
writeFileSync(new URL("supabase/catalog.sql", root), sql);
console.log(`${institutions.length} établissements, ${programs.length} filières → supabase/catalog.sql`);
