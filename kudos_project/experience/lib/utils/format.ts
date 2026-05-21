/**
 * KUDOS Experience · format helpers (puros, sin dependencias).
 */

/** Formatea un año (negativo = a.C., positivo = d.C.). */
export function formatYear(year: number | null | undefined): string {
  if (year === null || year === undefined) return "";
  if (year < 0) return `${Math.abs(year)} a.C.`;
  if (year === 0) return "Año 0";
  return `${year} d.C.`;
}

/** Devuelve etiqueta de era para un año (matching choices de AXÓN). */
export function eraLabelForYear(year: number | null | undefined): string {
  if (year === null || year === undefined) return "atemporal";
  if (year < 476) return "antigua";
  if (year < 1492) return "media";
  if (year < 1789) return "moderna";
  if (year < 2000) return "contemporánea";
  return "actual";
}

/** Capitaliza la primera letra (sin tocar el resto). */
export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Slugifica un texto a algo URL-safe básico. */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
