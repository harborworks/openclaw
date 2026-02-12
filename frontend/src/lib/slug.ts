/**
 * Convert a display name to a URL-safe slug.
 * e.g. "Sparrow Computing" → "sparrow-computing"
 */
export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
