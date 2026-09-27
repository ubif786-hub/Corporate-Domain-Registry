// Corporate Domain Registry's Website and Services Disclaimer: what CDR is and is not, what the
// website's information does and does not promise, and the warranty and liability limits it claims.
//
// The body is the client's own text, transcribed verbatim on 31 Aug 2026 from
// Website-and-Services-Disclaimer.txt. Words, order, numbers, capitalisation and punctuation are
// his. Nothing here is paraphrased or tidied, so do not "fix" a line in this file: fix it with the
// client and re-transcribe. Section 1 contains two em dashes, which stay, because the house rule
// against them governs what we write, not what we quote. The only studio-written string is
// `description`, for page metadata.

import type { Block, LegalDoc, LegalSection } from "./types";

const preamble: Block[] = [
  {
    kind: "p",
    content: [
      "This disclaimer applies to the website at ",
      {
        text: "CorporateDomainRegistry.com",
        href: "https://corporatedomainregistry.com",
        external: true,
      },
      " and the domain registration, transfer, renewal, monitoring, DNS, and related services offered under the Corporate Domain Registry brand (collectively, the “Services”). By accessing the website or using the Services, you accept this disclaimer together with the applicable terms of service and registration agreements.",
    ],
  },
];

const sections: LegalSection[] = [
  {
    id: "independent-service-provider",
    number: 1,
    title: "Independent service provider",
    blocks: [
      {
        kind: "p",
        content: [
          "Corporate Domain Registry is an independent domain reseller and management provider. It is not a government body, domain-name registry operator, ICANN, CIRA, or—unless expressly stated for a particular service—the customer’s current registrar. Domain registrations and transfers are fulfilled through one or more accredited registrars and applicable registry operators.",
        ],
      },
    ],
  },
  {
    id: "information-and-availability",
    number: 2,
    title: "Information and availability",
    blocks: [
      {
        kind: "p",
        content: [
          "Website content is provided for general information. Domain availability, registration data, expiry dates, pricing, registry requirements, and transfer eligibility can change without notice. A search result or quotation does not guarantee that a domain can be registered, renewed, recovered, or transferred. An order is complete only after acceptance and confirmation by the applicable registrar and registry.",
        ],
      },
    ],
  },
  {
    id: "no-legal-tax-or-trademark-advice",
    number: 3,
    title: "No legal, tax, or trademark advice",
    blocks: [
      {
        kind: "p",
        content: [
          "Information supplied through the website or by support personnel is not legal, tax, accounting, cybersecurity, or trademark advice. Customers are responsible for confirming that their registration and use of a domain comply with applicable law and do not violate another party’s rights.",
        ],
      },
    ],
  },
  {
    id: "third-party-services",
    number: 4,
    title: "Third-party services",
    blocks: [
      {
        kind: "p",
        content: [
          "The Services may rely on registrars, registries, payment processors, hosting providers, DNS operators, certificate authorities, and other third parties. Their own terms and policies may apply. References or links to third parties do not constitute a warranty or endorsement, and Corporate Domain Registry is not responsible for a third party’s separate products, content, availability, or conduct except to the extent required by law.",
        ],
      },
    ],
  },
  {
    id: "intellectual-property",
    number: 5,
    title: "Intellectual property",
    blocks: [
      {
        kind: "p",
        content: [
          "Unless otherwise stated, the website’s original text, design, graphics, and branding belong to Corporate Domain Registry or its licensors. You may view and print reasonable extracts for your internal, non-commercial use. Republication, resale, automated extraction, or commercial distribution requires prior written permission, excluding materials expressly made available under separate terms.",
        ],
      },
    ],
  },
  {
    id: "no-warranties",
    number: 6,
    title: "No warranties",
    blocks: [
      {
        kind: "p",
        content: [
          "To the maximum extent permitted by law, the website and Services are provided on an “as available” basis. Corporate Domain Registry disclaims implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, and uninterrupted or error-free operation. Rights that cannot lawfully be excluded remain unaffected.",
        ],
      },
    ],
  },
  {
    id: "limitation-of-liability",
    number: 7,
    title: "Limitation of liability",
    blocks: [
      {
        kind: "p",
        content: [
          "To the maximum extent permitted by law, Corporate Domain Registry will not be liable for indirect, incidental, special, exemplary, punitive, or consequential losses, or for lost profits, revenue, goodwill, business opportunity, data, website availability, or email availability arising from the website or Services. Any limitation in the applicable service agreement applies in addition to this disclaimer.",
        ],
      },
    ],
  },
  {
    id: "changes",
    number: 8,
    title: "Changes",
    blocks: [
      {
        kind: "p",
        content: [
          "We may update this disclaimer to reflect operational, legal, or policy changes. The current version will be posted on the website with its effective date. Material changes affecting existing customers will be communicated as required by the applicable agreement or law.",
        ],
      },
    ],
  },
];

export const DISCLAIMER: LegalDoc = {
  id: "disclaimer",
  href: "/disclaimer",
  title: "Website and Services Disclaimer",
  shortTitle: "Website and services disclaimer",
  indexLabel: "Disclaimer",
  effectiveDate: "2026-08-28",
  effectiveDateLabel: "August 28, 2026",
  description:
    "The limits Corporate Domain Registry puts on this website and its services: what it is not, what a search result does not guarantee, and what it does not warrant.",
  supplied: true,
  source: "Website-and-Services-Disclaimer.txt",
  preamble,
  sections,
  incorporates: ["agreement"],
};
