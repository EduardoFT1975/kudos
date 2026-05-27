"use client";

import * as React from "react";
import Link from "next/link";
import { color, radius, font } from "../tokens";

interface CommonProps {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
}

type AnchorProps = CommonProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  as: "link"; href: string;
};
type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button";
};

export type PrimaryButtonProps = AnchorProps | ButtonProps;

function getPadding(size: "sm" | "md" | "lg") {
  if (size === "sm") return "8px 14px";
  if (size === "lg") return "14px 22px";
  return "11px 18px";
}

function getFontSize(size: "sm" | "md" | "lg") {
  if (size === "sm") return 12.5;
  if (size === "lg") return 14.5;
  return 13.5;
}

export function PrimaryButton(props: PrimaryButtonProps) {
  const { size = "md", fullWidth, iconLeft, iconRight, children, style, ...rest } = props as PrimaryButtonProps;
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: getPadding(size),
    borderRadius: radius.pill,
    background: `linear-gradient(135deg, ${color.accent} 0%, ${color.accentDeep} 100%)`,
    color: "#0a0612",
    fontFamily: font.body,
    fontSize: getFontSize(size),
    fontWeight: 600,
    letterSpacing: "-0.005em",
    border: `1px solid ${color.accent}`,
    boxShadow: `0 12px 28px -12px ${color.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
    cursor: "pointer",
    textDecoration: "none",
    width: fullWidth ? "100%" : undefined,
    transition: "transform 160ms, box-shadow 160ms, filter 160ms",
    ...style,
  };
  const content = (
    <>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </>
  );
  if ((props as AnchorProps).as === "link") {
    const { as: _as, href, ...anchorRest } = rest as AnchorProps;
    return (
      <Link href={href} style={baseStyle} {...anchorRest}>
        {content}
      </Link>
    );
  }
  const { as: _as, ...buttonRest } = rest as ButtonProps;
  return (
    <button type="button" style={baseStyle} {...buttonRest}>
      {content}
    </button>
  );
}
