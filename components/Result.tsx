"use client";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import NumberFlow from "@number-flow/react";
import { clamp, toList, type ApiResult, type Photo } from "@/lib/api";
import { useMounted, useReducedMotion } from "@/lib/hooks";
import { AccordionList } from "./Info";

const List = ({ items, empty }: { items: string[]; empty: string }) =>
  !items.length ? <p>{empty}</p> : items.length === 1 ? <p>{items[0]}</p> : <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;

export default function Result({ data, photos, onReset, onPhoto }: { data: ApiResult; photos: Photo[]; onReset: () => void; onPhoto: (url: string) => void }) {
  const rm = useReducedMotion();
  const head = useRef<HTMLHeadingElement>(null);
  const ok = data.success;
  const p = ok ? data.prediction : {};
  const info = ok ? data.info : {};
  const conf = clamp(ok ? p.final_confidence : data.details?.final);
  const shown = useMounted(conf, 0);
  const rawName = p.disease_name || "Unknown";
  const outsideCoverage = /^(unknown|none)$/i.test(rawName);
  const normal = /^normal$/i.test(rawName);
  const low = !ok || conf < 80 || outsideCoverage;
  const name = rawName;
  const needsPromptCare = /cellulitis|shingles|larva/i.test(name);
  const seek = low || needsPromptCare;
  const refs = ok && Array.isArray(info.references)
    ? info.references.map((r: any) => String((r && r.reference) || r)).filter((r) => /^https?:\/\//i.test(r.trim())) : [];

  useEffect(() => {
    head.current?.focus({ preventScroll: true });
    // When embedded (the live preview on the landing page), scrollIntoView would also scroll the page around the iframe.
    if (window.top !== window) return;
    head.current?.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
  }, [rm]);

  const description = toList(info.description);
  const symptoms = toList(info.expected_symptoms);
  const remedies = toList(info.suggested_treatment);
  const items = ok ? [
    ...(description.length ? [{ id: "d", title: "About this estimate", body: <List items={description} empty="No description available." /> }] : []),
    ...(symptoms.length ? [{ id: "s", title: "Typical symptoms", body: <List items={symptoms} empty="No data." /> }] : []),
    ...(remedies.length ? [{ id: "r", title: "Suggested remedies", body: <List items={remedies} empty="Consult a dermatologist." /> }] : []),
    ...(refs.length ? [{ id: "x", title: "References", body: <ul>{refs.map((u) => <li key={u}><a href={u.trim()} target="_blank" rel="noopener noreferrer">{u.trim()}</a></li>)}</ul> }] : []),
  ] : [];

  return (
    <section className="card result-card">
      <div className="res-left">
        <h2 ref={head} tabIndex={-1} className={ok && !outsideCoverage ? "" : "warn-h"}>{ok ? "Visual estimate" : "We could not be sure"}</h2>
        <div className="res-head">
          <div className="ring" style={{ ["--p" as string]: shown, ["--ring" as string]: low ? "var(--warn)" : undefined }}>
            <div><NumberFlow value={Math.round(shown)} suffix="%" /></div>
          </div>
          <div>
            {ok && <div className="res-name">{outsideCoverage ? "No supported match" : name}</div>}
            <span className={clsx("badge", low && "warn")}>{outsideCoverage ? "Outside model coverage" : low ? "Low confidence" : "Higher confidence"}</span>
          </div>
        </div>
        {photos.length > 0 && (
          <>
            <p className="res-photos-label muted">Photos analyzed</p>
            <div className="res-photos">
              {photos.slice(0, 3).map((ph, i) => (
                <img key={ph.url} src={ph.url} alt="" draggable={false} tabIndex={0} role="button" aria-label={"View photo " + (i + 1) + " larger"}
                  onClick={() => onPhoto(ph.url)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPhoto(ph.url); } }} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="res-right">
        {!ok && <p className="muted">{data.message || "Confidence was too low for a reliable result."}</p>}
        <div className={clsx("next", seek && "urgent")}>
          <strong>{outsideCoverage || seek ? "Worth a professional look" : "What to do next"}</strong>
          <p>{!ok
            ? "Try clearer photos in good light, or consult a dermatologist for an assessment."
            : outsideCoverage
              ? "The image did not match a supported category. This does not rule out a health concern; contact a healthcare professional if the area worries you."
              : normal
                ? "The model did not identify one of its supported conditions. A normal result cannot rule out every concern, so seek professional advice if the area changes or worries you."
                : conf < 80
                  ? "The visual estimate has low confidence. Try a sharper photo in even light, and consult a healthcare professional if you remain concerned."
                  : needsPromptCare
              ? "This can look like other conditions and some need prescription care. Book a dermatologist visit, and sooner if it spreads, hurts more or comes with a fever."
              : "This is a visual estimate only; symptoms and body location are not analyzed. Contact a healthcare professional for diagnosis or treatment advice."}</p>
        </div>
        {ok && items.length > 0 && <AccordionList items={items} defaultOpen={items[0].id === "d" ? ["d"] : []} />}
        <div className="res-actions">
          <button className="btn" type="button" onClick={onReset}>{ok ? "Scan again" : "Edit details"}</button>
        </div>
      </div>
    </section>
  );
}
