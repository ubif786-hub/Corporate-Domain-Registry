// An uploaded list turned into a mailing (letters.lists.ts) and kept (letters.schema.ts). The admin
// page previews the counts first; creating the mailing takes the next reference numbers for good.

import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db, type Db } from "../../core/db";
import { HttpError } from "../../core/http";
import { buildMailing, mailingFiles, zipFiles, type ListFile, type MailingCounts } from "./letters.lists";
import { mailings } from "./letters.schema";

export interface MailingSummary {
  id: number;
  created_at: string;
  created_by: string;
  files: string[];
  first_ref: number;
  last_ref: number;
  counts: MailingCounts;
}

const today = () => new Date().toISOString().slice(0, 10);

/** The uploaded files from the request body: [{ name, text }]. */
export function uploadedFiles(raw: unknown): ListFile[] {
  const files = (Array.isArray(raw) ? raw : [])
    .filter((f) => f && typeof f.name === "string" && typeof f.text === "string")
    .slice(0, 4)
    .map((f) => ({ name: String(f.name).slice(0, 200), text: String(f.text) }));
  if (!files.length) throw new HttpError(400, "no_file", "Choose the list file (CSV) first.");
  return files;
}

async function nextRef(d: Pick<Db, "select">): Promise<number> {
  const [r] = await d.select({ last: sql<number | null>`max(${mailings.lastRef})` }).from(mailings);
  return Number(r?.last ?? 0) + 1;
}

const summary = (m: Omit<typeof mailings.$inferSelect, "letters">): MailingSummary => ({
  id: m.id,
  created_at: m.createdAt.toISOString(),
  created_by: m.createdBy,
  files: m.files,
  first_ref: m.firstRef,
  last_ref: m.lastRef,
  counts: m.counts,
});

/** What a mailing from these files would hold, without keeping anything. */
export async function previewMailing(files: ListFile[]) {
  const first = await nextRef(await db());
  const { letters, counts } = buildMailing(files, first, today());
  return { first_ref: first, last_ref: first + letters.length - 1, counts };
}

export async function createMailing(files: ListFile[], by: string): Promise<MailingSummary> {
  const d = await db();
  return d.transaction(async (tx) => {
    // One mailing at a time, so two uploads never share numbers.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('mailings', 0))`);
    const first = await nextRef(tx);
    const { letters, counts } = buildMailing(files, first, today());
    if (!letters.length) throw new HttpError(422, "no_letters", "Every row in this list was left out, so there are no letters to send.");
    const [m] = await tx.insert(mailings)
      .values({ createdBy: by, files: files.map((f) => f.name), firstRef: first, lastRef: first + letters.length - 1, counts, letters })
      .returning();
    return summary(m);
  });
}

export async function listMailings(): Promise<{ mailings: MailingSummary[]; next_ref: number }> {
  const d = await db();
  const { letters: _, ...columns } = getTableColumns(mailings);
  const rows = await d.select(columns).from(mailings).orderBy(desc(mailings.id));
  return { mailings: rows.map(summary), next_ref: await nextRef(d) };
}

/** The mailing's ten files for Torpedo, zipped. */
export async function mailingZip(id: number, siteUrl: string): Promise<{ name: string; data: Buffer } | null> {
  const d = await db();
  const [m] = await d.select({ letters: mailings.letters }).from(mailings).where(eq(mailings.id, id));
  return m ? { name: `CDR-mailing-${id}.zip`, data: zipFiles(mailingFiles(id, m.letters, siteUrl)) } : null;
}
