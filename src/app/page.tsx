import Journey from "@/components/Journey";
import Platform from "@/components/Platform";
import SiteNav from "@/components/SiteNav";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Journey />
        <Platform />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <div>
            <p className="footer__brand">AbroadPedia</p>
            <p className="footer__mantra">Make the dream feel close. Make the decision evidence-based.</p>
          </div>
          <ul className="footer__rules">
            <li>We never sell organic ranking.</li>
            <li>We never fabricate reviews or guarantee visas or admission.</li>
            <li>Sponsored placements are always labelled.</li>
          </ul>
          <p className="footer__fine">
            Prototype. Provider profiles marked “Demo” are placeholders, not real businesses. Universities and scholarship programmes link to
            their official websites; confirm every fee, deadline and rule at the source.
          </p>
        </div>
      </footer>
    </>
  );
}
