// The six CDR legal documents, in one ordered list.
//
// THE ORDER IS THE CLIENT'S, not ours. It is the panel order on the reference site's terms page,
// which the client pointed at: agreement, disclaimer, privacy, dispute, expiry recovery, ICANN
// materials. It is not alphabetical and it is not by length, so do not "tidy" it.
//
// Every consumer reads this array rather than importing a document directly, so adding or
// retiring an instrument is an edit here and nothing else: /tos renders a panel per entry, the
// per-document routes are generated from it, and the footer reads FOOTER_LEGAL.

import { AGREEMENT } from "./agreement";
import { DISCLAIMER } from "./disclaimer";
import { PRIVACY } from "./privacy";
import { DISPUTE_POLICY } from "./dispute-policy";
import { EXPIRY_RECOVERY } from "./expired-registration-recovery";
import { REGISTRANT_RESOURCES } from "./registrant-resources";
import type { LegalDoc, LegalDocId } from "./types";

export type { LegalDoc, LegalDocId, LegalSection, Block, Inline } from "./types";

export const LEGAL_DOCS: LegalDoc[] = [
  AGREEMENT,
  DISCLAIMER,
  PRIVACY,
  DISPUTE_POLICY,
  EXPIRY_RECOVERY,
  REGISTRANT_RESOURCES,
];

export function legalDoc(id: LegalDocId): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.id === id);
}

/**
 * What the footer carries. The privacy policy earns a footer link of its own and the others do
 * not, and that is not a ranking: a privacy policy is the one instrument here that a visitor, a
 * browser and a regulator all expect to reach in one click from any page. The rest are reachable
 * from /tos, which already has a nav tab.
 */
export const FOOTER_LEGAL = [AGREEMENT, PRIVACY];

/** Every document except the agreement, which owns /tos itself rather than being listed on it. */
export const RELATED_DOCS = LEGAL_DOCS.filter((d) => d.id !== "agreement");
