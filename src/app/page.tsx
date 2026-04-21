import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// SVG fractalNoise grain — encodes to a repeating noise texture
const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/command-center");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-[oklch(0.88_0.08_60)]">

      {/* ─── Film grain overlay (fixed, whole page) ──────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{
          backgroundImage: GRAIN_URI,
          backgroundSize: "300px 300px",
          opacity: 0.028,
          mixBlendMode: "multiply",
        }}
        aria-hidden="true"
      />

      {/* ─── Navigation ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-background/85 backdrop-blur-sm">
        <span
          className="text-xl tracking-wide text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Focal
        </span>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          Sign in →
        </Link>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-24 pb-20 overflow-hidden">

        {/* Contact-sheet grid — very faint, photography-specific texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              "linear-gradient(oklch(0.45 0.06 75 / 0.055) 1px, transparent 1px)",
              "linear-gradient(90deg, oklch(0.45 0.06 75 / 0.055) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "72px 72px",
          }}
          aria-hidden="true"
        />

        {/* Warm light leak — top right, like window light through a studio */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 92% 8%, oklch(0.82 0.11 70 / 0.22) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* Lens / viewfinder diagram — right side background element */}
        <svg
          className="absolute pointer-events-none"
          style={{
            right: "-4%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "clamp(280px, 44vw, 580px)",
            opacity: 0.065,
            color: "var(--color-foreground)",
          }}
          viewBox="0 0 600 600"
          fill="none"
          aria-hidden="true"
        >
          {[280, 220, 160, 100, 48].map((r) => (
            <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeWidth="1" />
          ))}
          <line x1="300" y1="18"  x2="300" y2="582" stroke="currentColor" strokeWidth="0.5" />
          <line x1="18"  y1="300" x2="582" y2="300" stroke="currentColor" strokeWidth="0.5" />
          <line x1="102" y1="102" x2="498" y2="498" stroke="currentColor" strokeWidth="0.5" />
          <line x1="498" y1="102" x2="102" y2="498" stroke="currentColor" strokeWidth="0.5" />
          {/* Tick marks at cardinal points on outermost circle */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={300 + 280 * Math.cos(rad)}
                y1={300 + 280 * Math.sin(rad)}
                x2={300 + 264 * Math.cos(rad)}
                y2={300 + 264 * Math.sin(rad)}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl">
          <p
            className="animate-fade-up text-sm tracking-[0.2em] uppercase text-primary mb-10"
            style={{ fontFamily: "var(--font-body)", opacity: 0.8, animationDelay: "0ms" }}
          >
            Photography business management
          </p>

          <h1
            className="leading-[0.92] tracking-tight mb-12"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(3.5rem, 10vw, 9rem)",
            }}
          >
            <span
              className="block text-foreground animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Run your studio.
            </span>
            <span
              className="block italic text-primary animate-fade-up"
              style={{
                marginLeft: "clamp(1rem, 6vw, 5rem)",
                animationDelay: "220ms",
              }}
            >
              Stay in the craft.
            </span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <p
              className="animate-fade-up text-lg md:text-xl leading-relaxed text-muted-foreground max-w-[56ch]"
              style={{ fontFamily: "var(--font-body)", animationDelay: "360ms" }}
            >
              Focal is a business planner for wedding and portrait photographers.
              Bookings, packages, clients, and finances — organized the way you
              actually work, not the way a spreadsheet does.
            </p>

            <div
              className="animate-fade-up flex flex-col gap-4 md:items-end"
              style={{ animationDelay: "480ms" }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-150 self-start md:self-auto"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Get started free
              </Link>
              <span className="text-xs text-muted-foreground">
                No credit card required during early access.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Divider ─────────────────────────────────────────── */}
      <div className="px-8 md:px-16 lg:px-24">
        <hr className="border-border" />
      </div>

      {/* ─── Features ────────────────────────────────────────── */}
      <section className="px-8 md:px-16 lg:px-24 py-24 md:py-32">
        <div className="max-w-6xl">
          <p
            className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-16"
            style={{ fontFamily: "var(--font-body)" }}
          >
            What Focal does
          </p>

          <div className="space-y-0">
            {[
              {
                num: "01",
                title: "Every booking, one place",
                body: "From the first inquiry to the final gallery delivery, every client moves through a clear lifecycle. Nothing falls through the cracks.",
              },
              {
                num: "02",
                title: "Packages that don't lie",
                body: "Your package price at the time of booking is locked in forever — even when you update your rates. No more confusion about what was sold.",
              },
              {
                num: "03",
                title: "Finances you can actually read",
                body: "Revenue, upcoming payouts, and outstanding invoices at a glance. No accounting degree, no spreadsheet formulas.",
              },
            ].map((feature) => (
              <div
                key={feature.num}
                className="grid grid-cols-[auto_1fr] md:grid-cols-[8rem_1fr_1fr] gap-x-8 gap-y-2 items-baseline py-10 border-t border-border"
              >
                <span
                  className="text-5xl md:text-7xl font-light text-primary leading-none"
                  style={{ fontFamily: "var(--font-heading)", opacity: 0.35 }}
                  aria-hidden="true"
                >
                  {feature.num}
                </span>
                <h2
                  className="text-2xl md:text-3xl font-normal leading-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {feature.title}
                </h2>
                <p
                  className="col-start-2 md:col-start-3 text-base leading-relaxed text-muted-foreground max-w-[50ch]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {feature.body}
                </p>
              </div>
            ))}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      {/* ─── Mission ─────────────────────────────────────────── */}
      <section
        className="relative px-8 md:px-16 lg:px-24 py-36 md:py-52 overflow-hidden"
        style={{ background: "oklch(0.93 0.022 70)" }}
      >
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: GRAIN_URI,
            backgroundSize: "300px 300px",
            opacity: 0.05,
            mixBlendMode: "multiply",
          }}
          aria-hidden="true"
        />

        {/* Halftone dot grid — fades from edges inward, editorial print heritage */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="ht" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="1.15" fill="oklch(0.50 0.13 58)" />
            </pattern>
            <radialGradient id="ht-fade" cx="38%" cy="52%" r="62%">
              <stop offset="0%"   stopColor="white" stopOpacity="0"   />
              <stop offset="42%"  stopColor="white" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="white" stopOpacity="0.9" />
            </radialGradient>
            <mask id="ht-mask">
              <rect width="100%" height="100%" fill="url(#ht-fade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#ht)" mask="url(#ht-mask)" opacity="0.55" />
        </svg>

        {/* Giant decorative opening quote — positioned as structural element */}
        <span
          className="absolute pointer-events-none select-none text-primary"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(12rem, 22vw, 26rem)",
            lineHeight: 1,
            opacity: 0.1,
            top: "-0.1em",
            left: "calc(var(--spacing, 1rem) * 4)",
          }}
          aria-hidden="true"
        >
          &ldquo;
        </span>

        <div className="relative z-10 max-w-4xl">
          <p
            className="text-sm tracking-[0.2em] uppercase text-primary mb-12"
            style={{ fontFamily: "var(--font-body)", opacity: 0.75 }}
          >
            Our mission
          </p>
          <p
            className="text-3xl md:text-4xl lg:text-5xl leading-[1.2] tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Most photographers didn&apos;t start their business because they
            love spreadsheets. Focal is built for the way photographers actually
            work —{" "}
            <em>organized enough to scale, simple enough to stay focused</em>{" "}
            on the craft.
          </p>
          <p
            className="mt-10 text-base leading-relaxed text-muted-foreground max-w-[58ch]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            We built the system we wished existed when running our own studio.
            One tool that handles the business side — so you can spend more time
            behind the lens.
          </p>
        </div>
      </section>

      {/* ─── Closing CTA ─────────────────────────────────────── */}
      <section className="relative px-8 md:px-16 lg:px-24 py-24 md:py-36 overflow-hidden">

        {/* Second light leak — bottom left this time */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 5% 95%, oklch(0.82 0.11 70 / 0.14) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl flex flex-col md:flex-row md:items-end md:justify-between gap-12">
          <h2
            className="leading-[0.95] tracking-tight"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
            }}
          >
            <span className="block">Built for photographers.</span>
            <span className="block italic text-primary">Ready when you are.</span>
          </h2>

          <div className="flex flex-col gap-4 md:items-end shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-150 self-start"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 self-start"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="px-8 md:px-16 lg:px-24 py-8 border-t border-border">
        <div className="flex items-center justify-between">
          <span
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            © {new Date().getFullYear()} Focal
          </span>
          <span
            className="text-sm text-muted-foreground italic"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            For photographers.
          </span>
        </div>
      </footer>
    </div>
  );
}
