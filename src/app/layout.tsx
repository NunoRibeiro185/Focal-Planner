import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Playfair_Display } from "next/font/google";
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
  title: "Focal — Photography Business Planner",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
