"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const ONBOARDING_KEY = "focal_onboarding_completed";

// ─── Visual pieces ────────────────────────────────────────────────────────────

function PackageVersionDiagram() {
  return (
    <div className="mt-10 mb-2">
      <div className="flex items-start flex-wrap sm:flex-nowrap gap-y-4">
        <div className="flex flex-col items-center shrink-0">
          <div className="rounded-md border border-border bg-card px-6 py-4 text-center min-w-[140px]">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Package</p>
            <p className="text-base font-medium" style={{ fontFamily: "var(--font-heading)" }}>Gold Package</p>
          </div>
          <div className="mt-2 text-xs text-muted-foreground/60">stays the same</div>
        </div>

        <div className="flex flex-col items-start ml-8 mt-1 gap-3">
          <div className="flex items-center gap-4">
            <div className="h-px w-8 bg-border shrink-0" />
            <div className="rounded-md border border-primary/30 bg-primary/5 px-5 py-3 min-w-[160px]">
              <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-1">Version</p>
              <p className="text-sm font-medium">Winter Base</p>
              <p className="text-xs text-muted-foreground mt-0.5">€2,200 · 8 hrs</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-px w-8 bg-border shrink-0" />
            <div className="rounded-md border border-primary/30 bg-primary/5 px-5 py-3 min-w-[160px]">
              <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-1">Version</p>
              <p className="text-sm font-medium">Summer 2025</p>
              <p className="text-xs text-muted-foreground mt-0.5">€2,600 · 8 hrs</p>
            </div>
          </div>
          <div className="ml-12 text-xs text-muted-foreground/60">each season, new pricing</div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-md bg-muted/40 px-5 py-4 max-w-xl">
        <span className="text-sm font-medium text-primary/70 mt-0.5 shrink-0" style={{ fontFamily: "var(--font-heading)" }}>!</span>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every booking locks to a specific version. Raise your rates for next season without touching a single past booking.
        </p>
      </div>
    </div>
  );
}

