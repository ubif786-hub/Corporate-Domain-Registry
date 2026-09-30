// The shape of a CDR legal document.
//
// Six instruments arrived from the client on 31 Aug 2026, each with its own effective date and its
// own numbered sections. They are not six sections of one page: the Agreement incorporates the
// Privacy Policy, the Expired Registration Recovery Policy and the Dispute Notice BY NAME, and a
// document incorporated by reference needs a citable URL of its own. So each gets a route, and the
// accordion the owner asked for lives INSIDE each document, with the client's own numbered
// sections as its panels.
//
// WHY THIS TYPE AND NOT THE FLAT ONE IT REPLACES. src/data/terms.ts held
// `{ id, title, body: string[] }`, which cannot carry four things these documents actually
// contain: the printed section NUMBER kept separate from the title (so "section 17" stays citable
// and cannot be silently renumbered by an array index), ordered and unordered sub-lists, inline
// links (the ICANN and CIRA URLs in the dispute notice, the upstream registrar agreement in the
// agreement), and a per-document effective date.
//
// TRANSCRIBED VERBATIM. The client approved publication of the text as written, so the words in
// these files are his, not ours. Two consequences worth stating because they will look like
// mistakes later. First, the document TITLES stay in the Title Case the instruments are printed
// in wherever the text cites them, while the site chrome around them (page headings, nav labels,
// tab labels) is sentence case per the house rule: we sentence-case what we name and quote
// verbatim what someone else named. Second, the house rule against em dashes does not reach
// quoted legal text; where a document contains one it stays, because silently editing a legal
// instrument to fit a style guide is worse than the punctuation.

export type LegalDocId =
  | "agreement"
  | "privacy"
  | "disclaimer"
  | "expired-registration-recovery"
  | "dispute-policy"
  | "registrant-resources";

/** An inline run. A plain string is the common case; a link is the only mark legal text needs. */
export type Inline = string | { text: string; href: string; external?: boolean };

export type Block =
  | { kind: "p"; content: Inline[] }
  | { kind: "list"; ordered?: boolean; items: Inline[][] }
  /** A caption plus rows of external references. The ICANN materials sheet is one of these. */
  | { kind: "links"; caption?: string; rows: { label: string; href: string }[] }
  /** STUDIO-WRITTEN, never the client's text. Rendered as an aside so the distinction is visible. */
  | { kind: "note"; content: Inline[] };

export interface LegalSection {
  /** Kebab-case, stable, the accordion panel id and the URL fragment. Never renumber it. */
  id: string;
  /** The client's own printed section number, or null for an unnumbered block. */
  number: number | null;
  /** The heading exactly as printed. */
  title: string;
  blocks: Block[];
}

export interface LegalDoc {
  id: LegalDocId;
  /** Route and canonical, no trailing slash. */
  href: string;
  /** The document title exactly as printed on the client's letterhead. Title Case, verbatim. */
  title: string;
  /** Sentence case, for the footer, the hub and cross-references. Site chrome, so our rule wins. */
  shortTitle: string;
  /** The label on the /tos accordion bar, and ONLY there. The reference site the client named
   *  indexes these six instruments by their common short names ("Registration Agreement",
   *  "ICANN Materials") rather than by their printed legal titles, and six long titles stacked
   *  as closed bars stop reading as an index. This is a DISPLAY LABEL for that one index: it
   *  never renames the instrument. `title` stays the client's verbatim letterhead title and is
   *  what the document's own page, its metadata and every cross-document incorporation cite,
   *  because an agreement that another agreement incorporates by name has to keep that name.
   *  Omit to fall back to `title`. */
  indexLabel?: string;
  /** ISO, for the <time dateTime> attribute. */
  effectiveDate: string;
  /** As the client prints it. Rendered, never derived from the ISO, so the page cannot misquote. */
  effectiveDateLabel: string;
  /** One sentence, studio-written, for the page metadata description. */
  description: string;
  /** True when the body is the client's supplied text. False marks a studio placeholder. */
  supplied: boolean;
  /** Provenance: the file this was transcribed from. */
  source: string;
  /** Unnumbered lead paragraphs above section 1. They carry scope and acceptance, so they render
   *  above the accordion rather than inside it: a visitor must not have to click to reach them. */
  preamble: Block[];
  sections: LegalSection[];
  /** Documents this one incorporates by reference. Rendered as a cross-link list. */
  incorporates?: LegalDocId[];
}
