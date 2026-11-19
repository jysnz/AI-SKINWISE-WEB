type DebugDetails = Record<string, string | number | boolean | null | undefined>;

const enabled = process.env.NODE_ENV === "development";

export function debugSkinWise(stage: string, details: DebugDetails = {}) {
  if (enabled) console.info(`[AI-SKINWISE] ${stage}`, details);
}

// Every failure logged here is handled: the person sees a toast and keeps their photos and details. console.warn keeps it
// visible in the browser console but does not trip Next's dev error overlay, which only reacts to console.error.
export function debugSkinWiseError(stage: string, details: DebugDetails = {}) {
  if (enabled) console.warn(`[AI-SKINWISE] ${stage}`, JSON.stringify(details));
}
