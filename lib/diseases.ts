// Server-only: reads the condition write-up (description, symptoms, remedies) from the Supabase SkinDiseases table.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY live in .env.local and are never sent to the browser.

export type DiseaseInfo = { description: string[]; expected_symptoms: string[]; suggested_treatment: string[] };
type Row = { disease_name: string; description: string | null; symptoms: string | null; remedies: string | null };

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
/** "normal" and "unknown" (and the server's "none") get no write-up at all. */
export const hasNoWriteUp = (name: unknown) => !name || /^(normal|unknown|none)$/i.test(String(name).trim());

// The table is tiny and rarely changes, so keep it for a few minutes instead of querying on every scan.
let cache: { at: number; rows: Map<string, Row> } | null = null;
const TTL = 5 * 60 * 1000;

async function load(): Promise<Map<string, Row> | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !token) return null;
  try {
    const res = await fetch(base + "/rest/v1/SkinDiseases?select=disease_name,description,symptoms,remedies", {
      headers: { apikey: token, Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error("[AI-SKINWISE proxy] Supabase answered", res.status); return null; }
    const rows = (await res.json()) as Row[];
    cache = { at: Date.now(), rows: new Map(rows.map((r) => [key(r.disease_name), r])) };
    return cache.rows;
  } catch (e) {
    console.error("[AI-SKINWISE proxy] Supabase lookup failed", (e as Error).name);
    return null;
  }
}

// Medicine, prescriptions, procedures and brand names. A remedy line that mentions any of these is dropped,
// because the app only suggests non-medical care (cleaning, compresses, rest, avoiding triggers).
const MEDICAL = new RegExp([
  "antibiotic", "antifungal", "antiviral", "antihistamine", "anthelmint", "antihelmint", "corticosteroid", "steroid",
  "medication", "medicine", "medicat", "prescri", "over-the-counter", "\\botc\\b", "\\boral\\b", "topical", "\\bpills?\\b",
  "tablet", "capsule", "injection", "intravenous", "\\biv\\b", "hospital", "\\bdrugs?\\b", "nsaid", "ibuprofen", "aspirin",
  "naproxen", "acetaminophen", "pain reliever", "ointment", "\\bcreams?\\b", "\\bgels?\\b", "\\bsprays?\\b", "\\bpowders?\\b",
  "shampoo", "lotion", "benzoyl", "salicylic", "azelaic", "retinoid", "retin", "dapsone", "hormone", "laser", "cryotherapy",
  "liquid nitrogen", "surgery", "therapy", "treatment options", "dose", "\\bmg\\b", "ivermectin", "albendazole", "mebendazole",
  "thiabendazole", "tiabendazole", "mupirocin", "bacitracin", "clindamycin", "cephalexin", "clotrimazole", "miconazole",
  "terbinafine", "tolnaftate", "fluconazole", "itraconazole", "acyclovir", "valacyclovir", "famciclovir", "pharmacist",
  "formulation", "tricky to treat", "healthcare provider (will|may|might|can|won)", "\\bprovider (will|may|might|can)", "®", "™", "no cure", "blood tests",
  "little to no benefit", "dermatologist", "podiatrist", "course of", "apple cider", "tea tree",
].join("|"), "i");

const clean = (line: string) => line.replace(/^[\s\-–—•*·]+/, "").replace(/\s+/g, " ").trim();

const lines = (text: string | null) => (text ?? "").split(/\r?\n/).map(clean).filter(Boolean);

/** Keeps only the non-medical care, judged sentence by sentence so one medicine mention does not hide the advice around it.
 *  Lead-ins ending in ":" and bare headings are kept only when real advice follows them. */
export function nonMedicalRemedies(text: string | null): string[] {
  // A sentence that starts with one of these leans on the sentence before it ("It targets bacteria"), so it goes
  // with its parent when the parent was a medicine sentence.
  const follows = /^(it|they|these|this|those|then|in fact|if|still|however|you often|you may|you can)\b/i;
  const perLine: (string | null)[] = lines(text).map((line) => {
    if (line.split(" ").length <= 6 && !/[.!?:]$/.test(line)) return null; // bare heading
    let droppedPrev = false;
    const kept: string[] = [];
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      if (MEDICAL.test(sentence) || (droppedPrev && follows.test(sentence))) droppedPrev = true;
      else { kept.push(sentence); droppedPrev = false; }
    }
    return kept.length ? kept.join(" ") : null;
  });
  // A lead-in ending in ":" is kept only when the line after it survived.
  return perLine.filter((l, i): l is string => !!l && (!/:$/.test(l) || !!perLine[i + 1]));
}

export async function lookupDisease(name: unknown): Promise<DiseaseInfo | null> {
  if (hasNoWriteUp(name)) return null;
  const rows = await load();
  const row = rows?.get(key(String(name)));
  if (!row) return null;
  return {
    description: lines(row.description),
    expected_symptoms: lines(row.symptoms),
    suggested_treatment: nonMedicalRemedies(row.remedies),
  };
}
