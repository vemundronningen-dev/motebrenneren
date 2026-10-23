/**
 * Minimal MIME-parser - akkurat nok til å hente ut tekst-delene (særlig
 * text/calendar) fra en rå e-post (RFC 822). Ingen avhengigheter.
 */

export interface MimeLeaf {
  contentType: string;
  filename: string | null;
  text: string;
}

interface Headers {
  [name: string]: string;
}

function splitHeadersAndBody(raw: string): { headers: Headers; body: string } {
  const match = /\r?\n\r?\n/.exec(raw);
  const headerBlock = match ? raw.slice(0, match.index) : raw;
  const body = match ? raw.slice(match.index + match[0].length) : "";
  const headers: Headers = {};
  for (const line of headerBlock.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    if (!(name in headers)) headers[name] = line.slice(colon + 1).trim();
  }
  return { headers, body };
}

/** `text/calendar; method=REQUEST; charset="utf-8"` -> type + params. */
export function parseHeaderValue(value: string): { value: string; params: Record<string, string> } {
  const parts = value.match(/(?:[^;"]+|"[^"]*")+/g) ?? [];
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase().replace(/\*$/, "");
    params[key] = part.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
  return { value: (parts[0] ?? "").trim().toLowerCase(), params };
}

function decodeBytes(bytes: Uint8Array, charset: string | undefined): string {
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function decodeBody(body: string, encoding: string, charset: string | undefined): string {
  const enc = encoding.toLowerCase();
  if (enc === "base64") {
    return decodeBytes(Uint8Array.from(Buffer.from(body.replace(/\s+/g, ""), "base64")), charset);
  }
  if (enc === "quoted-printable") {
    const soft = body.replace(/=\r?\n/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < soft.length; i++) {
      const ch = soft[i];
      const hex = soft.slice(i + 1, i + 3);
      if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
      } else {
        for (const b of Buffer.from(ch, "utf-8")) bytes.push(b);
      }
    }
    return decodeBytes(Uint8Array.from(bytes), charset);
  }
  return body;
}

export function parseMime(raw: string, depth = 0): MimeLeaf[] {
  const { headers, body } = splitHeadersAndBody(raw);
  const contentType = parseHeaderValue(headers["content-type"] ?? "text/plain");
  const disposition = parseHeaderValue(headers["content-disposition"] ?? "");
  const filename = disposition.params.filename ?? contentType.params.name ?? null;

  if (contentType.value.startsWith("multipart/") && contentType.params.boundary && depth < 10) {
    const boundary = contentType.params.boundary;
    const leaves: MimeLeaf[] = [];
    const sections = body.split(`--${boundary}`);
    for (const section of sections.slice(1)) {
      if (section.startsWith("--")) break;
      leaves.push(...parseMime(section.replace(/^\r?\n/, ""), depth + 1));
    }
    return leaves;
  }

  if (contentType.value.startsWith("text/") || contentType.value === "application/ics") {
    return [
      {
        contentType: contentType.value,
        filename,
        text: decodeBody(body, headers["content-transfer-encoding"] ?? "7bit", contentType.params.charset),
      },
    ];
  }
  return [];
}
