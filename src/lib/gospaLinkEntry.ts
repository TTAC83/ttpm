// Shared encoding for GOSPA "Supporting evidence" link entries.
// Stored format in question_entries.content:  "name|url"  (or just "url" for legacy entries)
// "|" cannot legally appear in a URL, so it is a safe separator.

export interface ParsedLinkEntry {
  name: string;
  url: string;
}

export const normalizeLinkUrl = (raw: string): string => {
  const t = (raw ?? "").trim();
  if (!t) return "";
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return `https://${t}`;
};

export const parseLinkEntry = (content: string | null | undefined): ParsedLinkEntry => {
  const raw = (content ?? "").trim();
  if (!raw) return { name: "", url: "" };
  const sep = raw.indexOf("|");
  if (sep === -1) {
    // Legacy: URL only
    return { name: "", url: raw };
  }
  const name = raw.slice(0, sep).trim();
  const url = raw.slice(sep + 1).trim();
  return { name, url };
};

export const encodeLinkEntry = (name: string, url: string): string => {
  const cleanUrl = normalizeLinkUrl(url);
  if (!cleanUrl) return "";
  const cleanName = (name ?? "").trim();
  return cleanName ? `${cleanName}|${cleanUrl}` : cleanUrl;
};

export const linkEntryDisplay = (content: string | null | undefined): string => {
  const { name, url } = parseLinkEntry(content);
  return name || url;
};
