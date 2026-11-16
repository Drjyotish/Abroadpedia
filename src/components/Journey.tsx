"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STOPS } from "@/lib/stops";
import type { World } from "@/lib/world";

type Phase = "loading" | "ready" | "started";

const SEGMENTS = STOPS.length - 1;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Journey() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(0);
  const [atStop, setAtStop] = useState(true);
  const [webgl, setWebgl] = useState(true);
  const [query, setQuery] = useState("");

  // Build the 3D world, then count the loader up to 100.
  useEffect(() => {
    let cancelled = false;
    let world: World | null = null;
    let raf = 0;

    const finishLoader = () => {
      let skip = false;
      try {
        skip = sessionStorage.getItem("ap-started") === "1";
      } catch {
        /* storage unavailable */
      }
      if (skip || prefersReducedMotion()) {
        setCount(100);
        setPhase(skip ? "started" : "ready");
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - t0) / 1500);
        setCount(Math.round((1 - Math.pow(1 - t, 3)) * 100));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setPhase("ready");
      };
      raf = requestAnimationFrame(tick);
    };

    import("@/lib/world")
      .then(({ createWorld }) => {
        if (cancelled || !canvasRef.current) return;
        try {
          world = createWorld(canvasRef.current, { reducedMotion: prefersReducedMotion() });
          worldRef.current = world;
          world.start();
        } catch {
          setWebgl(false);
        }
        finishLoader();
      })
      .catch(() => {
        setWebgl(false);
        finishLoader();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      world?.dispose();
      worldRef.current = null;
    };
  }, []);

  // Lock scrolling until the visitor starts the journey.
  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", phase !== "started");
    return () => document.documentElement.classList.remove("is-locked");
  }, [phase]);

  // Scroll drives the flight.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const progress = () => {
      const span = section.offsetHeight - stage.offsetHeight;
      if (span <= 0) return 0;
      return Math.min(1, Math.max(0, (window.scrollY - section.offsetTop) / span));
    };

    const onScroll = () => {
      const p = progress();
      worldRef.current?.setProgress(p);
      stage.style.setProperty("--p", p.toFixed(4));
      const f = p * SEGMENTS;
      const nearest = Math.round(f);
      setActive(nearest);
      setAtStop(Math.abs(f - nearest) < 0.3);
    };
    const onResize = () => {
      worldRef.current?.resize();
      onScroll();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      worldRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) worldRef.current?.start();
      else worldRef.current?.stop();
    });
    io.observe(section);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [phase]);

  const begin = useCallback(() => {
    try {
      sessionStorage.setItem("ap-started", "1");
    } catch {
      /* storage unavailable */
    }
    setPhase("started");
  }, []);

  const flyTo = useCallback((index: number) => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const span = section.offsetHeight - stage.offsetHeight;
    window.scrollTo({
      top: section.offsetTop + (index / SEGMENTS) * span,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("ap:search", { detail: query.trim() }));
    document.getElementById("explore")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <section ref={sectionRef} className="journey" aria-label="The AbroadPedia journey, from Nepal to the USA">
      <div ref={stageRef} className={`stage${webgl ? "" : " stage--flat"}`} data-stop={active}>
        <canvas ref={canvasRef} className="stage__canvas" aria-hidden="true" />
        <div className="stage__scrim" aria-hidden="true" />

        {STOPS.map((stop, i) => {
          const shown = phase === "started" && atStop && active === i;
          return (
            <article key={stop.code} className={`panel${shown ? " is-shown" : ""}`} aria-hidden={!shown} inert={!shown}>
              <p className="panel__kicker">
                <span className="chip chip--code">{stop.code}</span>
                Stop {String(i + 1).padStart(2, "0")} · {stop.city}, {stop.country}
              </p>
              {i === 0 ? <h1 className="panel__title">{stop.headline}</h1> : <h2 className="panel__title">{stop.headline}</h2>}
              <p className="panel__body">{stop.body}</p>
              {i === 0 ? (
                <form className="search" role="search" onSubmit={submitSearch}>
                  <label className="sr-only" htmlFor="hero-search">
                    Search institutes, consultancies, universities and scholarships
                  </label>
                  <input
                    id="hero-search"
                    type="search"
                    placeholder="Try “IELTS Delhi” or “Sydney”"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                  <button type="submit">Search</button>
                </form>
              ) : (
                <a className="btn btn--light" href={stop.cta.href}>
                  {stop.cta.label}
                  <span aria-hidden="true"> →</span>
                </a>
              )}
              <p className="panel__pillar">{stop.pillar}</p>
            </article>
          );
        })}

        <nav className="rail" aria-label="Journey stops">
          <div className="rail__track" aria-hidden="true">
            <div className="rail__fill" />
          </div>
          <ol>
            {STOPS.map((stop, i) => (
              <li key={stop.code}>
                <button
                  type="button"
                  className={`rail__stop${active === i ? " is-active" : ""}${i < active ? " is-past" : ""}`}
                  onClick={() => flyTo(i)}
                  aria-current={active === i ? "step" : undefined}
                >
                  <span className="rail__dot" aria-hidden="true" />
                  <span className="rail__code">{stop.code}</span>
                  <span className="rail__name">{stop.country}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p className={`scroll-hint${phase === "started" && active === 0 && atStop ? " is-shown" : ""}`} aria-hidden="true">
          <span>Scroll to take off</span>
          <i />
        </p>
        <a className="skip-journey" href="#explore">
          Skip the flight
        </a>
      </div>

      {phase !== "started" && (
        <div className="loader" role="dialog" aria-modal="true" aria-label="Welcome to AbroadPedia">
          <div className="loader__inner">
            <p className="loader__brand">AbroadPedia</p>
            <p className="loader__count" aria-hidden="true">
              {String(count).padStart(3, "0")}
            </p>
            <svg className="loader__skyline" viewBox="0 0 520 90" role="img" aria-label="Skyline from the Himalayas to New York">
              <path d="M0 90 L40 34 L58 56 L84 18 L118 62 L132 90Z" />
              <path d="M150 90v-22h8v-8h-4l14-12 14 12h-4v8h8v22z" />
              <path d="M214 90V62h10c0-16 8-22 14-26 6 4 14 10 14 26h10v28zM206 90V48h4v42zM266 90V48h4v42z" />
              <path d="M304 90l5-78 5 78zM322 90V56h12v34zM338 90V44l10-8v54z" />
              <path d="M368 90c2-18 10-30 22-34-2 14-2 24 0 34zM392 90c2-22 12-36 26-40-3 16-3 28 0 40zM424 90c1-12 6-20 14-24-2 10-2 16 0 24z" />
              <path d="M456 90V52h10V36h4l2-22 2 22h4v16h10v38zM494 90V60h8V48h10v42z" />
            </svg>
            <p className="loader__tag">Dream destinations. Grounded decisions.</p>
            <button type="button" className="btn btn--start" onClick={begin} disabled={phase !== "ready"} autoFocus>
              {phase === "ready" ? "Begin the journey" : "Preparing the route…"}
            </button>
            <p className="loader__note">Nepal → India → Dubai → Australia → USA · scroll to fly</p>
          </div>
        </div>
      )}
    </section>
  );
}
