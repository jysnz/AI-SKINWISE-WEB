"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { clamp, toList, type ApiResult, type Photo } from "@/lib/api";
import { useReducedMotion } from "@/lib/hooks";
import { AccordionList } from "./Info";

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  !items.length ? <p>{empty}</p> : items.length === 1 ? <p>{items[0]}</p> : <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;

export default function Result({ data, photos, onReset, onPhoto }: { data: ApiResult; photos: Photo[]; onReset: () => void; onPhoto: (url: string) => void }) {
  const rm = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState(0);
  const ok = data.success;
  const p = ok ? data.prediction : {};
  const info = ok ? data.info : {};
  const conf = clamp(ok ? p.final_confidence : data.details?.final);
  const rawName = p.disease_name || "Unknown";
  // Only a successful answer can be "outside coverage"; a low-confidence failure has no prediction at all.
  const outsideCoverage = ok && /^(unknown|none)$/i.test(rawName);
  const normal = /^normal$/i.test(rawName);
  const low = !ok || conf < 80 || outsideCoverage;
  const name = rawName;
  const needsPromptCare = /cellulitis|shingles|larva/i.test(name);
  const seek = low || needsPromptCare;
  const title = !ok ? "We could not be sure" : outsideCoverage ? "No supported match" : name;
  const refs = ok && Array.isArray(info.references)
    ? info.references.map((r: any) => String((r && r.reference) || r)).filter((r) => /^https?:\/\//i.test(r.trim())) : [];
  const pics = photos.slice(0, 3);
  const cur = pics[Math.min(active, pics.length - 1)];

  useEffect(() => {
    head.current?.focus({ preventScroll: true });
    // When embedded (the live preview on the landing page), scrollIntoView would also scroll the page around the iframe.
    if (window.top !== window) return;
    root.current?.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
  }, [rm]);

  const description = toList(info.description);
  const symptoms = toList(info.expected_symptoms);
  const remedies = toList(info.suggested_treatment);
  // Normal and Unknown results carry no description, symptoms or remedies, whatever the server sent.
  const items = ok && !normal && !outsideCoverage ? [
    ...(description.length ? [{ id: "d", title: "Description", body: <List items={description} empty="No description available." /> }] : []),
    ...(symptoms.length ? [{ id: "s", title: "Typical symptoms", body: <List items={symptoms} empty="No data." /> }] : []),
    ...(remedies.length ? [{ id: "r", title: "Suggested home care", body: <List items={remedies} empty="No home-care advice available." /> }] : []),
    ...(refs.length ? [{ id: "x", title: "References", body: <ul>{refs.map((u) => <li key={u}><a href={u.trim()} target="_blank" rel="noopener noreferrer">{u.trim()}</a></li>)}</ul> }] : []),
  ] : [];

  const nextTitle = outsideCoverage || seek ? "Worth a professional look" : "What to do next";
  const nextText = !ok
    ? "Try clearer photos in good light, or add more symptoms. A dermatologist can give a proper answer."
    : outsideCoverage
      ? "The image did not match a supported category. This does not rule out a health concern; contact a healthcare professional if the area worries you."
      : normal
        ? "The model did not identify one of its supported conditions. A normal result cannot rule out every concern, so seek professional advice if the area changes or worries you."
        : conf < 80
          ? "This result is uncertain. Try a sharper photo in even light, add your symptoms, and consult a healthcare professional if you remain concerned."
          : needsPromptCare
            ? "This can look like other conditions and some need prescription care. Book a dermatologist visit, and sooner if it spreads, hurts more or comes with a fever."
            : "Read the details below, keep the area clean, and see a dermatologist if it does not improve in a week or two.";

  return (
    <section ref={root} className="res" aria-labelledby="res-title">
      <h1 className="sr">Your skin check result</h1>

      <div className="res-photo">
        <div className="cap-stage has-photo locked res-stage">
          <div className="cap-corners" aria-hidden="true"><i /><i /><i /><i /></div>
          {cur && (
            <>
              <button type="button" className="res-view" aria-label="View photo larger" onClick={() => onPhoto(cur.url)}>
                <div key={cur.url} className="cap-frame" style={{ "--n": 1 } as CSSProperties}>
                  <div className="cap-cell">
                    <img className="cap-bg" src={cur.url} alt="" aria-hidden="true" draggable={false} />
                    <img src={cur.url} alt={"Photo " + (Math.min(active, pics.length - 1) + 1) + " of " + pics.length} draggable={false} />
                  </div>
                  <span className="res-expand" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </button>
              <div key={"s" + cur.url} className="cap-scanbox once" aria-hidden="true"><i /></div>
            </>
          )}
        </div>
        {pics.length > 1 && (
          <ul className="res-thumbs" aria-label="Photos analyzed">
            {pics.map((ph, i) => (
              <li key={ph.url}>
                <button type="button" className={clsx("cap-thumb", i === Math.min(active, pics.length - 1) && "on")} aria-label={"Show photo " + (i + 1)} aria-pressed={i === Math.min(active, pics.length - 1)} onClick={() => setActive(i)}>
                  <img src={ph.url} alt="" draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="res-body">
        <div className="res-top">
          <div className="res-id">
            <h2 id="res-title" ref={head} tabIndex={-1} className="res-title">{title}</h2>
          </div>
        </div>

        {!ok && <p className="res-msg">{data.message || "We could not get a reliable result from these photos."}</p>}

        <div className={clsx("next", seek && "urgent")}>
          <span className="next-ic" aria-hidden="true">
            {seek
              ? <svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M10 5.5v5.5M10 14.2v.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="m5 10.5 3.2 3.2L15 6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </span>
          <div>
            <strong>{nextTitle}</strong>
            <p>{nextText}</p>
            <p className="next-note">This model is not 100% accurate. It is best to consult a board&#8209;certified dermatologist.</p>
          </div>
        </div>

        {ok && items.length > 0 && <AccordionList items={items} defaultOpen={items.filter((i) => i.id !== "x").map((i) => i.id)} />}

        <div className="res-actions">
          <button className="cap-go ready res-again" type="button" onClick={onReset}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7L17.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
            <span>{ok ? "Scan again" : "Try again"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
