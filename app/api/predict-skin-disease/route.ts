import { DEFAULT_API, TIMEOUT_MS } from "@/lib/api";

export const runtime = "nodejs";

type KiroverseResult = {
  success?: boolean;
  disease?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  detail?: string;
};

const round = (value: number) => Math.round(value * 100) / 100;

export async function POST(request: Request) {
  const startedAt = Date.now();
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[AI-SKINWISE proxy] request body could not be read", {
      name: error instanceof Error ? error.name : "UnknownError",
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json({ error: "The uploaded photos or form data could not be read." }, { status: 400 });
  }

  const photos = formData.getAll("image").filter((value): value is File => typeof value !== "string");
  if (!photos.length) {
    return Response.json({ error: "Add at least one photo before analysis." }, { status: 400 });
  }

  console.info("[AI-SKINWISE proxy] forwarding visual prediction", {
    photoCount: photos.length,
    endpoint: DEFAULT_API,
  });

  try {
    const probabilityTotals = new Map<string, number>();

    // Kiroverse accepts one file named `image` per request. Send each selected
    // photo separately, then average the returned class probabilities.
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const imageForm = new FormData();
      imageForm.append("image", photo, photo.name || `skin-photo-${index + 1}`);

      const upstream = await fetch(DEFAULT_API, {
        method: "POST",
        body: imageForm,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      const contentType = upstream.headers.get("content-type") || "not provided";
      let result: KiroverseResult;
      try {
        result = await upstream.json();
      } catch {
        console.error("[AI-SKINWISE proxy] prediction service returned non-JSON", {
          photoIndex: index + 1,
          status: upstream.status,
          contentType,
          elapsedMs: Date.now() - startedAt,
        });
        return Response.json(
          { error: `The prediction service returned an unreadable response (HTTP ${upstream.status}).`, code: "UPSTREAM_INVALID_RESPONSE" },
          { status: upstream.ok ? 502 : upstream.status },
        );
      }

      console.info("[AI-SKINWISE proxy] photo prediction responded", {
        photoIndex: index + 1,
        status: upstream.status,
        contentType,
      });

      if (!upstream.ok || result.success !== true || !result.disease) {
        const message = result.detail || "The prediction service could not analyze this photo.";
        return Response.json({ error: message, code: "UPSTREAM_PREDICTION_FAILED" }, { status: upstream.ok ? 502 : upstream.status });
      }

      const probabilities = result.probabilities && Object.keys(result.probabilities).length
        ? result.probabilities
        : { [result.disease]: Number(result.confidence) || 0 };
      for (const [label, rawScore] of Object.entries(probabilities)) {
        const score = Number(rawScore);
        if (Number.isFinite(score)) probabilityTotals.set(label, (probabilityTotals.get(label) || 0) + score);
      }
    }

    const averaged = [...probabilityTotals.entries()]
      .map(([label, score]) => [label, round(score / photos.length)] as const)
      .sort((a, b) => b[1] - a[1]);
    const best: readonly [string, number] = averaged[0] ?? ["Unknown", 0];
    const [rawDiseaseName, confidence] = best;
    const diseaseName = rawDiseaseName === "Nail-Fungus" ? "Nail Fungus" : rawDiseaseName;

    console.info("[AI-SKINWISE proxy] combined photo predictions", {
      photoCount: photos.length,
      disease: diseaseName,
      confidence,
      elapsedMs: Date.now() - startedAt,
    });

    return Response.json({
      success: true,
      prediction: {
        disease_name: diseaseName,
        final_confidence: confidence,
        visual_confidence_avg: confidence,
      },
      info: {
        description: `Visual-only estimate averaged across ${photos.length} photo${photos.length === 1 ? "" : "s"}. The model does not analyze symptoms or body location. This result is general information, not a diagnosis.`,
        expected_symptoms: [],
        suggested_treatment: [],
        references: [],
      },
    });
  } catch (error) {
    const e = error as Error;
    console.error("[AI-SKINWISE proxy] prediction service request failed", {
      name: e.name || "UnknownError",
      message: e.message || String(error),
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json(
      { error: "The prediction service could not be reached.", code: "PREDICTION_SERVICE_UNREACHABLE" },
      { status: 502 },
    );
  }
}
