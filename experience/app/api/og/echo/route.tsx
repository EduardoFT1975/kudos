/**
 * KUDOS · OG Image Route · /api/og/echo
 *
 * Genera el cartel viral 1200x630 PNG real para WhatsApp / X / LinkedIn /
 * iMessage cards. Estética: tráiler documental + KUDOS brand stamp.
 *
 * Inputs (query):
 *   title    · nombre del lugar / Echo
 *   subtitle · frase poética (1 línea)
 *   place    · texto secundario opcional
 *   image    · URL imagen hero (Wikipedia thumb · CORS-safe)
 *
 * Output: PNG image/png, cacheable 24h.
 *
 * Runtime: edge · usa next/og built-in (Satori). No deps externas.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Echo").slice(0, 80);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 200);
  const place = (searchParams.get("place") || "").slice(0, 80);
  const image = (searchParams.get("image") || "").slice(0, 500);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "linear-gradient(135deg, #050a1f 0%, #0b1026 55%, #050a1f 100%)",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        {/* Hero image (background) */}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.92) contrast(1.1) brightness(0.65)",
            }}
          />
        ) : null}

        {/* Violet radial wash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 100% at 20% 20%, rgba(167,139,250,0.30) 0%, rgba(5,10,31,0) 60%)",
            display: "flex",
          }}
        />

        {/* Cinematic bottom-left gradient for text contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(5,9,24,0) 0%, rgba(5,9,24,0.45) 45%, rgba(5,9,24,0.92) 100%)",
            display: "flex",
          }}
        />

        {/* Top-left KUDOS brand stamp */}
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 56,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: "#c4b5fd",
              boxShadow: "0 0 24px rgba(167,139,250,0.85)",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 18,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 300,
              display: "flex",
            }}
          >
            KUDOS · Echo
          </div>
        </div>

        {/* Top-right meta */}
        {place ? (
          <div
            style={{
              position: "absolute",
              top: 50,
              right: 56,
              fontSize: 16,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(196,181,253,0.85)",
              fontWeight: 300,
              display: "flex",
            }}
          >
            {place}
          </div>
        ) : null}

        {/* Bottom-left lockup */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 56,
            right: 56,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 12,
              textTransform: "uppercase",
              color: "#c4b5fd",
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: "#c4b5fd",
                boxShadow: "0 0 16px rgba(196,181,253,0.85)",
                display: "flex",
              }}
            />
            Eco · {title}
          </div>
          <div
            style={{
              fontSize: 62,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              color: "#ffffff",
              fontWeight: 300,
              textShadow: "0 4px 24px rgba(0,0,0,0.7)",
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {subtitle || title}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 300,
              display: "flex",
            }}
          >
            Descubre el eco completo en KUDOS →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
