/**
 * /api/og/[id] · KUDOS Open Graph dinamico · T3.2 EJEC Day 25.
 *
 * Genera una imagen 1200x630 (OG standard) para los shares de KUDOS.
 * Query params:
 *   - text   = reflexion del usuario (truncada a 200 chars)
 *   - author = nombre del usuario (truncado a 40 chars)
 *   - poi    = nombre POI (truncado a 60 chars)
 *
 * Usado por /c/[id] como og:image cuando alguien comparte
 * una tarjeta-reflexion en WhatsApp/Twitter/LinkedIn.
 *
 * No requiere libreria externa; usa next/og (incluido en Next.js 15).
 */
import { ImageResponse } from "next/og";


export const runtime = "edge";


function trunc(s: string, max: number): string {
  if (!s) return "";
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const safeId = decodeURIComponent(id);
  const url = new URL(req.url);
  const text = trunc(url.searchParams.get("text") || "", 200);
  const author = trunc(url.searchParams.get("author") || "Alguien", 40);
  const poi = trunc(url.searchParams.get("poi") || safeId, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          background:
            "linear-gradient(135deg, #0a0814 0%, #1a0f2e 60%, #2a1542 100%)",
          color: "#fff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.32em",
              fontWeight: 700,
              color: "#C9A961",
            }}
          >
            KUDOS
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.06em",
            }}
          >
            {poi}
          </div>
        </div>

        {text ? (
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontStyle: "italic",
              lineHeight: 1.3,
              color: "rgba(255,255,255,0.95)",
              padding: "0 20px",
            }}
          >
            “{text}”
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 56,
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)",
              padding: "0 20px",
            }}
          >
            Un lugar que merece ser descubierto.
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(201,169,97,0.35)",
            paddingTop: 18,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#C9A961",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            — {author}, descubriendo en KUDOS
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            kudos.world
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
