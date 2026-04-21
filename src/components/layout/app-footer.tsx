import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t border-border px-6 py-4">
      <nav
        className="flex items-center gap-5 text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Link href="/privacy" className="hover:text-foreground transition-colors duration-150">
          Privacy
        </Link>
        <Link href="/cookie-policy" className="hover:text-foreground transition-colors duration-150">
          Cookies
        </Link>
        <Link href="/terms" className="hover:text-foreground transition-colors duration-150">
          Terms
        </Link>
        <span className="ml-auto text-muted-foreground/60">
          © {new Date().getFullYear()} Focal Planner
        </span>
      </nav>
    </footer>
  );
}
