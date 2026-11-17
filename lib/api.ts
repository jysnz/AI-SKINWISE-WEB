import { debugSkinWise, debugSkinWiseError } from "./debug";

export const DEFAULT_API = "https://kiroverse-server.onrender.com/predict-skin-disease";
export const TIMEOUT_MS = 90000;
export const MAX_FILES = 3;
export const MAX_MB = 10;

export type Photo = { file: File | null; url: string };
export type Info = { description?: string | string[]; expected_symptoms?: string | string[]; suggested_treatment?: string | string[]; references?: unknown[] };
export type Prediction = { disease_name?: string; final_confidence?: number; visual_confidence_avg?: number };
export type ApiResult =
  | { success: true; prediction: Prediction; info: Info }
  | { success: false; low_confidence?: boolean; message?: string; details?: { visual?: number; match?: number; final?: number } };

/** ?api=http://localhost:8000 points the app at a local server. */
export function apiUrl(): string {
  if (typeof location === "undefined") return DEFAULT_API;
  const q = new URLSearchParams(location.search).get("api");
  return q && /^https?:\/\//.test(q) ? q.replace(/\/$/, "") + "/predict-skin-disease" : DEFAULT_API;
}

export async function predict(opts: { photos: Photo[]; signal: AbortSignal }): Promise<ApiResult> {
  const fd = new FormData();
  opts.photos.forEach((p) => p.file && fd.append("image", p.file));
  const configuredEndpoint = apiUrl();
  // Keep the default prediction request same-origin so browser CORS policy does not
  // block it. Custom ?api= URLs remain available for local development servers.
  const endpoint = configuredEndpoint === DEFAULT_API ? "/api/predict-skin-disease" : configuredEndpoint;
  const endpointForLog = (() => {
    try { const url = new URL(endpoint, location.origin); return `${url.origin}${url.pathname}`; }
    catch { return "invalid endpoint URL"; }
  })();
  const startedAt = performance.now();
  const files = opts.photos.map(({ file }) => ({
    type: file?.type || "missing file",
    sizeBytes: file?.size ?? 0,
  }));
  debugSkinWise("prediction.request.started", {
    endpoint: endpointForLog,
    method: "POST",
    photoCount: files.length,
    photos: JSON.stringify(files),
    timeoutMs: TIMEOUT_MS,
  });

  let res: Response;
  try {
    res = await fetch(endpoint, { method: "POST", body: fd, signal: opts.signal });
  } catch (error) {
    const e = error as Error;
    debugSkinWiseError("prediction.fetch.failed", {
      endpoint: endpointForLog,
      name: e.name || "UnknownError",
      message: e.message || String(error),
      elapsedMs: Math.round(performance.now() - startedAt),
      aborted: opts.signal.aborted,
    });
    throw error;
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  const contentType = res.headers.get("content-type") || "not provided";
  debugSkinWise("prediction.response.received", {
    status: res.status,
    ok: res.ok,
    contentType,
    elapsedMs,
  });

  let data: any;
  try {
    data = await res.json();
  } catch (error) {
    const e = error as Error;
    debugSkinWiseError("prediction.response.invalid_json", {
      status: res.status,
      contentType,
      name: e.name || "ParseError",
      message: e.message || String(error),
      elapsedMs,
    });
    throw new Error(`The server sent an unreadable response (HTTP ${res.status}, ${contentType}).`);
  }
  if (!data) {
    debugSkinWiseError("prediction.response.empty", { status: res.status, elapsedMs });
    throw new Error("The server sent an empty response (HTTP " + res.status + ").");
  }
  if (data.error) {
    debugSkinWiseError("prediction.response.api_error", {
      status: res.status,
      fields: Object.keys(data).join(","),
      elapsedMs,
    });
    throw new Error(String(data.error));
  }
  debugSkinWise("prediction.response.parsed", {
    status: res.status,
    fields: Object.keys(data).join(","),
    success: typeof data.success === "boolean" ? data.success : "missing",
    lowConfidence: data.low_confidence === true,
    elapsedMs,
  });
  return data as ApiResult;
}

export const toList = (v: unknown): string[] =>
  !v ? [] : Array.isArray(v) ? v.map(String).filter(Boolean) : String(v).split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
export const clamp = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));

export function demoPhotos(): Photo[] {
  return [0, 1, 2].map((seed) => {
    const c = document.createElement("canvas"); c.width = c.height = 320;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 320, 320);
    g.addColorStop(0, ["#D9A184", "#C98F6E", "#D7A487"][seed]); g.addColorStop(1, ["#B97B5E", "#AE7052", "#9AAFC9"][seed]);
    x.fillStyle = g; x.fillRect(0, 0, 320, 320);
    for (let i = 0; i < 30; i++) {
      x.fillStyle = "rgba(" + (seed === 2 ? "80,95,120," : "125,72,50,") + (0.05 + (i % 4) * 0.03) + ")";
      x.beginPath(); x.ellipse((i * 97 + seed * 53) % 320, (i * 61 + seed * 31) % 320, 14 + (i % 5) * 9, 10 + (i % 4) * 7, i, 0, 6.3); x.fill();
    }
    return { file: null, url: c.toDataURL("image/png") };
  });
}
export const DEMO_OK: ApiResult = { success: true, prediction: { disease_name: "Ringworm", final_confidence: 87.4, visual_confidence_avg: 87.4 }, info: { description: "Illustrative visual estimate only. The model does not analyze symptoms or body location and this is not a diagnosis." } };
export const DEMO_LOW: ApiResult = { success: false, low_confidence: true, message: "Confidence was too low for a reliable result.", details: { visual: 64, match: 52, final: 71 } };
