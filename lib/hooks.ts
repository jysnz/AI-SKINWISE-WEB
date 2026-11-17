"use client";
import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    setRm(m.matches || new URLSearchParams(location.search).has("still"));
    const f = () => setRm(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return rm;
}

/** Returns 0 on first render and the target after mount, so NumberFlow and CSS transitions animate in. */
export function useMounted<T>(target: T, zero: T): T {
  const [v, setV] = useState(zero);
  useEffect(() => { const id = requestAnimationFrame(() => setV(target)); return () => cancelAnimationFrame(id); }, [target]);
  return v;
}

/** Highlights the nav link of the section nearest the top of the viewport. */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((i) => document.getElementById(i)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
    }, { rootMargin: "-30% 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

/** True once the intro curtain has started lifting (or straight away when there is no intro). Gates the hero entrance. */
export function useReveal() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const d = document.documentElement;
    if (d.dataset.intro === "off" || d.dataset.reveal === "1") { setOn(true); return; }
    const f = () => setOn(true);
    window.addEventListener("sw:reveal", f, { once: true });
    return () => window.removeEventListener("sw:reveal", f);
  }, []);
  return on;
}
