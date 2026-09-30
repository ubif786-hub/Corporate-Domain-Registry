// Corporate Domain Registry's Expired Registration Recovery Policy: what happens when a domain
// expires, the grace, redemption and deletion phases, and how a customer asks for a recovery.
//
// The body is the client's own text, transcribed verbatim on 31 Aug 2026 from
// Expired-Registration-Recovery-Policy.txt. Words, order, numbers, capitalisation and punctuation
// are his. Nothing here is paraphrased or tidied, so do not "fix" a line in this file: fix it with
// the client and re-transcribe. The only studio-written string is `description`, for page metadata.

import type { Block, LegalDoc, LegalSection } from "./types";

const preamble: Block[] = [
  {
    kind: "p",
    content: [
      "This policy explains how Corporate Domain Registry handles expiration notices, renewal, and recovery requests. Actual timelines and fees are controlled by the applicable accredited registrar and top-level-domain registry and may differ by extension.",
    ],
  },
];

const sections: LegalSection[] = [
  {
    id: "customer-responsibility",
    number: 1,
    title: "Customer responsibility",
    blocks: [
      {
        kind: "p",
        content: [
          "The registrant remains responsible for maintaining accurate contact and payment information and for renewing each domain before its expiry date. We send reminders as a courtesy, but non-delivery of a reminder does not extend a registration term or guarantee recovery.",
        ],
      },
    ],
  },
  {
    id: "renewal-and-automatic-renewal",
    number: 2,
    title: "Renewal and automatic renewal",
    blocks: [
      {
        kind: "p",
        content: [
          "Automatic renewal is available only when shown as enabled in the customer account, a valid payment method is on file, and the applicable registrar and registry permit renewal. An automatic-renewal attempt may fail because of payment, account, registry, compliance, or technical issues. Customers should verify completion rather than relying solely on the setting.",
        ],
      },
    ],
  },
  {
    id: "expiry-and-service-interruption",
    number: 3,
    title: "Expiry and service interruption",
    blocks: [
      {
        kind: "p",
        content: [
          "After expiry, the domain and associated website, email, DNS, or forwarding services may stop working. The registrar or registry may change DNS resolution, place the domain on an expiry page, suspend it, delete it, or make it available under its expiry process.",
        ],
      },
    ],
  },
  {
    id: "renewal-grace-period",
    number: 4,
    title: "Renewal grace period",
    blocks: [
      {
        kind: "p",
        content: [
          "Where available, an expired domain may be renewed during a post-expiry grace period. For many generic top-level domains fulfilled through Tucows/OpenSRS, the registrar may offer a period of up to approximately 40 days, but no grace period is guaranteed and some extensions follow different rules. A renewal normally extends from the original expiry date, not the date payment is received.",
        ],
      },
    ],
  },
  {
    id: "redemption-and-restoration",
    number: 5,
    title: "Redemption and restoration",
    blocks: [
      {
        kind: "p",
        content: [
          "After any renewal grace period, an eligible domain may enter a redemption or restoration phase. Recovery during this phase may require an additional registry or registrar restoration fee plus the normal renewal fee. Recovery is not guaranteed and must be confirmed by the applicable registrar and registry.",
        ],
      },
    ],
  },
  {
    id: "deletion-and-loss-of-rights",
    number: 6,
    title: "Deletion and loss of rights",
    blocks: [
      {
        kind: "p",
        content: [
          "If a domain is not renewed or restored within the periods made available by the registrar or registry, it may be deleted and become available for registration or allocation to another party. Corporate Domain Registry cannot guarantee recovery after expiration and is not responsible for a third party registering a released domain, except to the extent liability cannot lawfully be excluded.",
        ],
      },
    ],
  },
  {
    id: "how-to-request-recovery",
    number: 7,
    title: "How to request recovery",
    blocks: [
      {
        // The source prints these as four unnumbered lines, so the list is unordered even though
        // they read as steps: numbering them here would add a citable order the client did not print.
        kind: "list",
        items: [
          [
            "Contact ",
            {
              text: "support@corporatedomainregistry.com",
              href: "mailto:support@corporatedomainregistry.com",
              external: true,
            },
            " immediately.",
          ],
          ["Provide the domain name and complete any requested identity or authority verification."],
          ["Pay the quoted renewal, redemption, restoration, and service fees."],
          ["Wait for written confirmation that the registrar or registry has completed the recovery."],
        ],
      },
    ],
  },
  {
    id: "priority-of-upstream-rules",
    number: 8,
    title: "Priority of upstream rules",
    blocks: [
      {
        kind: "p",
        content: [
          "If this policy conflicts with the rules or procedures of the applicable registrar, registry operator, ICANN, or CIRA, the applicable upstream rule or procedure controls.",
        ],
      },
    ],
  },
];

export const EXPIRY_RECOVERY: LegalDoc = {
  id: "expired-registration-recovery",
  href: "/expired-registration-recovery",
  title: "Expired Registration Recovery Policy",
  shortTitle: "Expired registration recovery policy",
  effectiveDate: "2026-08-28",
  effectiveDateLabel: "August 28, 2026",
  description:
    "What happens when a domain expires, how long there is to renew or restore it, and how to ask us to recover one.",
  supplied: true,
  source: "Expired-Registration-Recovery-Policy.txt",
  preamble,
  sections,
};
