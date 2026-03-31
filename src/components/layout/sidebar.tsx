"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Command,
  BarChart2,
  CalendarDays,
  CalendarCheck,
  Package,
  Settings,
  LogOut,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/command-center", label: "Command Center", shortLabel: "Home", icon: Command },
  { href: "/insights", label: "Insights", shortLabel: "Insights", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", shortLabel: "Bookings", icon: CalendarCheck },
  { href: "/packages", label: "Packages", shortLabel: "Packages", icon: Package },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
          <Camera className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span className="font-bold text-lg text-sidebar-foreground">Focal</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-sidebar">
        {NAV_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              {shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
