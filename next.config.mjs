import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Dev and production builds write to different folders. If they share ".next",
// running `next build` while `next dev` is up overwrites the dev server's files
// and the page loses its CSS and scripts. NEXT_DIST_DIR lets scripts (for
// example the video renderer) use a third folder of their own.
export default (phase) => ({
  distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
});