function ExtrasDiagram() {
  const extras = [
    { name: "Drone footage", price: "€350" },
    { name: "Rush editing", price: "€200" },
    { name: "Fine art album", price: "€580" },
  ];

  return (
    <div className="mt-10 mb-2 max-w-lg space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Your extras catalog</p>
      {extras.map((extra) => (
        <div key={extra.name} className="flex items-center justify-between rounded-md border border-border bg-card px-5 py-3.5">
          <span className="text-sm">{extra.name}</span>
          <span className="text-sm font-medium text-primary">{extra.price}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">attach to any booking</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function DeliverablesDiagram() {
  const items = [
    { label: "Edited photos", example: "e.g. 450 retouched images delivered via gallery link" },
    { label: "Fine art album", example: "e.g. 30-page, 30×30 cm lay-flat album" },
    { label: "Video highlights", example: "e.g. 3–5 minute cinematic reel" },
    { label: "Prints", example: "e.g. set of 10 fine art prints, 20×30 cm" },
  ];

  return (
    <div className="mt-10 mb-2 space-y-6">
      <div className="space-y-4 max-w-xl">
        <div className="flex items-start gap-3 rounded-md border border-border bg-card px-5 py-4">
          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">1</span>
          </div>
          <div>
            <p className="text-sm font-medium">Define your deliverable types</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Go to{" "}<span className="text-foreground font-medium">Packages → Deliverables</span>{" "}to create your deliverable catalog — edited photos, albums, video, prints, and anything else you offer.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border bg-card px-5 py-4">
          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">2</span>
          </div>
          <div>
            <p className="text-sm font-medium">Select which apply to each package version</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Inside each package version you pick from that catalog and set the specifics — how many photos, which album size, video length. Every version can differ.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border bg-card px-5 py-4">
          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">3</span>
          </div>
          <div>
            <p className="text-sm font-medium">Track completion on each booking</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Every booking inherits the deliverables from its package version. Mark each one complete as you hand it over — nothing slips through.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Example deliverables</p>
        <div className="space-y-3 max-w-xl">
          {items.map((item, i) => (
            <div key={item.label} className="flex items-start gap-5">
              <span
                className="text-xs font-medium text-primary/50 w-5 shrink-0 mt-0.5 tabular-nums"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.example}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingLifecycleDiagram() {
  const stages = [
    { key: "inquiry", label: "Inquiry", desc: "Lead comes in — not yet booked", first: true },
    { key: "confirmed", label: "Confirmed", desc: "Contract signed, deposit paid", first: false },
    { key: "shoot_completed", label: "Shoot completed", desc: "Wedding day is done", first: false },
    { key: "editing", label: "Editing", desc: "In the darkroom", first: false },
    { key: "delivered", label: "Delivered", desc: "Gallery sent to clients", first: false },
    { key: "done", label: "Done", desc: "Everything wrapped up", first: false },
  ];

  return (
    <div className="mt-10 mb-2 max-w-lg">
      <div className="space-y-0">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          return (
            <div key={stage.key} className="flex items-stretch gap-5">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0 w-4">
                <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 ${
                  stage.first ? "border-primary bg-primary/20" : "border-muted-foreground/30 bg-muted"
                }`} />
                {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
              </div>
              {/* Content */}
              <div className={`flex items-baseline gap-4 ${isLast ? "pb-0" : "pb-4"}`}>
                <p className="text-sm font-medium w-36 shrink-0">{stage.label}</p>
                <p className="text-sm text-muted-foreground leading-snug">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-md bg-muted/40 px-5 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can move a booking between any stage at any time.{" "}
          <span className="text-foreground font-medium">Cancelled</span>{" "}
          is always available as a separate path — it doesn&apos;t delete the booking, just closes it.
        </p>
      </div>
    </div>
  );
}

function SecondShooterDiagram() {
  return (
    <div className="mt-10 mb-2 max-w-xl">
      <div className="space-y-5">
        <div className="flex items-start gap-5">
          <span className="text-sm font-medium text-primary/50 w-6 shrink-0 mt-0.5 tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>01</span>
          <div>
            <p className="text-sm font-medium">Invite from a booking</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Open any confirmed booking and send an invite. The second shooter gets an email with a private link.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-5">
          <span className="text-sm font-medium text-primary/50 w-6 shrink-0 mt-0.5 tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>02</span>
          <div>
            <p className="text-sm font-medium">They see what they need</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              The link shows date, venue, timeline, and any notes — without exposing pricing or client financials.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-5">
          <span className="text-sm font-medium text-primary/50 w-6 shrink-0 mt-0.5 tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>03</span>
          <div>
            <p className="text-sm font-medium">Optional password protection</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Lock the link behind a password — only your second shooter can view it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InquiryPageDiagram() {
  return (
    <div className="mt-10 mb-2 max-w-xl">
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 bg-muted/30 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
          <span className="text-xs text-muted-foreground ml-2">focalplanner.com/inquiry/your-name</span>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)" }}>Tell me about your day</p>
          <div className="space-y-2.5">
            <div className="h-8 rounded bg-muted/50 w-full" />
            <div className="h-8 rounded bg-muted/50 w-3/4" />
            <div className="h-8 rounded bg-muted/50 w-full" />
          </div>
          <div className="pt-1">
            <div className="h-8 rounded bg-primary/20 w-32" />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
          <p className="text-sm text-muted-foreground">Configure in Settings → Booking setup</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
          <p className="text-sm text-muted-foreground">Choose which fields to show or hide</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
          <p className="text-sm text-muted-foreground">Submissions appear in bookings as inquiries</p>
        </div>
      </div>
    </div>
  );
}

function CalendarDiagram() {
  const events = [
    { label: "Emma & James — Wedding", type: "booking", color: "bg-primary/15 border-primary/30 text-primary" },
    { label: "Travel — Porto trip", type: "personal", color: "bg-muted border-border text-muted-foreground" },
    { label: "Sofia & Marco — Engagement", type: "booking", color: "bg-primary/15 border-primary/30 text-primary" },
    { label: "Equipment servicing", type: "personal", color: "bg-muted border-border text-muted-foreground" },
  ];

  return (
    <div className="mt-10 mb-2 max-w-xl space-y-8">
      {/* Event types */}
      <div className="space-y-2.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">What you can add</p>
        {events.map((event) => (
          <div
            key={event.label}
            className={`flex items-center justify-between rounded-md border px-4 py-3 ${event.color}`}
          >
            <span className="text-sm font-medium">{event.label}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 shrink-0 ml-3">
              {event.type === "booking" ? "booking" : "personal"}
            </span>
          </div>
        ))}
      </div>

      {/* Google Calendar sync */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary shrink-0 mt-0.5">
            Pro
          </span>
          <div>
            <p className="text-sm font-medium">Google Calendar sync</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Connect your Google Calendar in Settings and every event you add in Focal is pushed there automatically. It&apos;s a one-way sync — Focal sends to Google, but doesn&apos;t pull events back. Your Focal calendar stays your source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chapter definitions ──────────────────────────────────────────────────────

const chapters = [
  {
    id: 0,
    shortLabel: "Welcome",
    title: "Your studio, organised.",
    subtitle: "A quick tour of what Focal can do for you.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          Focal is built for photographers who care about the work — not spreadsheets. It keeps your packages, bookings, deliverables, and clients in one calm, well-organised place.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          This short tour covers the things that matter most: how packages and versions work, what extras are, how a booking moves from first inquiry to final delivery, and how your second shooter and inquiry pages fit in.
        </p>
        <div className="pt-2 space-y-3">
          {["Packages & versions", "Deliverables", "Extras", "Booking lifecycle", "Second shooter", "Calendar", "Your inquiry page"].map((item, i) => (
            <div key={item} className="flex items-center gap-4">
              <span className="text-sm font-medium text-primary/50 tabular-nums w-6 shrink-0" style={{ fontFamily: "var(--font-heading)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 1,
    shortLabel: "Packages",
    title: "Packages & versions.",
    subtitle: "Your core offerings, with a full pricing history.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          A{" "}<span className="text-foreground font-medium">package</span>{" "}is the name your clients know — &ldquo;Full Day&rdquo;, &ldquo;Elopement Session&rdquo;, &ldquo;Gold Package&rdquo;. The name stays constant across seasons.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Under each package, you create{" "}<span className="text-foreground font-medium">versions</span>{" "}— one per pricing period. Each version holds the rate, hours, and deliverables for that season.
        </p>
        <PackageVersionDiagram />
      </div>
    ),
  },
  {
    id: 2,
    shortLabel: "Deliverables",
    title: "Deliverables.",
    subtitle: "What your clients receive — set up once, tracked per booking.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          Deliverables are the tangible things you hand over at the end of a job — edited photos, albums, video reels, prints. Focal gives you a three-step workflow for managing them across all your work.
        </p>
        <DeliverablesDiagram />
      </div>
    ),
  },
  {
    id: 3,
    shortLabel: "Extras",
    title: "Extras.",
    subtitle: "Reusable add-ons, attached to any booking.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          Extras are the things you offer on top of your main package — drone footage, rush editing, fine art albums, prints. Define them once in your catalog, then attach them to individual bookings as needed.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Each extra has its own price. When attached to a booking, it contributes to the total automatically.
        </p>
        <ExtrasDiagram />
      </div>
    ),
  },
  {
    id: 4,
    shortLabel: "Bookings",
    title: "The booking journey.",
    subtitle: "From first contact to final delivery.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          Every booking follows a clear path. It starts as an{" "}<span className="text-foreground font-medium">inquiry</span>{" "}— an interest you haven&apos;t yet confirmed — and progresses through to{" "}<span className="text-foreground font-medium">done</span>{" "}when everything is wrapped up and handed over.
        </p>
        <BookingLifecycleDiagram />
      </div>
    ),
  },
  {
    id: 5,
    shortLabel: "Second shooter",
    title: "Second shooter.",
    subtitle: "Share what they need. Nothing more.",
    pro: true,
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          When you&apos;re working with a second shooter, Focal generates a private link for them. They see the shoot details — date, venue, timeline, notes — without seeing your pricing or any client financials.
        </p>
        <SecondShooterDiagram />
      </div>
    ),
  },
  {
    id: 6,
    shortLabel: "Calendar",
    title: "The calendar.",
    subtitle: "Your whole schedule, not just bookings.",
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          The calendar shows all your bookings automatically — but you can also add any other event you want to keep track of: travel, equipment days, personal time, a workshop you&apos;re attending. It&apos;s your full schedule in one place, not just a list of shoots.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Creating a booking from the calendar is just as easy as creating one from the bookings list — click any day and fill in the details.
        </p>
        <CalendarDiagram />
      </div>
    ),
  },
  {
    id: 7,
    shortLabel: "Inquiry form",
    title: "Your inquiry page.",
    subtitle: "A public form. Leads land straight in Focal.",
    pro: true,
    body: (
      <div className="space-y-5 max-w-2xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          Focal gives you a public inquiry form at your own URL. Share it in your Instagram bio, on your website, or anywhere clients might find you. When they submit, the inquiry lands in your bookings list automatically.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          You control exactly what the form shows — whether to display your packages and prices, which fields to include, and whether the form is live.
        </p>
        <InquiryPageDiagram />
      </div>
    ),
  },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

interface OnboardingTourProps {
  redirectTo?: string;
}

export function OnboardingTour({ redirectTo = "/command-center" }: OnboardingTourProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const total = chapters.length;

  const navigateTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      setDirection(index > current ? "forward" : "back");
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 180);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    if (current < total - 1) navigateTo(current + 1);
  }, [current, total, navigateTo]);

  const prev = useCallback(() => {
    if (current > 0) navigateTo(current - 1);
  }, [current, navigateTo]);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    router.push(redirectTo);
  }

  function skip() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    router.push(redirectTo);
  }

  const chapter = chapters[current];
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    // h-full so the tour fills the scroll-container's viewport exactly —
    // only the inner content area scrolls, everything else stays put.
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Progress bar + skip — always visible at top ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-8 pb-0">
        <div className="flex items-center gap-3">
          {chapters.map((_, i) => (
            <button
              key={i}
              onClick={() => navigateTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? "w-6 h-2.5 bg-primary"
                  : i < current
                  ? "w-2.5 h-2.5 bg-primary/40"
                  : "w-2.5 h-2.5 bg-muted-foreground/20"
              }`}
              aria-label={`Go to chapter ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={skip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip tour
        </button>
      </div>

      {/* ── Middle: nav sidebar + chapter content ── */}
      <div className="flex-1 flex min-h-0 px-8 pt-10 gap-16">

        {/* Left nav — never scrolls */}
        <nav className="hidden lg:block shrink-0 w-56 pt-2">
          <ul className="space-y-0.5">
            {chapters.map((ch, i) => (
              <li key={ch.id}>
                <button
                  onClick={() => navigateTo(i)}
                  className={`flex items-center gap-4 w-full text-left py-2.5 transition-colors ${
                    i === current
                      ? "text-foreground"
                      : i < current
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/35 hover:text-muted-foreground"
                  }`}
                >
                  <span
                    className={`text-xs tabular-nums w-6 shrink-0 font-medium transition-colors ${
                      i === current ? "text-primary" : "text-muted-foreground/40"
                    }`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-tight">{ch.shortLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right column: scrollable content + pinned buttons */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* Scrollable chapter content */}
          <div className="flex-1 overflow-y-auto pb-6">
            <div
              key={current}
              className={`${
                animating
                  ? direction === "forward"
                    ? "opacity-0 translate-y-3"
                    : "opacity-0 -translate-y-3"
                  : "opacity-100 translate-y-0"
              } transition-all duration-200 ease-out`}
            >
              <p className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-medium">
                {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} — {chapter.shortLabel}
              </p>

              <h1
                className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3 leading-[1.1]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {chapter.title}
              </h1>
              <div className="flex items-center gap-3 mb-8">
                <p className="text-lg text-muted-foreground leading-relaxed">{chapter.subtitle}</p>
                {"pro" in chapter && chapter.pro && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Pro
                  </span>
                )}
              </div>

              <div>{chapter.body}</div>
            </div>
          </div>

          {/* Back / Next — always pinned at the bottom */}
          <div className="shrink-0 flex items-center justify-between py-6 border-t border-border/50">
            <div>
              {!isFirst && (
                <button
                  onClick={prev}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>

            {isLast ? (
              <button
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Enter Focal →
              </button>
            ) : (
              <button
                onClick={next}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isFirst ? "Start tour →" : "Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTourReentry() {
  return <OnboardingTour redirectTo="/settings" />;
}
