/**
 * KUDOS · Wikimedia Commons URL helper.
 *
 * Special:FilePath redirects to the canonical thumbnail. Stable URL.
 * Example: https://commons.wikimedia.org/wiki/Special:FilePath/Colosseo_2020.jpg?width=1600
 */
export function wikimediaUrl(filename: string, width: number = 1280): string {
  const encoded = encodeURIComponent(filename);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`;
}
