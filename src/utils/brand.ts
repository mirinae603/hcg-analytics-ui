// src/utils/brand.ts — whose brand the app wears.
//
// The app is Bidezy's Supply Chain Analytics. A client's own deployment can also wear that
// client's brand: their logo beside Bidezy's, and their name inside the data (hospital names
// such as "HCG KR, Bangalore"). NEXT_PUBLIC_CLIENT_BRAND picks it when the app is built:
//
//   unset (the default)  Bidezy only: no client logo, and the client's name is taken out of
//                        every name and sentence the server sends, so "HCG KR, Bangalore"
//                        shows as "KR, Bangalore". For showing the product to other clients.
//   hcg                  HCG's logo and names, as HCG's own deployment shows them.
//
// Only what is SHOWN changes. Codes, filters and requests are untouched (hospitals are
// picked and sent by plant code), so every screen works the same either way.

export const PRODUCT = {
  name: "Supply Chain Analytics",
  vendor: "Bidezy",
  /** Bidezy's mark, square. */
  icon: "/images/logo/logo-icon.jpg",
} as const;

export interface ClientBrand {
  /** The name as it appears in the data and on screen. */
  name: string;
  /** The full logo, wide. */
  logo: string;
  /** The logo's mark alone, square, for the sidebar rail. */
  mark: string;
  /** The logo's alt text. */
  logoAlt: string;
}

const CLIENTS: Record<string, ClientBrand> = {
  hcg: {
    name: "HCG",
    logo: "/images/logo/hcg-logo.svg",
    mark: "/images/logo/hcg-butterfly.svg",
    logoAlt: "HCG — adding life to years",
  },
};

/** The client this build is branded for, or null for Bidezy alone. */
export const CLIENT: ClientBrand | null =
  CLIENTS[(process.env.NEXT_PUBLIC_CLIENT_BRAND || "").trim().toLowerCase()] ?? null;

/** Who the app is named for in the browser tab and page footers: the client when there is
 *  one, Bidezy otherwise. */
export const OWNER = CLIENT ? CLIENT.name : PRODUCT.vendor;

// ── Taking a client's name out of text ─────────────────────────────────────────────────
// With no client brand, every known client's name is taken out of what is shown. Three
// cases, tried in this order at each place the name appears:
//   possessive     "HCG's formulary"           -> "the group's formulary"
//   on its own     "across HCG." / "All HCG"    -> "across the group." / "All hospitals"
//   before a name  "HCG KR, Bangalore", "HCG,North Bangalore", "HCG-KHUBCHANDANI",
//                  "HCG Item Master"           -> "KR, Bangalore", "North Bangalore",
//                                                 "KHUBCHANDANI", "Item Master"
//   before a word  "HCG sets budgets", "HCG hospitals", "HCG-wide"
//                                              -> "the group sets budgets",
//                                                 "the group's hospitals", "group-wide"
//   as a tag       "BED SHEET-HCG", "Vendor / HCG"   -> "BED SHEET", "Vendor"
// Matching is case-sensitive and on whole words, so a word that merely contains the
// letters is left alone.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAMES = Object.values(CLIENTS).map((c) => escape(c.name)).join("|");
const NAME_IN_TEXT = new RegExp(
  `\\s*[-–/]\\s*(?:${NAMES})\\b(?![\\w'’-])(?!\\s+[A-Za-z0-9])` +   // a tag after a dash: "LINEN-HCG"
  `|\\bAll (?:${NAMES})\\b(?![\\s,\\-–]*[A-Za-z0-9])` +          // "All HCG" standing alone
  `|\\b(?:${NAMES})-wide\\b` +                                     // "HCG-wide"
  `|\\b(?:${NAMES})['’]s\\b` +                                     // "HCG's"
  `|\\b(?:${NAMES})\\b(?=\\s*(?:[.!?;:)\\]"']|,\\s+[a-z]|$))` + // ending a phrase
  `|\\b(?:${NAMES})\\b[\\s,\\-–]*([A-Za-z0-9(][\\w-]*)?`,         // before a name or word (and that word)
  "g",
);
/** Quick test before the regex: the text holds a client's name at all. */
const HAS_NAME = new RegExp(`\\b(?:${NAMES})\\b`);

/** True where a sentence starts: the text's start, or after ". ", "! ", "? " or a new line. */
const sentenceStart = (text: string, at: number) => at === 0 || /(?:[.!?]\s+|\n\s*)$/.test(text.slice(Math.max(0, at - 4), at));

/** Words the name stands before as a description, "HCG hospitals": these take "the group's".
 *  Plurals that are also verbs ("HCG lists", "HCG reports") are left out: as a verb they
 *  read right after "the group". */
const OWNED = new Set(["hospital", "hospitals", "unit", "units", "network", "list", "sheet", "report", "data",
  "team", "teams", "formulary", "pharmacy", "pharmacies", "method", "rule"]);

function replaceName(match: string, next: string | undefined, at: number, text: string): string {
  const start = sentenceStart(text, at);
  const cap = (w: string) => (start ? w[0].toUpperCase() + w.slice(1) : w);
  if (/^\s*[-–/]/.test(match)) return "";
  if (match.startsWith("All ")) return "All hospitals";
  if (match.endsWith("-wide")) return cap("group-wide");
  if (/['’]s$/.test(match)) return cap("the group") + match.slice(-2);
  if (next === undefined) return /[\s,\-–]$/.test(match) ? "" : cap("the group"); // before a symbol; ending a phrase
  if (!/^[a-z]/.test(next)) return cap(next);                    // before a name: drop it
  if (/\b[Aa]ll $/.test(text.slice(Math.max(0, at - 4), at))) return next; // "all HCG hospitals"
  if (OWNED.has(next)) return `${cap("the group's")} ${next}`;   // "HCG hospitals"
  const gap = match.slice(match.length - next.length - 1, match.length - next.length);
  return `${cap("the group")}${gap === "-" ? "-" : " "}${next}`; // "HCG sets", "HCG-run"
}

/** `text` as shown under this build's brand: unchanged for a client build, the client's
 *  name taken out for a build with none. */
export function unbrand(text: string): string;
export function unbrand(text: string | null | undefined): string | null | undefined;
export function unbrand(text: string | null | undefined): string | null | undefined {
  if (CLIENT || !text || !HAS_NAME.test(text)) return text;
  return text.replace(NAME_IN_TEXT, replaceName);
}

/** Every string inside a server response, through `unbrand`. Keys are left alone, and a
 *  value without the name comes back as the same object, so nothing is copied for a build
 *  with a client brand or a response that never mentions one. */
export function unbrandDeep<T>(value: T): T {
  if (CLIENT) return value;
  return walk(value) as T;
}

function walk(v: unknown): unknown {
  if (typeof v === "string") return unbrand(v);
  if (Array.isArray(v)) {
    let out: unknown[] | null = null;
    for (let i = 0; i < v.length; i++) {
      const w = walk(v[i]);
      if (w !== v[i]) (out ??= v.slice())[i] = w;
    }
    return out ?? v;
  }
  if (v && typeof v === "object") {
    let out: Record<string, unknown> | null = null;
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const w = walk(x);
      if (w !== x) (out ??= { ...(v as Record<string, unknown>) })[k] = w;
    }
    return out ?? v;
  }
  return v;
}

/** `res.json()` as shown under this build's brand, for the pages that call fetch directly. */
export async function readJson<T = any>(res: Response): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return unbrandDeep(await res.json()) as T;
}
