import type { Metadata } from "next";
import Link from "next/link";
import { PagePanel } from "../PagePanel";
import { LegalDocumentBody } from "../LegalDocument";
import { REGISTRANT_RESOURCES } from "@/data/legal/registrant-resources";

/* This instrument also renders as a panel on /tos. It has an address of its own because a legal
   document gets cited, linked and quoted, and a fragment on a page titled "Terms of service" is
   not an address for it. Both surfaces render the same body from the same data, so they cannot
   disagree. */

const doc = REGISTRANT_RESOURCES;

export const metadata: Metadata = {
  title: doc.shortTitle,
  description: doc.description,
  alternates: { canonical: doc.href },
};

export default function Page() {
  return (
    <PagePanel title={doc.shortTitle} lede={doc.description} size="md" code="Z2">
      <LegalDocumentBody doc={doc} headingLevel={2} />
      <p style={{ margin: 0, fontSize: "var(--type-sm)" }}>
        <Link href="/tos" style={{ color: "var(--text-positive-link)" }}>All terms and policies</Link>
      </p>
    </PagePanel>
  );
}
