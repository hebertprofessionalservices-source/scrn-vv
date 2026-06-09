export function slugify(value: string): string {
  if (!value) return "";
  const normalized = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const stripped = normalized.replace(/['']/g, "");
  return stripped.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
