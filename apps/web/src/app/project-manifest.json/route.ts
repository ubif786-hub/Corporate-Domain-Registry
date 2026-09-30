import { readFileSync } from "node:fs";
import { join } from "node:path";

// Publishes this fork's own sheet for the HQ (22 Sep 2026, owner: "make the card read the
// PROJECT.md next up"): the "Next up" list of PROJECT.md and the boxes of LAUNCH_CHECKLIST.md,
// read at BUILD time from the repo root and served here, staging first (the working copy). The
// HQ runs on Vercel with no fork on disk, so this is how a sheet written by whoever did the work
// reaches the project card without being typed a second time. Fork-owned, scaffolded by
// fork-project.sh; not in the sync unit. Statically generated: an edit ships with the deploy.
export const dynamic = "force-static";

interface SheetItem {
  text: string;
  /** The `### ` subheading the item sits under, when the section has one. */
  group: string | null;
}
interface Box {
  text: string;
  done: boolean;
}

const read = (file: string): string => {
  try {
    return readFileSync(join(process.cwd(), file), "utf8");
  } catch {
    return "";
  }
};

/** The body of a `## heading` section, HTML comments removed. */
const section = (md: string, heading: string): string => {
  const m = new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(md);
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, "") : "";
};

const plain = (s: string): string => s.replace(/\*\*|__|`/g, "").trim();

/** Top-level list items of a section, each with its wrapped continuation lines joined: the
 *  numbered ones when there are any, else the bullets. An item under a `### ` subheading carries
 *  it as its group. A nested bullet is not part of the item's text; a blank line or a paragraph
 *  ends it. Capped on a word boundary so a sheet paragraph does not become the card. */
const CAP = 320;
const items = (s: string): SheetItem[] => {
  const out: SheetItem[] = [];
  const lines = s.split("\n");
  const numbered = /^\s{0,3}\d+\.\s+/;
  const bullet = /^\s{0,3}[-*]\s+/;
  const pick = lines.some((l) => numbered.test(l)) ? numbered : bullet;
  let group: string | null = null;
  let current: SheetItem | null = null;
  const flush = () => {
    if (current && current.text) {
      const t = current.text.replace(/\s+/g, " ").trim();
      out.push({ ...current, text: t.length > CAP ? t.slice(0, CAP - 1).replace(/\s+\S*$/, "") + "…" : t });
    }
    current = null;
  };
  for (const line of lines) {
    const h = /^###\s+(.+)$/.exec(line);
    if (h) {
      flush();
      group = plain(h[1]);
      continue;
    }
    if (pick.test(line)) {
      flush();
      current = { text: plain(line.replace(pick, "")), group };
      continue;
    }
    if (!current) continue;
    if (line.trim() === "" || /^\S/.test(line)) {
      flush();
      continue;
    }
    if (/^\s+[-*]\s+/.test(line) || /^\s+\d+\.\s+/.test(line)) continue; // a nested list, not the item's own words
    current.text += " " + plain(line);
  }
  flush();
  return out;
};

/** LAUNCH_CHECKLIST.md as its groups of boxes, with the tally. */
const checklist = (md: string) => {
  const groups: { title: string; items: Box[] }[] = [];
  for (const line of md.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      groups.push({ title: plain(h[1]), items: [] });
      continue;
    }
    const box = /^\s*-\s+\[([ xX])\]\s+(.+)$/.exec(line);
    const last = groups.at(-1);
    if (box && last) last.items.push({ text: plain(box[2]), done: box[1] !== " " });
  }
  const all = groups.flatMap((g) => g.items);
  return { groups, done: all.filter((b) => b.done).length, total: all.length };
};

export function GET() {
  const project = read("PROJECT.md");
  const launch = read("LAUNCH_CHECKLIST.md");
  return Response.json({
    project: "domain-services",
    generatedFrom: ["PROJECT.md", "LAUNCH_CHECKLIST.md"],
    nextUp: items(section(project, "Next up")),
    launch: launch ? checklist(launch) : null,
  });
}
