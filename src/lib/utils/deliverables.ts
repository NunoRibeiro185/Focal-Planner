import type { DeliverableKey } from "@/lib/types";

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

