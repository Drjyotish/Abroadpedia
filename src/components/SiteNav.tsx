"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#explore", label: "Explore" },
  { href: "#reality-check", label: "Reviews" },
  { href: "#opportunities", label: "Opportunities" },
  { href: "#daily-brief", label: "Daily Brief" },
];

export default function SiteNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const explore = document.getElementById("explore");
      if (!explore) return;
      setSolid(explore.getBoundingClientRect().top < 72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className={`nav${solid ? " nav--solid" : ""}`}>
      <a className="nav__brand" href="#top" aria-label="AbroadPedia home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 11.2 21.5 3l-5.6 18-4.1-7.3-9.3-2.5Zm9.3 2.5L21.5 3" />
        </svg>
        AbroadPedia
      </a>
      <nav aria-label="Primary">
        <ul className="nav__links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="nav__cta" href="#my-journey">
        My Journey
      </a>
    </header>
  );
}
