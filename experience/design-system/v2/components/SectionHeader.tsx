"use client";

import * as React from "react";
import Link from "next/link";
import { color, font } from "../tokens";

export interface SectionHeaderProps {
  title: string;
  /** Si se pasa, aparece "Ver todos" CTA con href */
  href?: string;
  cta?: string;
  /** Tono · normal (uppercase mono) o eyebrow */
  tone?: "label" | "title";
}

export function SectionHeader({ title, href, cta = "Ver todos", tone = "label" }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: tone === "title" ? color.ink : color.inkMid,
          fontFamily: tone === "title" ? font.display : font.body,
          fontSize: tone === "title" ? 20 : 11.5,
          fontWeight: tone === "title" ? 600 : 500,
          letterSpacing: tone === "title" ? "-0.01em" : "0.14em",
          textTransform: tone === "title" ? "none" : "uppercase",
        }}
      >
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          style={{
            fontFamily: font.body,
            fontSize: 12,
            color: color.accentBright,
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
