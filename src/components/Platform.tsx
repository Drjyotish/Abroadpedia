"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BID_CATEGORIES,
  DESTINATIONS,
  DIMENSIONS,
  KIND_LABEL,
  LISTINGS,
  MILESTONES,
  MIN_RAISE,
  OPENING_BID,
  OPPORTUNITIES,
  STAGES,
  type Kind,
  type Listing,
} from "@/lib/data";

const NYV = "Not yet verified";
const MAX_COMPARE = 4;

type JourneyState = { stage: number; destination: string; done: number[]; saved: string[] };
type QueuedReview = { id: number; listing: string; scores: number[]; text: string };

const EMPTY_JOURNEY: JourneyState = { stage: 0, destination: DESTINATIONS[0], done: [], saved: [] };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state simply lives for this visit */
  }
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function SectionHead({ stop, title, lead, id }: { stop: string; title: string; lead: string; id: string }) {
  return (
    <header className="sec__head">
      <p className="sec__kicker">{stop}</p>
      <h2 id={`${id}-title`}>{title}</h2>
      <p className="sec__lead">{lead}</p>
    </header>
  );
}

function Bars({ scores }: { scores: number[] }) {
  return (
    <dl className="bars">
      {DIMENSIONS.map((d, i) => (
        <div className="bars__row" key={d.key}>
          <dt title={d.hint}>{d.label}</dt>
          <dd>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${(scores[i] / 5) * 100}%` }} />
            </span>
            <b>{scores[i].toFixed(1)}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function Platform() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [country, setCountry] = useState("All");
  const [compare, setCompare] = useState<string[]>([]);
  const [journey, setJourney] = useState<JourneyState>(EMPTY_JOURNEY);
  const [queue, setQueue] = useState<QueuedReview[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setJourney(load("ap-journey", EMPTY_JOURNEY));
    setQueue(load<{ items: QueuedReview[] }>("ap-review-queue", { items: [] }).items);
    setHydrated(true);
    const onSearch = (e: Event) => {
      setQuery((e as CustomEvent<string>).detail ?? "");
      setKind("all");
      setCountry("All");
    };
    window.addEventListener("ap:search", onSearch);
    return () => window.removeEventListener("ap:search", onSearch);
  }, []);

  useEffect(() => {
    if (hydrated) save("ap-journey", journey);
  }, [journey, hydrated]);
  useEffect(() => {
    if (hydrated) save("ap-review-queue", { items: queue });
  }, [queue, hydrated]);

  const toggleSaved = (id: string) =>
    setJourney((j) => ({ ...j, saved: j.saved.includes(id) ? j.saved.filter((x) => x !== id) : [...j.saved, id] }));
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPARE ? [...c, id] : c));

  // ------------------------------------------------------------ EduWiki ---
  const countries = useMemo(() => ["All", ...Array.from(new Set(LISTINGS.map((l) => l.country)))], []);
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return LISTINGS.filter((l) => {
      if (kind !== "all" && l.kind !== kind) return false;
      if (country !== "All" && l.country !== country) return false;
      const hay = `${l.name} ${KIND_LABEL[l.kind]} ${l.city} ${l.country} ${l.programs ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query, kind, country]);

  // ------------------------------------------------------ Reality Check ---
  const reviewable = LISTINGS.filter((l) => l.scores);
  const [focusId, setFocusId] = useState(reviewable[0].id);
  const focus = reviewable.find((l) => l.id === focusId) ?? reviewable[0];
  const [draft, setDraft] = useState<number[]>(DIMENSIONS.map(() => 3));
  const [text, setText] = useState("");
  const [formMsg, setFormMsg] = useState("");

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 30) {
      setFormMsg("Please describe your experience in at least 30 characters, so moderators have something to check.");
      return;
    }
    setQueue((q) => [{ id: Date.now(), listing: focus.name, scores: draft, text: text.trim() }, ...q].slice(0, 5));
    setText("");
    setDraft(DIMENSIONS.map(() => 3));
    setFormMsg("Thanks — your review is in the moderation queue. In this prototype it is stored only on this device.");
  };

  // ------------------------------------------------------------ Compare ---
  const compared = compare.map((id) => LISTINGS.find((l) => l.id === id)!).filter(Boolean);
  const mixedKinds = new Set(compared.map((l) => l.kind)).size > 1;
  const rows: { label: string; get: (l: Listing) => string }[] = [
    { label: "Type", get: (l) => KIND_LABEL[l.kind] },
    { label: "Location", get: (l) => `${l.city}, ${l.country}` },
    { label: "Programmes", get: (l) => l.programs ?? NYV },
    { label: "Format", get: (l) => l.format ?? NYV },
    { label: "Disclosed fee", get: (l) => l.fee ?? NYV },
    { label: "Refund policy", get: (l) => l.refund ?? NYV },
    { label: "Registration evidence", get: (l) => l.registration ?? NYV },
    {
      label: "Review average",
      get: (l) => (l.scores ? `${avg(l.scores).toFixed(1)} / 5 from ${l.reviews} demo reviews` : "No qualified reviews yet"),
    },
    { label: "Review response rate", get: (l) => l.responseRate ?? "—" },
    { label: "Source", get: (l) => (l.demo ? "Demo profile — not a real provider" : "Official website linked") },
  ];

  // -------------------------------------------------------------- Radar ---
  const oppDestinations = useMemo(() => ["All", ...Array.from(new Set(OPPORTUNITIES.map((o) => o.destination)))], []);
  const [oppDest, setOppDest] = useState("All");
  const opps = OPPORTUNITIES.filter((o) => oppDest === "All" || o.destination === oppDest);

  // ---------------------------------------------------------- Bid Arena ---
  const [bidCat, setBidCat] = useState(BID_CATEGORIES[0].id);
  const [bids, setBids] = useState(() => Object.fromEntries(BID_CATEGORIES.map((c) => [c.id, c.bids])));
  const [raise, setRaise] = useState(MIN_RAISE);
  const board = [...bids[bidCat]].sort((a, b) => b.amount - a.amount);
  const raiseBid = (id: string) => {
    const step = Math.max(MIN_RAISE, Math.round(raise / 100) * 100 || MIN_RAISE);
    setBids((all) => ({ ...all, [bidCat]: all[bidCat].map((b) => (b.id === id ? { ...b, amount: b.amount + step } : b)) }));
  };

  // ------------------------------------------------------------ Journey ---
  const savedItems = journey.saved
    .map((id) => {
      const l = LISTINGS.find((x) => x.id === id);
      if (l) return { id, title: l.name, meta: `${KIND_LABEL[l.kind]} · ${l.city}` };
      const o = OPPORTUNITIES.find((x) => x.id === id);
      if (o) return { id, title: o.title, meta: `${o.category} · ${o.destination}` };
      return null;
    })
    .filter((x): x is { id: string; title: string; meta: string } => x !== null);

  return (
    <div className="platform">
      {/* ---------------------------------------------------------------- EduWiki */}
      <section className="sec" id="explore" aria-labelledby="explore-title">
        <SectionHead
          id="explore"
          stop="Stop 01 · Kathmandu → everywhere"
          title="EduWiki: search before you pay"
          lead="A moderated, source-backed directory of consultancies, IELTS/PTE institutes, universities and courses. Missing information says “Not yet verified” — never a made-up value."
        />
        <div className="filters">
          <label className="field field--search">
            <span className="sr-only">Search the EduWiki</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, test or country"
            />
          </label>
          <div className="chips" role="group" aria-label="Filter by type">
            {(["all", "consultancy", "coaching", "university", "course"] as const).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === "all" ? "All types" : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Filter by country">
            {countries.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={country === c} onClick={() => setCountry(c)}>
                {c === "All" ? "All countries" : c}
              </button>
            ))}
          </div>
        </div>
        <p className="count" aria-live="polite">
          {results.length} {results.length === 1 ? "listing" : "listings"}
          {compare.length > 0 && (
            <>
              {" · "}
              <a href="#compare">
                {compare.length} in Compare Lab
              </a>
            </>
          )}
        </p>
        {results.length === 0 ? (
          <p className="empty">
            Nothing matches that search yet. This prototype holds a small sample — a verified, useful small directory beats a large one full
            of invented profiles.
          </p>
        ) : (
          <ul className="cards">
            {results.map((l) => (
              <li key={l.id} className="card">
                <div className="card__top">
                  <span className={`badge ${l.demo ? "badge--demo" : "badge--source"}`}>{l.demo ? "Demo profile" : "Official site linked"}</span>
                  <span className="card__kind">{KIND_LABEL[l.kind]}</span>
                </div>
                <h3>{l.name}</h3>
                <p className="card__place">
                  {l.city} · {l.country}
                </p>
                <dl className="facts">
                  <div>
                    <dt>Programmes</dt>
                    <dd className={l.programs ? "" : "nyv"}>{l.programs ?? NYV}</dd>
                  </div>
                  <div>
                    <dt>Disclosed fee</dt>
                    <dd className={l.fee && l.fee !== NYV ? "" : "nyv"}>{l.fee ?? NYV}</dd>
                  </div>
                  <div>
                    <dt>Reviews</dt>
                    <dd className={l.scores ? "" : "nyv"}>
                      {l.scores ? `${avg(l.scores).toFixed(1)} / 5 · ${l.reviews} demo reviews` : "No qualified reviews yet"}
                    </dd>
                  </div>
                </dl>
                <div className="card__actions">
                  <button
                    type="button"
                    className="btn btn--small"
                    aria-pressed={compare.includes(l.id)}
                    disabled={!compare.includes(l.id) && compare.length >= MAX_COMPARE}
                    onClick={() => toggleCompare(l.id)}
                  >
                    {compare.includes(l.id) ? "In compare ✓" : "Compare"}
                  </button>
                  <button type="button" className="btn btn--small btn--ghost" aria-pressed={journey.saved.includes(l.id)} onClick={() => toggleSaved(l.id)}>
                    {journey.saved.includes(l.id) ? "Saved ✓" : "Save"}
                  </button>
                  {l.website && (
                    <a className="link" href={l.website} target="_blank" rel="noopener noreferrer">
                      Official site ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------------- Reality Check */}
      <section className="sec sec--tint" id="reality-check" aria-labelledby="reality-check-title">
        <SectionHead
          id="reality-check"
          stop="Stop 02 · New Delhi"
          title="Student Reality Check"
          lead="One star rating is easy to game. Here every provider is scored on six separate dimensions, and trust, popularity and money are never blended into one number."
        />
        <div className="split">
          <div className="pane">
            <label className="field">
              <span>Provider (demo profiles)</span>
              <select value={focus.id} onChange={(e) => setFocusId(e.target.value)}>
                {reviewable.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.city}
                  </option>
                ))}
              </select>
            </label>
            <Bars scores={focus.scores!} />
            <ul className="stats">
              <li>
                <b>{focus.reviews}</b> demo reviews
              </li>
              <li>
                <b>{focus.responseRate}</b> replies to reviews
              </li>
              <li>
                <b>{focus.registration ? "On file" : "Not yet verified"}</b> registration evidence
              </li>
            </ul>
            <p className="note">
              Review states: <span className="badge">Self-reported</span> <span className="badge">Account verified</span>{" "}
              <span className="badge badge--verified">Evidence-verified</span>. Invoices and admission records stay private; only the
              verification state is shown.
            </p>
          </div>

          <form className="pane" onSubmit={submitReview} aria-label="Write a review">
            <h3>Share your experience</h3>
            <p className="note">Reviewing: <b>{focus.name}</b> (demo). Reviews go to moderators before anything is published.</p>
            {DIMENSIONS.map((d, i) => (
              <label className="slider" key={d.key}>
                <span>
                  {d.label} <b>{draft[i]}</b>
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={draft[i]}
                  onChange={(e) => setDraft((s) => s.map((v, j) => (j === i ? Number(e.target.value) : v)))}
                />
              </label>
            ))}
            <label className="field">
              <span>What happened, in your words</span>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Stick to your own first-hand experience. No names of staff, no personal details."
              />
            </label>
            <button type="submit" className="btn">
              Send to moderation
            </button>
            <p className="form-msg" role="status">
              {formMsg}
            </p>
            {queue.length > 0 && (
              <ul className="queue" aria-label="Your reviews awaiting moderation">
                {queue.map((r) => (
                  <li key={r.id}>
                    <span className="badge badge--pending">Pending moderation</span>
                    <b>{r.listing}</b> · {avg(r.scores).toFixed(1)} / 5
                    <button type="button" className="link" onClick={() => setQueue((q) => q.filter((x) => x.id !== r.id))}>
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------------ Compare Lab */}
      <section className="sec" id="compare" aria-labelledby="compare-title">
        <SectionHead
          id="compare"
          stop="Stop 03 · Dubai"
          title="Compare Lab"
          lead="Put up to four options side by side. Unknown values stay visible as unknown, so a blank never looks like a yes."
        />
        {compared.length === 0 ? (
          <div className="empty">
            <p>No options selected yet.</p>
            <div className="empty__actions">
              <button type="button" className="btn" onClick={() => setCompare(["demo-consultancy-a", "demo-consultancy-b", "demo-coaching-a"])}>
                Load a sample comparison
              </button>
              <a className="link" href="#explore">
                or pick from the EduWiki
              </a>
            </div>
          </div>
        ) : (
          <>
            {mixedKinds && (
              <p className="callout">
                You are comparing different kinds of organisation (for example a university and a consultancy). Rows that do not apply to
                one of them will look empty — that is expected.
              </p>
            )}
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Comparison table">
              <table className="compare">
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Attribute</span>
                    </th>
                    {compared.map((l) => (
                      <th scope="col" key={l.id}>
                        {l.name}
                        <button type="button" className="link" onClick={() => toggleCompare(l.id)} aria-label={`Remove ${l.name} from comparison`}>
                          Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      {compared.map((l) => {
                        const v = r.get(l);
                        return (
                          <td key={l.id} className={v === NYV || v.startsWith("No qualified") ? "nyv" : ""}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="link" onClick={() => setCompare([])}>
              Clear comparison
            </button>
          </>
        )}
      </section>

      {/* ------------------------------------------------------ Opportunity Radar */}
      <section className="sec sec--tint" id="opportunities" aria-labelledby="opportunities-title">
        <SectionHead
          id="opportunities"
          stop="Stop 04 · Sydney"
          title="Opportunity Radar"
          lead="Real scholarship and fellowship programmes, each linked to its official page. Deadlines and eligibility change every cycle, so we point you to the source instead of guessing."
        />
        <div className="chips" role="group" aria-label="Filter opportunities by destination">
          {oppDestinations.map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={oppDest === d} onClick={() => setOppDest(d)}>
              {d === "All" ? "All destinations" : d}
            </button>
          ))}
        </div>
        <ul className="cards cards--opps">
          {opps.map((o) => (
            <li key={o.id} className="card">
              <div className="card__top">
                <span className="badge badge--source">Official source linked</span>
                <span className="card__kind">
                  {o.category} · {o.destination}
                </span>
              </div>
              <h3>{o.title}</h3>
              <p className="card__place">{o.organizer}</p>
              <dl className="facts">
                <div>
                  <dt>Deadline</dt>
                  <dd className="nyv">Not yet verified — check the official page</dd>
                </div>
                <div>
                  <dt>Eligibility for India / Nepal</dt>
                  <dd className="nyv">Varies by cycle — confirm at the source</dd>
                </div>
              </dl>
              <div className="card__actions">
                <a className="btn btn--small" href={o.url} target="_blank" rel="noopener noreferrer">
                  Official page ↗
                </a>
                <button type="button" className="btn btn--small btn--ghost" aria-pressed={journey.saved.includes(o.id)} onClick={() => toggleSaved(o.id)}>
                  {journey.saved.includes(o.id) ? "Saved ✓" : "Save"}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="brief" id="daily-brief">
          <div className="brief__head">
            <h3>Daily Abroad Brief</h3>
            <p>2–4 lines a day, from visa authorities, universities and testing bodies — approved by an editor before it is published.</p>
          </div>
          <div className="brief__grid">
            <article className="brief__card brief__card--empty">
              <p className="brief__date">Today</p>
              <h4>No verified updates today</h4>
              <p>
                The editorial pipeline is not live in this prototype, and we will not pretend there is breaking news. When nothing is
                verified, this is exactly what you will see.
              </p>
            </article>
            <article className="brief__card" aria-label="Example of the brief card format">
              <p className="brief__date">
                <span className="badge badge--demo">Format preview</span> Country · Category
              </p>
              <h4>A specific claim, not clickbait</h4>
              <p>Two to four plain lines summarising only what the cited source says.</p>
              <ul className="brief__meta">
                <li>
                  <b>Why it matters</b> One sentence for the student it affects.
                </li>
                <li>
                  <b>Next step</b> Check the official rule, application or deadline.
                </li>
                <li>
                  <b>Source</b> Official title and direct link · published and last-checked dates.
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Bid Arena */}
      <section className="sec sec--sponsored" id="bid-arena" aria-labelledby="bid-arena-title">
        <div className="sponsored-flag">Sponsored · Ranked by bid · Demo</div>
        <SectionHead
          id="bid-arena"
          stop="Advertising, clearly labelled"
          title="Bid Arena"
          lead="Approved providers can bid for a higher spot in this sponsored section only. A bid never changes reviews, verification or organic search order."
        />
        <div className="arena">
          <div className="arena__controls">
            <label className="field">
              <span>Category</span>
              <select value={bidCat} onChange={(e) => setBidCat(e.target.value)}>
                {BID_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Raise amount (min {inr(MIN_RAISE)})</span>
              <input type="number" min={MIN_RAISE} step={100} value={raise} onChange={(e) => setRaise(Number(e.target.value))} />
            </label>
            <p className="note">
              Opening bid {inr(OPENING_BID)} · minimum raise {inr(MIN_RAISE)}. These are test hypotheses, not market prices.
            </p>
          </div>
          <ol className="board" aria-live="polite">
            {board.map((b, i) => (
              <li key={b.id}>
                <span className="board__rank">{i + 1}</span>
                <span className="board__name">
                  {b.name}
                  <small>Sponsored · demo bidder</small>
                </span>
                <span className="board__amt">{inr(b.amount)}</span>
                <button type="button" className="btn btn--small" onClick={() => raiseBid(b.id)}>
                  Raise bid
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="note">
          Simulation only: no payments are processed. Real checkout stays disabled until server-verified payment webhooks, concurrent bidding
          and refunds have been tested.
        </p>
      </section>

      {/* ------------------------------------------------------------- My Journey */}
      <section className="sec" id="my-journey" aria-labelledby="my-journey-title">
        <SectionHead
          id="my-journey"
          stop="Stop 05 · New York"
          title="My Abroad Journey"
          lead="Your shortlist, your stage, your next step. Saved on this device only in this prototype — nothing is sent anywhere."
        />
        <div className="stages" role="group" aria-label="Where are you in your journey?">
          {STAGES.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`stage-btn${i <= journey.stage ? " is-reached" : ""}`}
              aria-pressed={journey.stage === i}
              onClick={() => setJourney((j) => ({ ...j, stage: i }))}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s}
            </button>
          ))}
        </div>
        <div className="split">
          <div className="pane">
            <label className="field">
              <span>Target destination</span>
              <select value={journey.destination} onChange={(e) => setJourney((j) => ({ ...j, destination: e.target.value }))}>
                {DESTINATIONS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <h3>
              Milestones <small>{journey.done.length} of {MILESTONES.length} done</small>
            </h3>
            <ul className="checks">
              {MILESTONES.map((m, i) => (
                <li key={m}>
                  <label>
                    <input
                      type="checkbox"
                      checked={journey.done.includes(i)}
                      onChange={() =>
                        setJourney((j) => ({ ...j, done: j.done.includes(i) ? j.done.filter((x) => x !== i) : [...j.done, i] }))
                      }
                    />
                    <span>{m}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="pane">
            <h3>
              Shortlist <small>{savedItems.length} saved</small>
            </h3>
            {savedItems.length === 0 ? (
              <p className="note">
                Nothing saved yet. Use <b>Save</b> on any <a href="#explore">EduWiki listing</a> or <a href="#opportunities">opportunity</a>.
              </p>
            ) : (
              <ul className="saved">
                {savedItems.map((s) => (
                  <li key={s.id}>
                    <span>
                      <b>{s.title}</b>
                      <small>{s.meta}</small>
                    </span>
                    <button type="button" className="link" onClick={() => toggleSaved(s.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
