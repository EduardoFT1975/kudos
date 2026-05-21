/**
 * KUDOS Experience · loading para /places/[slug]
 *
 * Skeleton respirando alineado con la composición real de la página.
 * Provisional pre-DesignSystem; se sustituirá por <PlaceSkeleton/>.
 */
export default function PlaceLoading() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        background: "#050a1f",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Pulse w={180} h={11} />
        <div style={{ height: 14 }} />
        <Pulse w={"60%"} h={44} radius={6} />
        <div style={{ height: 32 }} />
        <Pulse w={120} h={11} />
        <div style={{ height: 12 }} />
        <Pulse h={88} radius={10} />
        <div style={{ height: 32 }} />
        <Pulse w={120} h={11} />
        <div style={{ height: 12 }} />
        <Stack count={4} h={56} gap={10} radius={8} />
      </div>
      <style>{`
        @keyframes kudos-skel {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.7;  }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-kudos-pulse] { animation: none !important; opacity: 0.55 !important; }
        }
      `}</style>
    </main>
  );
}

function Pulse({
  w = "100%",
  h = 12,
  radius = 4,
}: {
  w?: number | string;
  h?: number;
  radius?: number;
}) {
  return (
    <div
      data-kudos-pulse
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "linear-gradient(90deg, #1a2447 0%, #2a3766 50%, #1a2447 100%)",
        animation: "kudos-skel 1.6s ease-in-out infinite",
      }}
    />
  );
}

function Stack({
  count,
  h,
  gap,
  radius,
}: {
  count: number;
  h: number;
  gap: number;
  radius: number;
}) {
  return (
    <div style={{ display: "grid", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Pulse key={i} h={h} radius={radius} />
      ))}
    </div>
  );
}
