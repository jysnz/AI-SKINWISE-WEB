export const NAV = [
  { id: "how", label: "How it works" },
  { id: "conditions", label: "Conditions" },
  { id: "faq", label: "FAQ" },
];

export const HOW = [
  { t: "Add photos", d: "Up to three clear photos of the area. Natural light and a steady hand give the best match." },
  { t: "Compare visual patterns", d: "The model scores supported conditions for each photo and averages the scores across your photos." },
  { t: "Review the estimate", d: "See the top visual match and its confidence. The model does not assess symptoms or suggest treatment." },
];

export const CONDITIONS = [
  { n: "Acne", d: "Clogged pores and inflamed bumps" },
  { n: "Athlete's Foot", d: "Itchy, scaly fungal rash on the feet" },
  { n: "Cellulitis", d: "Spreading, warm, painful skin infection" },
  { n: "Chickenpox", d: "Itchy blisters across the body" },
  { n: "Cutaneous Larva Migrans", d: "Winding red tracks from a parasite" },
  { n: "Impetigo", d: "Honey-colored crusts, common in children" },
  { n: "Nail Fungus", d: "Thick, discolored or brittle nails" },
  { n: "Ringworm", d: "Ring-shaped, scaly fungal patch" },
  { n: "Shingles", d: "Painful band of blisters on one side" },
  { n: "Normal skin", d: "Nothing of concern detected" },
];

export const FAQ = [
  { q: "Is this a medical diagnosis?", a: "No. SkinWise gives general information based on a model trained on common conditions. It cannot replace an exam by a licensed dermatologist." },
  { q: "What makes a good photo?", a: "Natural light, in focus, the affected area in the middle of the frame and filling most of it. Take two or three from slightly different angles." },
  { q: "Why did I get a low confidence result?", a: "The visual model did not find a clear match. Try sharper photos in even light, or consult a healthcare professional if you are concerned." },
  { q: "Why is the first scan slow?", a: "The analysis server sleeps when idle and can take up to a minute to wake. Later scans are much faster." },
];
