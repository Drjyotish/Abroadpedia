import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-head", display: "swap" });

export const metadata: Metadata = {
  title: "AbroadPedia — Dream destinations. Grounded decisions.",
  description:
    "Before you pay for education, check AbroadPedia. A source-backed EduWiki, six-dimension student reviews, a Compare Lab, an Opportunity Radar and a journey tracker for students in Nepal and India.",
  openGraph: {
    title: "AbroadPedia — Discover. Compare. Decide.",
    description: "Fly from Kathmandu to New York and see how AbroadPedia helps students make evidence-based study-abroad decisions.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#101A35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
