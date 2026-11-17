type DebugDetails = Record<string, string | number | boolean | null | undefined>;

const enabled = process.env.NODE_ENV === "development";

export function debugSkinWise(stage: string, details: DebugDetails = {}) {
  if (enabled) console.info(`[AI-SKINWISE] ${stage}`, details);
}

export function debugSkinWiseError(stage: string, details: DebugDetails = {}) {
  if (enabled) console.error(`[AI-SKINWISE] ${stage}`, details);
}
