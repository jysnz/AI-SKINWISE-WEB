"use client";
import { useEffect, useRef } from "react";

/**
 * Splash shown before the first page appears. Scan brackets draw in and close around the logo, a scan
 * line sweeps down it and brings it into focus, the wordmark rises letter by letter, then the white
 * curtain lifts while the page content rises underneath it.
 *
 * The overlay and its animation are CSS (see "Intro" in globals.css) and part of the server HTML, so it
 * covers the page from the first paint with no flash. This component only decides when the exit starts
 * (after hydration, and once the sequence has had MIN_SHOWN ms from navigation start), flies the logo into
 * the header (FLIP with the Web Animations API) while the white fades out, and then announces
 * it: html[data-reveal="1"] plus a "sw:reveal" event, which the landing hero waits for (see useReveal).
 * A 6s CSS delay lifts the curtain anyway if JS never runs.
 *
 * It plays on every full page load (including reloads) and is skipped (html[data-intro="off"], set by the
 * inline script in layout.tsx) only inside an iframe (the live previews, the video renderer) and with
 * ?still or ?nointro. With reduced motion it shows a brief fade. Click or any key skips it early.
 */
const MIN_SHOWN = 2000; // ms from navigation start: the wordmark has landed and held for a beat
const MIN_SHOWN_REDUCED = 900;
const FLY_MS = 800; // logo flight into the header
const WORD = "AI-SKINWISE";

// Corner bracket, drawn with pathLength=1 so one dash value fits every path.
const CORNER = "M3 38V17a14 14 0 0 1 14-14h21";

export default function Intro() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = document.documentElement;
    if (d.dataset.intro === "off") return;
    let revealed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      d.dataset.reveal = "1";
      window.dispatchEvent(new Event("sw:reveal"));
    };
    const gone = () => { delete d.dataset.fly; d.dataset.intro = "off"; };
    // Reduced motion gets a short fade (see the media query in globals.css) instead of the full sequence.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Exit: the logo flies into the header's logo spot while the white fades out and the page rises.
    // Falls back to a plain curtain wipe when there is no header logo to land on.
    const lift = () => {
      const el = root.current;
      const logo = el?.querySelector<HTMLElement>(".intro-logo");
      const target = document.querySelector<HTMLElement>(".topbar .brand img");
      const from = logo?.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      if (!el || still || !logo || !from || !to || !to.width || to.bottom < 0 || to.top > innerHeight) {
        el?.classList.add("out");
        later(reveal, 180);
        later(gone, 1000);
        return;
      }
      const a = from.width / logo.offsetWidth; // scale inherited from the mark (0.9 on small screens)
      const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / a;
      const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / a;
      d.dataset.fly = "1"; // hides the header logo until the intro logo lands on it
      el.classList.add("fly");
      logo.animate(
        [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})` }],
        { duration: FLY_MS, easing: "cubic-bezier(.76, 0, .24, 1)", fill: "forwards" },
      );
      later(reveal, 260);
      later(() => { delete d.dataset.fly; }, FLY_MS); // header logo appears exactly where the intro logo ends
      later(gone, FLY_MS + 80);
    };

    // Count from navigation start, not from hydration, so a slow load never makes the intro longer.
    const wait = Math.max(0, (still ? MIN_SHOWN_REDUCED : MIN_SHOWN) - performance.now());
    later(lift, wait);
    const skip = () => {
      timers.forEach(clearTimeout);
      delete d.dataset.fly;
      root.current?.classList.remove("fly");
      root.current?.classList.add("skip");
      reveal();
      setTimeout(gone, 420);
    };
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    return () => { timers.forEach(clearTimeout); window.removeEventListener("pointerdown", skip); window.removeEventListener("keydown", skip); };
  }, []);

  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-core">
        <div className="intro-mark">
          <svg className="intro-brackets" viewBox="0 0 120 120" fill="none">
            {[0, 90, 180, 270].map((deg, i) => (
              <path key={deg} d={CORNER} pathLength={1} transform={`rotate(${deg} 60 60)`} style={{ animationDelay: `${0.08 + i * 0.07}s` }} />
            ))}
          </svg>
          <div className="intro-logo">
            <img className="intro-logo-base" src="/assets/app_logo.png" alt="" width={72} height={72} />
            <img className="intro-logo-lit" src="/assets/app_logo.png" alt="" width={72} height={72} />
            <i className="intro-scan" />
          </div>
        </div>
        <p className="intro-word">
          {WORD.split("").map((ch, i) => (
            <span key={i} style={{ ["--i" as string]: i }}>{ch === " " ? " " : ch}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
