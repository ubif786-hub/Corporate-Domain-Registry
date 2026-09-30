// Corporate Domain Registry's Domain Name Dispute Policy Notice: the client's summary of the UDRP,
// URS and CIRA dispute frameworks that may apply to domains ordered or managed through CDR, and of
// what a reseller does and does not decide.
//
// The text below is the client's own, transcribed verbatim on 31 Aug 2026 from
// Domain-Name-Dispute-Policy-Notice.txt. Nothing is paraphrased, reordered or corrected. The four
// ICANN and CIRA addresses printed in section 2 are carried as Inline links so the page can make
// them clickable without altering the printed text, which is the URL itself.

import type { Block, LegalDoc } from "./types";

const UDRP_POLICY = "https://www.icann.org/resources/pages/policy-2012-02-25-en";
const UDRP_RULES = "https://www.icann.org/resources/pages/udrp-rules-2015-03-11-en";
const UDRP_PROVIDERS = "https://www.icann.org/resources/pages/providers-6d-2012-02-25-en";
const CIRA_POLICIES = "https://www.cira.ca/en/legal-policy-and-compliance/cira-policies/";

const preamble: Block[] = [
  {
    kind: "p",
    content: [
      "This notice summarizes the dispute frameworks that may apply to domain names ordered or managed through Corporate Domain Registry. It does not replace the official policy text, procedural rules, registrar agreement, registry rules, or legal advice.",
    ],
  },
];

export const DISPUTE_POLICY: LegalDoc = {
  id: "dispute-policy",
  href: "/dispute-policy",
  title: "Domain Name Dispute Policy Notice",
  shortTitle: "Domain name dispute policy notice",
  indexLabel: "Dispute Policy",
  effectiveDate: "2026-08-28",
  effectiveDateLabel: "August 28, 2026",
  description:
    "How UDRP, URS and CIRA dispute proceedings can affect a domain ordered through Corporate Domain Registry, and what a reseller can and cannot do while one is running.",
  supplied: true,
  source: "Domain-Name-Dispute-Policy-Notice.txt",
  preamble,
  sections: [
    {
      id: "applicable-policies",
      number: 1,
      title: "Applicable policies",
      blocks: [
        {
          kind: "list",
          items: [
            [
              "Generic top-level domains may be subject to ICANN’s Uniform Domain Name Dispute Resolution Policy (UDRP) and its Rules.",
            ],
            [
              "Certain new generic top-level domains may also be subject to the Uniform Rapid Suspension System (URS).",
            ],
            [
              ".CA domain names may be subject to CIRA’s Canadian Dispute Resolution Policy and procedural rules.",
            ],
            [
              "Country-code and specialized top-level domains may be governed by additional or different registry dispute policies.",
            ],
          ],
        },
      ],
    },
    {
      id: "incorporation-of-official-rules",
      number: 2,
      title: "Incorporation of official rules",
      blocks: [
        {
          kind: "p",
          content: [
            "The official policy in force when a dispute is initiated governs. For the UDRP, see ",
            { text: UDRP_POLICY, href: UDRP_POLICY, external: true },
            " and ",
            { text: UDRP_RULES, href: UDRP_RULES, external: true },
            ". Approved UDRP providers are listed at ",
            { text: UDRP_PROVIDERS, href: UDRP_PROVIDERS, external: true },
            ". For .CA disputes, consult CIRA’s current policies at ",
            { text: CIRA_POLICIES, href: CIRA_POLICIES, external: true },
            ". These external materials may change without amendment to this notice.",
          ],
        },
      ],
    },
    {
      id: "udrp-overview",
      number: 3,
      title: "UDRP overview",
      blocks: [
        {
          kind: "p",
          content: [
            "Under the UDRP, a complainant generally must establish that the disputed domain is identical or confusingly similar to a mark in which the complainant has rights, the registrant lacks rights or legitimate interests in the domain, and the domain was registered and is being used in bad faith. The official policy defines the applicable evidence, procedure, defenses, fees, remedies, publication requirements, and court options.",
          ],
        },
      ],
    },
    {
      id: "registrar-and-reseller-roles",
      number: 4,
      title: "Registrar and reseller roles",
      blocks: [
        {
          kind: "p",
          content: [
            "Corporate Domain Registry is a reseller and management provider, not the UDRP decision-maker. The accredited registrar maintains the registration of record and implements valid decisions, orders, locks, transfers, cancellations, or suspensions as required by the applicable policy. CDR may transmit communications, assist with account verification, preserve the status quo, or submit an authorized instruction, but it does not decide the merits of a dispute.",
          ],
        },
      ],
    },
    {
      id: "maintaining-the-status-quo",
      number: 5,
      title: "Maintaining the status quo",
      blocks: [
        {
          kind: "p",
          content: [
            "A registrar may lock or restrict a domain during a pending administrative, judicial, arbitral, abuse, or ownership proceeding. Transfers to another holder or registrar may be prohibited for a period specified by the applicable policy. Attempting to evade a dispute restriction may result in reversal, cancellation, suspension, or other action.",
          ],
        },
      ],
    },
    {
      id: "court-and-administrative-decisions",
      number: 6,
      title: "Court and administrative decisions",
      blocks: [
        {
          kind: "p",
          content: [
            "CDR and the registrar may comply with a binding administrative decision, court order, arbitral order, registry direction, or applicable law. Under the UDRP, implementation of a transfer or cancellation decision is subject to the court-filing process and waiting period specified in the official policy. A customer relying on that process must provide the required official documentation within the prescribed time.",
          ],
        },
      ],
    },
    {
      id: "other-disputes",
      number: 7,
      title: "Other disputes",
      blocks: [
        {
          kind: "p",
          content: [
            "Disputes not governed by a mandatory domain policy remain between the affected parties and may be addressed through a court, arbitration, settlement, or another lawful process. CDR does not provide legal representation and should not be named as a party solely because it supplied reseller or management services.",
          ],
        },
      ],
    },
    {
      id: "customer-obligations",
      number: 8,
      title: "Customer obligations",
      blocks: [
        {
          kind: "list",
          items: [
            ["Maintain accurate registrant and account contact information."],
            ["Monitor communications and meet all response deadlines."],
            ["Preserve evidence and obtain independent legal advice when appropriate."],
            ["Do not transfer, alter, conceal, or misuse a domain to evade a pending dispute."],
            [
              "Pay provider and professional fees directly unless an agreement expressly states otherwise.",
            ],
          ],
        },
      ],
    },
    {
      id: "updates",
      number: 9,
      title: "Updates",
      blocks: [
        {
          kind: "p",
          content: [
            "We may update this notice to track changes in registrar, registry, ICANN, CIRA, or legal requirements. The official policy and rules always control over this summary.",
          ],
        },
      ],
    },
  ],
};
