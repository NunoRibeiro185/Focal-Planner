import type { DeliverableKey, PackageVersion } from "@/lib/types";

export interface DeliverableMeta {
  key: DeliverableKey;
  label: string;
  /** Ordered list of valid status strings for this deliverable */
  statuses: string[];
}

export const DELIVERABLE_META: Record<DeliverableKey, DeliverableMeta> = {
  edited_photos: {
    key: "edited_photos",
    label: "Edited Photos",
    statuses: ["not_started", "culling", "editing", "ready", "delivered"],
  },
  wedding_album: {
    key: "wedding_album",
    label: "Wedding Album",
    statuses: [
      "not_started",
      "ordered",
      "in_production",
      "shipped",
      "delivered",
    ],
  },
  film_rolls: {
    key: "film_rolls",
    label: "Film Photography",
    statuses: ["not_started", "developing", "scanning", "editing", "delivered"],
  },
  video: {
    key: "video",
    label: "Video",
    statuses: ["not_started", "editing", "review", "delivered"],
  },
  short_clips: {
    key: "short_clips",
    label: "Short Clips",
    statuses: ["not_started", "editing", "review", "delivered"],
  },
  second_shooter: {
    key: "second_shooter",
    label: "Second Shooter",
    statuses: ["not_started", "completed"],
  },
};

export const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  culling: "Culling",
  editing: "Editing",
  ready: "Ready",
  delivered: "Delivered",
  ordered: "Ordered",
  in_production: "In production",
  shipped: "Shipped",
  developing: "Developing",
  scanning: "Scanning",
  review: "In review",
  completed: "Completed",
};

/**
 * Returns the list of deliverable keys that are enabled in a given
 * package version. Used when creating deliverable_statuses rows.
 */
export function getEnabledDeliverables(version: PackageVersion): DeliverableKey[] {
  const enabled: DeliverableKey[] = [];
  if (version.edited_photos_count && version.edited_photos_count > 0)
    enabled.push("edited_photos");
  if (version.wedding_album) enabled.push("wedding_album");
  if (version.film_rolls_count && version.film_rolls_count > 0)
    enabled.push("film_rolls");
  if (version.video) enabled.push("video");
  if (version.short_clips) enabled.push("short_clips");
  if (version.second_shooter) enabled.push("second_shooter");
  return enabled;
}
