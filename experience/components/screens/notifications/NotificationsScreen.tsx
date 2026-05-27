"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard, Pill, SecondaryButton, Icon, type IconName, color } from "@/design-system/v2";
import { NOTIFICATIONS, type MockNotification } from "@/lib/mocks-v2/fixtures";

type Filter = "all" | "unread" | "today";
const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all",    label: "Todas" },
  { id: "unread", label: "Sin leer" },
  { id: "today",  label: "Hoy" },
];

const CATEGORY_META: Record<MockNotification["category"], { icon: IconName; tint: string; label: string }> = {
  nearby:   { icon: "here",     tint: "#a78bfa", label: "Eco cercano" },
  creator:  { icon: "studio",   tint: "#fbbf24", label: "Creador" },
  place:    { icon: "place",    tint: "#fb923c", label: "Lugar" },
  temporal: { icon: "timeline", tint: "#60a5fa", label: "Temporal" },
  merit:    { icon: "founder",  tint: "#4ade80", label: "Mérito" },
  social:   { icon: "share",    tint: "#f472b6", label: "Social" },
  system:   { icon: "settings", tint: "#94a3b8", label: "Sistema" },
};

export function NotificationsScreen() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [items, setItems] = React.useState<MockNotification[]>([...NOTIFICATIONS]);

  const visible = React.useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.read);
    if (filter === "today")  return items.filter((n) => /(ahora|m$|h$)/.test(n.when));
    return items;
  }, [items, filter]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((p) => p.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setItems((p) => p.filter((n) => n.id !== id));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }}>Notificaciones</div>
          <h1 style={{ margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>El mundo te llama</h1>
          <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14 }}>{unread} sin leer · {items.length} total</p>
        </div>
        {unread > 0 ? (
          <SecondaryButton size="sm" onClick={markAllRead}>Marcar todas leídas</SecondaryButton>
        ) : null}
      </header>

      <div role="tablist" style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${color.border}`,
        borderRadius: 999, marginBottom: 18,
      }}>
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "8px 16px",
              background: filter === f.id ? color.accent : "transparent",
              color: filter === f.id ? "#0a0612" : color.inkMid,
              border: "none",
              borderRadius: 999,
              fontFamily: "var(--kudos-font-body)",
              fontSize: 12.5,
              fontWeight: filter === f.id ? 600 : 500,
              cursor: "pointer",
            }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.length === 0 ? (
          <GlassCard>
            <div style={{ textAlign: "center", padding: "32px 12px", color: color.inkMid }}>
              <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 17, color: color.ink, marginBottom: 6 }}>Aún en silencio</div>
              <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 13 }}>Sin notificaciones que mostrar.</div>
            </div>
          </GlassCard>
        ) : visible.map((n) => {
          const meta = CATEGORY_META[n.category];
          return (
            <GlassCard key={n.id} style={{
              padding: 0,
              overflow: "hidden",
              background: !n.read ? "rgba(139,92,246,0.06)" : undefined,
              borderColor: !n.read ? "rgba(139,92,246,0.28)" : undefined,
            }}>
              <div style={{ display: "flex", gap: 12, padding: "14px 16px", alignItems: "flex-start" }}>
                <div aria-hidden style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${meta.tint}1a`,
                  border: `1px solid ${meta.tint}55`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: meta.tint, flexShrink: 0,
                }}>
                  <Icon name={meta.icon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: meta.tint, letterSpacing: "0.14em", textTransform: "uppercase" }}>{meta.label}</span>
                    <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: color.inkLow }}>· {n.when}</span>
                  </div>
                  <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 14.5, fontWeight: 600, color: color.ink, letterSpacing: "-0.005em" }}>{n.title}</div>
                  <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 12.5, color: color.inkMid, marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>
                  {n.href ? (
                    <Link href={n.href} style={{
                      marginTop: 8,
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontFamily: "var(--kudos-font-body)", fontSize: 11.5,
                      color: color.accentBright,
                      textDecoration: "none",
                    }}>Abrir <Icon name="chevron-right" size={12} /></Link>
                  ) : null}
                </div>
                <button type="button" aria-label="Descartar" onClick={() => dismiss(n.id)} style={{
                  background: "transparent", border: "none",
                  color: color.inkLow, cursor: "pointer", padding: 4,
                }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
