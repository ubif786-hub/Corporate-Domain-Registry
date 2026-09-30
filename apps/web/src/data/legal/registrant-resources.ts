// Corporate Domain Registry: "Registrant Education and ICANN Materials", the reference sheet of
// ICANN and CIRA addresses CDR points registrants at, effective August 28, 2026.
//
// The text is the client's own, approved for publication and transcribed VERBATIM on 31 Aug 2026
// from ICANN-and-Registrant-Materials.txt. Words, order, numbers, capitalisation and punctuation
// are his; nothing here is paraphrased, tightened or corrected.
//
// SHAPE. This document is a reference sheet, not a numbered policy: it has no printed section
// numbers, so every section carries `number: null` and the accordion is ordered by the printed
// order alone. The two-column table (Resource / Official address) is one `links` block, one row
// per printed row, with each address copied character for character. A wrong address here sends a
// registrant to the wrong policy, so treat these strings as quoted material and never "tidy" a
// trailing slash or a date stamp out of a URL.

import type { LegalDoc } from "./types";

export const REGISTRANT_RESOURCES: LegalDoc = {
  id: "registrant-resources",
  href: "/registrant-resources",
  title: "Registrant Education and ICANN Materials",
  shortTitle: "Registrant education and ICANN materials",
  indexLabel: "ICANN Materials",
  effectiveDate: "2026-08-28",
  effectiveDateLabel: "August 28, 2026",
  description:
    "Links to the ICANN and CIRA materials covering registrant rights, domain transfers, registration data and dispute procedures.",
  supplied: true,
  source: "ICANN-and-Registrant-Materials.txt",
  preamble: [
    {
      kind: "p",
      content: [
        "Corporate Domain Registry provides the following independent resources so customers can understand their rights, responsibilities, transfers, registration data, and dispute procedures. The linked organizations control and may update their own materials.",
      ],
    },
  ],
  sections: [
    {
      id: "reference-links-for-domain-registrants",
      number: null,
      title: "Reference links for domain registrants",
      blocks: [
        {
          kind: "links",
          caption: "Resource / Official address",
          rows: [
            {
              label: "Registrant rights and responsibilities",
              href: "https://www.icann.org/resources/pages/benefits-2013-09-16-en",
            },
            {
              label: "Registrant educational information",
              href: "https://www.icann.org/resources/pages/educational-2012-02-25-en",
            },
            {
              label: "Domain transfer information",
              href: "https://www.icann.org/resources/pages/transfers-2017-10-10-en",
            },
            {
              label: "Registration Data Policy",
              href: "https://www.icann.org/resources/pages/registration-data-policy-2024-02-21-en",
            },
            {
              label: "Uniform Domain Name Dispute Resolution Policy",
              href: "https://www.icann.org/resources/pages/policy-2012-02-25-en",
            },
            {
              label: "Rules for the UDRP",
              href: "https://www.icann.org/resources/pages/udrp-rules-2015-03-11-en",
            },
            {
              label: "Approved dispute-resolution providers",
              href: "https://www.icann.org/resources/pages/providers-6d-2012-02-25-en",
            },
            {
              label: "CIRA information for .CA registrants",
              href: "https://www.cira.ca/en/ca-domains/",
            },
          ],
        },
      ],
    },
    {
      id: "important-distinction",
      number: null,
      title: "Important distinction",
      blocks: [
        {
          kind: "p",
          content: [
            "Corporate Domain Registry is an independent reseller and domain-management provider. It does not operate ICANN or any top-level-domain registry and does not claim ICANN accreditation. The accredited registrar and applicable registry are identified in the registration process and governing agreements.",
          ],
        },
      ],
    },
    {
      id: "questions",
      number: null,
      title: "Questions",
      blocks: [
        {
          kind: "p",
          content: [
            "For assistance understanding which policy applies to a particular domain, contact ",
            {
              text: "support@corporatedomainregistry.com",
              href: "mailto:support@corporatedomainregistry.com",
              external: true,
            },
            ". We can explain the operational process but do not provide legal advice.",
          ],
        },
      ],
    },
  ],
};
