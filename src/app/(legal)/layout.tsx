import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          style={{ fontFamily: "var(--font-body)" }}
        >
          ← Focal Planner
        </Link>
        <span
          className="text-base tracking-wide text-foreground/60"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Focal Planner
        </span>
      </header>

      <main className="flex-1 px-6 md:px-12 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            © {new Date().getFullYear()} Focal Planner (Nuno Ribeiro Services)
          </span>
          <nav
            className="flex items-center gap-4 text-xs text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/cookie-policy" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
