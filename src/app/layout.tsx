import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Playfair_Display } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// ─── Font configuration ───────────────────────────────────────────────────────
// Change the heading/body fonts here — they propagate via CSS variables.

const geistSans = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  // weight: ["400", "500", "600", "700"], // uncomment to restrict weights
});

export const metadata: Metadata = {
  title: "Focal Planner — Photography Business Planner",
  description: "Manage your photography bookings, packages, and clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
