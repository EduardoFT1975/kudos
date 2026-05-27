"use client";

import * as React from "react";

/**
 * KUDOS icon set · inline SVGs · no external deps.
 * stroke=currentColor para que herede el color del padre.
 */
export type IconName =
  | "home" | "map" | "here" | "discover" | "timeline" | "moments"
  | "studio" | "memories" | "connections" | "saved" | "mind"
  | "bell" | "gift" | "settings" | "search" | "play" | "arrow-right"
  | "place" | "history" | "people" | "event" | "culture" | "nature"
  | "heart" | "share" | "plus" | "more" | "chevron" | "chevron-right"
  | "founder" | "ai" | "globe" | "close" | "menu";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11.5L12 4l9 7.5" /><path d="M5 10v9h14v-9" /></>,
  map:  <><polygon points="2,6 9,3 15,6 22,3 22,18 15,21 9,18 2,21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
  here: <><circle cx="12" cy="11" r="3" /><path d="M12 21s-7-7.5-7-11a7 7 0 0114 0c0 3.5-7 11-7 11z" /></>,
  discover: <><circle cx="12" cy="12" r="9" /><polygon points="14,10 11,15 10,14 13,9" /></>,
  timeline: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  moments: <><polygon points="12,3 14.5,9 21,9 16,13.5 17.5,20 12,16.5 6.5,20 8,13.5 3,9 9.5,9" /></>,
  studio: <><path d="M12 19h8" /><path d="M4 19l5-13c.5-1.5 2-2 3-1l2 1c1 .5 1 2 0 3L5 19" /></>,
  memories: <><path d="M21 13.5a4.5 4.5 0 11-9 0c0-2 1-3 2.5-4.5C13 7 12 5 12 5s-1 2-2.5 4c-1.5 1.5-2.5 2.5-2.5 4.5a4.5 4.5 0 109 0z" /></>,
  connections: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><line x1="11.5" y1="9.5" x2="14.5" y2="14.5" /></>,
  saved: <><path d="M6 4h12v17l-6-4-6 4z" /></>,
  mind: <><path d="M12 3a4 4 0 014 4v1a4 4 0 11-4 7 4 4 0 11-4-7V7a4 4 0 014-4z" /><circle cx="12" cy="13" r="1.5" /></>,
  bell: <><path d="M6 8a6 6 0 1112 0c0 5 2 6 2 7H4c0-1 2-2 2-7z" /><path d="M10 19a2 2 0 004 0" /></>,
  gift: <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 003.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H8a1.65 1.65 0 001-1.51V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V8a1.65 1.65 0 001.51 1H22a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  play: <><polygon points="6,4 20,12 6,20" /></>,
  "arrow-right": <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>,
  place: <><circle cx="12" cy="11" r="3" /><path d="M12 21s-7-7.5-7-11a7 7 0 0114 0c0 3.5-7 11-7 11z" /></>,
  history: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="9" r="2.5" /><path d="M22 19c0-2-1.5-3.5-4-4" /></>,
  event: <><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></>,
  culture: <><polygon points="12,3 21,8 21,16 12,21 3,16 3,8" /></>,
  nature: <><path d="M12 3c-3 4-5 7-5 10a5 5 0 0010 0c0-3-2-6-5-10z" /><line x1="12" y1="22" x2="12" y2="16" /></>,
  heart: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 000-7.78z" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><line x1="8" y1="11" x2="16" y2="7" /><line x1="8" y1="13" x2="16" y2="17" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  more: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
  chevron: <><polyline points="6 9 12 15 18 9" /></>,
  "chevron-right": <><polyline points="9 6 15 12 9 18" /></>,
  founder: <><polygon points="12,3 14.5,9 21,9 16,13.5 17.5,20 12,16.5 6.5,20 8,13.5 3,9 9.5,9" /></>,
  ai: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" /><line x1="1" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="23" y2="12" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>,
  close: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>,
  menu: <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>,
};

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
