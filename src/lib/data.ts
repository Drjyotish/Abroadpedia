/**
 * Prototype data.
 *
 * AbroadPedia's rule: every visible provider or opportunity has a real source
 * or a clear Demo label. Providers below are DEMO placeholders (not real
 * businesses). Universities and scholarship programmes are real, link to their
 * official sites, and show "Not yet verified" for anything we have not checked.
 */

export const DIMENSIONS = [
  { key: "honesty", label: "Honesty & transparency", hint: "Fees, representation, claims and communication" },
  { key: "promises", label: "Promises vs. reality", hint: "Did the service match what was offered?" },
  { key: "quality", label: "Teaching / service quality", hint: "Content, faculty, guidance or consulting work" },
  { key: "support", label: "Support & responsiveness", hint: "Communication and follow-through" },
  { key: "doubts", label: "Doubt resolution", hint: "Answers, mentoring and problem solving" },
  { key: "value", label: "Value for money", hint: "Experience compared with the disclosed cost" },
] as const;

export type Kind = "consultancy" | "coaching" | "university" | "course";

export const KIND_LABEL: Record<Kind, string> = {
  consultancy: "Consultancy",
  coaching: "IELTS / PTE coaching",
  university: "University",
  course: "Bootcamp / course",
};

export type Listing = {
  id: string;
  name: string;
  kind: Kind;
  city: string;
  country: string;
  demo: boolean;
  website?: string;
  programs?: string;
  format?: string;
  fee?: string;
  refund?: string;
  registration?: string;
  scores?: number[]; // six dimensions, demo only
  reviews?: number;
  responseRate?: string;
};

export const LISTINGS: Listing[] = [
  {
    id: "demo-consultancy-a",
    name: "Sample Consultancy A",
    kind: "consultancy",
    city: "Delhi NCR",
    country: "India",
    demo: true,
    programs: "Australia, UK, Canada admissions",
    format: "In person + online",
    fee: "₹25,000 service fee (demo)",
    refund: "Partial refund before application (demo)",
    registration: "Evidence on file (demo)",
    scores: [4.4, 4.1, 4.2, 3.8, 4.0, 3.9],
    reviews: 18,
    responseRate: "92%",
  },
  {
    id: "demo-consultancy-b",
    name: "Sample Consultancy B",
    kind: "consultancy",
    city: "Kathmandu",
    country: "Nepal",
    demo: true,
    programs: "Australia, USA, Japan admissions",
    format: "In person",
    fee: "Not yet verified",
    refund: "Not yet verified",
    scores: [3.2, 2.9, 3.6, 3.1, 3.3, 3.0],
    reviews: 11,
    responseRate: "40%",
  },
  {
    id: "demo-coaching-a",
    name: "Sample IELTS Institute A",
    kind: "coaching",
    city: "Delhi NCR",
    country: "India",
    demo: true,
    programs: "IELTS Academic, IELTS General",
    format: "Classroom, 6 weeks",
    fee: "₹12,000 per batch (demo)",
    refund: "No refund after week 1 (demo)",
    registration: "Evidence on file (demo)",
    scores: [4.6, 4.3, 4.5, 4.4, 4.6, 4.2],
    reviews: 27,
    responseRate: "88%",
  },
  {
    id: "demo-coaching-b",
    name: "Sample PTE Institute B",
    kind: "coaching",
    city: "Kathmandu",
    country: "Nepal",
    demo: true,
    programs: "PTE Academic",
    format: "Online, 4 weeks",
    fee: "NPR 9,000 per batch (demo)",
    refund: "Not yet verified",
    scores: [3.9, 3.7, 4.0, 3.5, 3.8, 4.1],
    reviews: 9,
    responseRate: "67%",
  },
  {
    id: "demo-bootcamp-a",
    name: "Sample SOP & Visa Bootcamp",
    kind: "course",
    city: "Online",
    country: "India",
    demo: true,
    programs: "SOP writing, visa interview practice",
    format: "Online cohort, 2 weeks",
    fee: "₹4,999 (demo)",
    refund: "Full refund before day 3 (demo)",
    scores: [4.2, 4.0, 4.3, 4.1, 4.4, 4.5],
    reviews: 14,
    responseRate: "95%",
  },
  {
    id: "uni-sydney",
    name: "The University of Sydney",
    kind: "university",
    city: "Sydney",
    country: "Australia",
    demo: false,
    website: "https://www.sydney.edu.au/",
  },
  {
    id: "uni-nyu",
    name: "New York University",
    kind: "university",
    city: "New York",
    country: "USA",
    demo: false,
    website: "https://www.nyu.edu/",
  },
  {
    id: "uni-uowd",
    name: "University of Wollongong in Dubai",
    kind: "university",
    city: "Dubai",
    country: "UAE",
    demo: false,
    website: "https://www.uowdubai.ac.ae/",
  },
  {
    id: "uni-du",
    name: "University of Delhi",
    kind: "university",
    city: "New Delhi",
    country: "India",
    demo: false,
    website: "https://www.du.ac.in/",
  },
  {
    id: "uni-tu",
    name: "Tribhuvan University",
    kind: "university",
    city: "Kathmandu",
    country: "Nepal",
    demo: false,
    website: "https://tu.edu.np/",
  },
];

