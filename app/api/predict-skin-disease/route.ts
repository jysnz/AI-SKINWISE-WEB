import { DEFAULT_API, TIMEOUT_MS } from "@/lib/api";
import { hasNoWriteUp, lookupDisease } from "@/lib/diseases";

export const runtime = "nodejs";

// Same-origin proxy to the SkinWise server so the browser never hits CORS. The server does all the work:
// it reads the photos, the affected area and the symptoms together and returns the condition info, so this
// route only forwards the fields and the answer. SKINWISE_API_URL (for example http://localhost:8000) overrides the host.
const UPSTREAM = process.env.SKINWISE_API_URL
  ? process.env.SKINWISE_API_URL.replace(/\/+$/, "") + "/predict-skin-disease"
  : DEFAULT_API;

/** Replaces the server's `info` with the Supabase write-up (description, symptoms, non-medical remedies).
 *  Normal and Unknown results get no write-up at all. */
async function withWriteUp(data: Record<string, any>) {
  if (!data.success || !data.prediction) return data;
  const name = data.prediction.disease_name;
  if (hasNoWriteUp(name)) return { ...data, info: {} };
  const found = await lookupDisease(name);
  // The server's own remedies can be medical, so they are never used as a fallback.
  const { suggested_treatment: _medical, ...rest } = data.info ?? {};
  return { ...data, info: found ? { ...rest, ...found } : rest };
}

const IMAGE_FIELDS =["image_1", "image_2", "image_3"] as const;
const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const startedAt = Date.now();
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    console.error("[AI-SKINWISE proxy] request body could not be read");
    return Response.json({ error: "The uploaded photos or form data could not be read." }, { status: 400 });
  }

  const out = new FormData();
  let photoCount = 0;
  for (const field of IMAGE_FIELDS) {
    const file = incoming.get(field);
    if (file && typeof file !== "string") { out.append(field, file, file.name || field); photoCount += 1; }
  }
  if (!photoCount) return Response.json({ error: "Add at least one photo before analysis." }, { status: 400 });
  out.append("body_location", text(incoming.get("body_location")));
  out.append("selected_symptoms", text(incoming.get("selected_symptoms")));
  out.append("user_description", text(incoming.get("user_description")));

  // Counts only: photos, symptoms and notes are never logged.
  console.info("[AI-SKINWISE proxy] forwarding", {
    host: new URL(UPSTREAM).host,
    photoCount,
    hasBodyArea: !!text(incoming.get("body_location")),
    hasSymptoms: !!text(incoming.get("selected_symptoms")),
    hasNotes: !!text(incoming.get("user_description")),
  });

  try {
    const upstream = await fetch(UPSTREAM, { method: "POST", body: out, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    const contentType = upstream.headers.get("content-type") || "not provided";
    const raw = await upstream.text();
    let data: unknown = null;
    try { data = JSON.parse(raw); } catch { /* not JSON, handled below */ }

    console.info("[AI-SKINWISE proxy] upstream answered", { status: upstream.status, contentType, elapsedMs: Date.now() - startedAt });

    if (data && typeof data === "object") return Response.json(await withWriteUp(data as Record<string, any>), { status: upstream.status });

    // A suspended or sleeping Render service answers with an HTML page, not JSON.
    const unavailable = upstream.status === 503 || upstream.status === 502 || upstream.status === 504;
    return Response.json(
      {
        error: unavailable
          ? "The SkinWise analysis server is not available right now (HTTP " + upstream.status + "). Please try again in a moment."
          : "The analysis server sent an unreadable response (HTTP " + upstream.status + ").",
        code: unavailable ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_INVALID_RESPONSE",
      },
      { status: upstream.ok ? 502 : upstream.status },
    );
  } catch (error) {
    const e = error as Error;
    console.error("[AI-SKINWISE proxy] request failed", { name: e.name || "UnknownError", message: e.message, elapsedMs: Date.now() - startedAt });
    return Response.json(
      { error: e.name === "TimeoutError" ? "The analysis server took too long to answer. Please try again." : "The analysis server could not be reached.", code: "PREDICTION_SERVICE_UNREACHABLE" },
      { status: 502 },
    );
  }
}
