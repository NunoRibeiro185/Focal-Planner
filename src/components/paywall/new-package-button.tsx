"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UsageLimit } from "@/components/paywall/usage-limit";
import { Plus } from "lucide-react";

export function NewPackageButton({ currentCount }: { currentCount: number }) {
  return (
    <UsageLimit
      resource="packagesTotal"
      currentCount={currentCount}
      resourceLabel="packages"
    >
      <Button asChild>
        <Link href="/packages/new">
          <Plus className="h-4 w-4" />
          New Package
        </Link>
      </Button>
    </UsageLimit>
  );
}