export type Opportunity = {
  id: string;
  title: string;
  organizer: string;
  destination: string;
  category: string;
  url: string;
};

/** Real programmes with official links. Deadlines and eligibility change — always confirm at the source. */
export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "chevening",
    title: "Chevening Scholarships",
    organizer: "UK Government (FCDO)",
    destination: "UK",
    category: "Scholarship",
    url: "https://www.chevening.org/",
  },
  {
    id: "commonwealth",
    title: "Commonwealth Scholarships",
    organizer: "Commonwealth Scholarship Commission in the UK",
    destination: "UK",
    category: "Scholarship",
    url: "https://cscuk.fcdo.gov.uk/",
  },
  {
    id: "australia-awards",
    title: "Australia Awards",
    organizer: "Australian Government (DFAT)",
    destination: "Australia",
    category: "Scholarship",
    url: "https://www.dfat.gov.au/people-to-people/australia-awards",
  },
  {
    id: "fulbright-nehru",
    title: "Fulbright-Nehru Fellowships",
    organizer: "United States–India Educational Foundation (USIEF)",
    destination: "USA",
    category: "Fellowship",
    url: "https://www.usief.org.in/",
  },
  {
    id: "fulbright-nepal",
    title: "Fulbright programmes for Nepal",
    organizer: "The Fulbright Commission in Nepal (USEF–Nepal)",
    destination: "USA",
    category: "Fellowship",
    url: "https://usefnepal.org/",
  },
  {
    id: "daad",
    title: "DAAD scholarships",
    organizer: "German Academic Exchange Service (DAAD)",
    destination: "Germany",
    category: "Scholarship",
    url: "https://www.daad.de/en/",
  },
  {
    id: "erasmus-mundus",
    title: "Erasmus Mundus Joint Masters",
    organizer: "European Union (Erasmus+)",
    destination: "Europe",
    category: "Funded degree",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters",
  },
];

export const STAGES = ["Dreaming", "Researching", "Shortlisting", "Applying", "Decision"] as const;

export const MILESTONES = [
  "Pick a target country and intake",
  "Shortlist three programmes",
  "Check eligibility on the official site",
  "Book and take IELTS / PTE",
  "Prepare SOP, transcripts and finances",
  "Submit applications",
  "Track decisions and visa steps",
];

export const DESTINATIONS = ["Not decided", "Australia", "USA", "UK", "UAE", "Canada", "Germany", "India", "Nepal"];

export type Bid = { id: string; name: string; amount: number };

export const BID_CATEGORIES: { id: string; label: string; bids: Bid[] }[] = [
  {
    id: "delhi-ielts",
    label: "Delhi NCR / IELTS coaching",
    bids: [
      { id: "demo-coaching-a", name: "Sample IELTS Institute A", amount: 1200 },
      { id: "demo-coaching-c", name: "Sample IELTS Institute C", amount: 900 },
      { id: "demo-coaching-d", name: "Sample IELTS Institute D", amount: 500 },
    ],
  },
  {
    id: "delhi-consultancy",
    label: "Delhi NCR / Consultancies",
    bids: [
      { id: "demo-consultancy-c", name: "Sample Consultancy C", amount: 1500 },
      { id: "demo-consultancy-a", name: "Sample Consultancy A", amount: 800 },
      { id: "demo-consultancy-d", name: "Sample Consultancy D", amount: 500 },
    ],
  },
];

export const OPENING_BID = 500;
export const MIN_RAISE = 100;
