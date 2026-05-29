/**
 * KUDOS · robots.txt
 */
import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://kudos-frontend-rsi3.onrender.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
