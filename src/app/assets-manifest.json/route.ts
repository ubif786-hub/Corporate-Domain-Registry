// Publishes the asset manifest for the HQ assets tab, which reads it from production and
// staging. Two parts: the slots (typed judgement merged with the recorded files, see
// src/lib/assets.ts) and the fork's Blob store as it is RIGHT NOW, listed with the store's own
// token so the HQ can name files no slot claims and weigh the whole store. The token never leaves
// this process: only the store id, its public host and the file list are published.
//
// Re-read every five minutes rather than baked at build, so an upload shows in the HQ without a
// redeploy. A fork with no store connected publishes `store: null`.
import { list } from "@vercel/blob";
import { ASSET_SLOTS, BRAND } from "@/lib/assets";

export const revalidate = 300;

const PROJECT = "domain-services";

async function storeListing() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  // vercel_blob_rw_<STOREID>_<secret>; the public host is the lower-cased id.
  const id = token.split("_")[3] ?? "";
  const host = id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : undefined;
  try {
    const files: { pathname: string; size: number; uploadedAt: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ token, cursor, limit: 1000 });
      for (const b of page.blobs) {
        files.push({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt.toISOString(), url: b.url });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return { id, host, files };
  } catch {
    return { id, host, files: null, error: "listing failed" };
  }
}

export async function GET() {
  return Response.json({
    project: PROJECT,
    generatedFrom: "src/lib/assets.ts",
    slots: ASSET_SLOTS,
    brand: BRAND,
    store: await storeListing(),
  });
}
