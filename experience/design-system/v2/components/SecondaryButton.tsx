"use client";

import * as React from "react";
import Link from "next/link";
import { color, radius, font } from "../tokens";

interface CommonProps {
  size?: "sm" | "md" | "lg";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}
type AnchorProps = CommonProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: "link"; href: string };
type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

export type SecondaryButtonProps = AnchorProps | ButtonProps;

export function SecondaryButton(props: SecondaryButtonProps) {
  const { size = "md", iconLeft, iconRight, children, style, ...rest } = props as SecondaryButtonProps;
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "12px 18px" : "9px 14px",
    borderRadius: radius.pill,
    background: "transparent",
    color: color.ink,
    fontFamily: font.body,
    fontSize: size === "sm" ? 12 : size === "lg" ? 14 : 13,
    fontWeight: 500,
    border: `1px solid ${color.borderHi}`,
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 160ms, border-color 160ms",
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
    return <Link href={href} style={base} {...anchorRest}>{content}</Link>;
  }
  const { as: _as, ...buttonRest } = rest as ButtonProps;
  return <button type="button" style={base} {...buttonRest}>{content}</button>;
}
