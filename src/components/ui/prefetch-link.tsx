"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

export function PrefetchLink({ href, onMouseEnter, ...props }: Props) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onMouseEnter={(e) => {
        router.prefetch(href.toString());
        onMouseEnter?.(e);
      }}
      {...props}
    />
  );
}
