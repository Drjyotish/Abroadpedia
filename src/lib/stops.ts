export type Stop = {
  code: string;
  country: string;
  city: string;
  pillar: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
};

/** The scroll journey: where the student starts, and where the dream can land. */
export const STOPS: Stop[] = [
  {
    code: "NP",
    country: "Nepal",
    city: "Kathmandu",
    pillar: "Start here",
    headline: "Your dream has a destination. Find yours.",
    body: "Every journey abroad starts at home. AbroadPedia helps students in Nepal and India discover, compare and decide — before paying anyone.",
    cta: { label: "Search the EduWiki", href: "#explore" },
  },
  {
    code: "IN",
    country: "India",
    city: "New Delhi",
    pillar: "EduWiki + Student Reality Check",
    headline: "Don't trust the hype. Check the facts.",
    body: "Source-backed profiles of consultancies and IELTS/PTE institutes, reviewed on six honest dimensions — not one easy-to-game star.",
    cta: { label: "See the Reality Check", href: "#reality-check" },
  },
  {
    code: "AE",
    country: "UAE",
    city: "Dubai",
    pillar: "Compare Lab",
    headline: "Compare before you commit.",
    body: "Put up to four options side by side: fees, refund policy, support and proof. Anything we can't confirm says “Not yet verified” — never a made-up value.",
    cta: { label: "Open Compare Lab", href: "#compare" },
  },
  {
    code: "AU",
    country: "Australia",
    city: "Sydney",
    pillar: "Opportunity Radar + Daily Abroad Brief",
    headline: "Never miss a deadline that matters.",
    body: "Scholarships, fellowships and exchanges with official links, plus a 2–4 line daily brief from primary sources only.",
    cta: { label: "Scan the Radar", href: "#opportunities" },
  },
  {
    code: "US",
    country: "USA",
    city: "New York",
    pillar: "My Abroad Journey",
    headline: "Make the dream feel close. Make the decision evidence-based.",
    body: "Save a shortlist, set your stage from Dreaming to Decision, and tick off milestones as you go. UK, Canada and more destinations are next.",
    cta: { label: "Start my journey", href: "#my-journey" },
  },
];
