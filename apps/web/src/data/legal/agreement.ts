// Corporate Domain Registry's Domain Registration and Management Agreement: the master instrument
// governing registration, transfer, renewal, DNS, monitoring and recovery services, and the
// document that incorporates the Expired Registration Recovery Policy, the Privacy Policy and the
// Domain Name Dispute Policy Notice by name.
//
// The text below is the client's own, transcribed verbatim on 31 Aug 2026 from
// Domain-Registration-and-Management-Agreement.txt. Nothing is paraphrased, reordered or
// corrected. The em dashes in sections 1 and 3 are the client's and stay; the house rule against
// them governs words we write, not an instrument we quote.
//
// Route note: this document lives at /tos, not /agreement. That route already exists, carries the
// nav tab and the canonical, and is being kept.

import type { LegalDoc } from "./types";

export const AGREEMENT: LegalDoc = {
  id: "agreement",
  href: "/tos",
  title: "Domain Registration and Management Agreement",
  shortTitle: "Domain registration and management agreement",
  indexLabel: "Registration Agreement",
  effectiveDate: "2026-08-28",
  effectiveDateLabel: "August 28, 2026",
  description:
    "The terms that govern domain registration, transfer, renewal, DNS and recovery services ordered from Corporate Domain Registry.",
  supplied: true,
  source: "Domain-Registration-and-Management-Agreement.txt",
  incorporates: ["expired-registration-recovery", "privacy", "dispute-policy"],
  preamble: [
    {
      kind: "p",
      content: [
        "This Domain Registration and Management Agreement (“Agreement”) governs domain registration, transfer, renewal, DNS, monitoring, recovery, and related services ordered from Corporate Domain Registry (“CDR,” “we,” “us,” or “our”). “Customer,” “you,” and “your” mean the person or organization ordering the Services and, where applicable, the registered name holder.",
      ],
    },
  ],
  sections: [
    {
      id: "reseller-relationship-and-upstream-terms",
      number: 1,
      title: "Reseller relationship and upstream terms",
      blocks: [
        {
          kind: "p",
          content: [
            "CDR is an independent reseller and domain-management provider, not a top-level-domain registry operator and not itself an ICANN-accredited registrar. Domain services are fulfilled through an applicable accredited registrar—anticipated at launch to include Tucows Domains Inc. through OpenSRS—and the registry operator for the selected top-level domain. You agree to the then-current registrar and registry terms presented or linked during ordering. For Tucows-fulfilled domains, the Tucows Master Domain Registration Agreement applies: ",
            {
              text: "https://assets.opensrs.com/Uploads/Master_Domain_Registration_Agreement.html",
              href: "https://assets.opensrs.com/Uploads/Master_Domain_Registration_Agreement.html",
              external: true,
            },
            ". If an upstream term conflicts with this Agreement on a registrar- or registry-controlled matter, the upstream term controls.",
          ],
        },
      ],
    },
    {
      id: "acceptance-and-authority",
      number: 2,
      title: "Acceptance and authority",
      blocks: [
        {
          kind: "p",
          content: [
            "You accept this Agreement by ordering, paying for, accessing, or using a Service. If you act for an organization or another registrant, you represent that you are authorized to bind that party and to provide the submitted information. You must be at least 18 years old.",
          ],
        },
      ],
    },
    {
      id: "registrant-ownership",
      number: 3,
      title: "Registrant ownership",
      blocks: [
        {
          kind: "p",
          content: [
            "Unless a lawful written instruction states otherwise, the customer or customer-designated entity—not CDR—will be recorded as the registered name holder. CDR’s role is to facilitate and manage the Service. Registration creates a time-limited contractual right subject to the registrar, registry, ICANN, CIRA, and applicable law; it does not guarantee unrestricted property rights in a domain.",
          ],
        },
      ],
    },
    {
      id: "account-security-and-authorized-instructions",
      number: 4,
      title: "Account security and authorized instructions",
      blocks: [
        {
          kind: "p",
          content: [
            "You are responsible for securing your account, email, authentication methods, passwords, and recovery information and for activity performed using them. You must promptly notify us of suspected compromise. We may rely on instructions received through authenticated channels and may require identity, corporate authority, or beneficial-ownership verification before completing a sensitive change, transfer, registrant update, or release of an authorization code.",
          ],
        },
      ],
    },
    {
      id: "accurate-information-and-verification",
      number: 5,
      title: "Accurate information and verification",
      blocks: [
        {
          kind: "p",
          content: [
            "You must provide complete, accurate, and current account, registrant, contact, payment, and eligibility information and update it promptly when it changes. You must respond within the period specified in any registrar, registry, ICANN, CIRA, or CDR verification request. Inaccurate, incomplete, or unverified information may result in delay, rejection, suspension, cancellation, or loss of a domain.",
          ],
        },
      ],
    },
    {
      id: "domain-selection-and-lawful-use",
      number: 6,
      title: "Domain selection and lawful use",
      blocks: [
        {
          kind: "p",
          content: [
            "You are responsible for determining whether a domain and its use violate a trademark, privacy right, law, court order, acceptable-use rule, or third-party right. You will not use the Services for phishing, malware, botnets, impersonation, fraud, counterfeiting, spam, unlawful content, unauthorized access, deceptive conduct, or any other abusive or illegal purpose.",
          ],
        },
      ],
    },
    {
      id: "orders-and-availability",
      number: 7,
      title: "Orders and availability",
      blocks: [
        {
          kind: "p",
          content: [
            "Searches, quotations, and order submissions do not reserve or guarantee a domain. A registration, transfer, renewal, or recovery is complete only when accepted and confirmed by the applicable registrar and registry. We may reject or cancel an order affected by availability, eligibility, compliance, technical, fraud, payment, or pricing errors. If we cancel an unfulfilled order, our obligation is limited to refunding the amount paid for the unfulfilled item.",
          ],
        },
      ],
    },
    {
      id: "fees-taxes-and-payment",
      number: 8,
      title: "Fees, taxes, and payment",
      blocks: [
        {
          kind: "p",
          content: [
            "You must pay the displayed or quoted fees and applicable taxes before we are required to perform the Service. Registry, registrar, foreign-exchange, premium-name, restoration, and other upstream charges may change. Except where law or an express refund policy requires otherwise, completed registrations, renewals, transfers, recoveries, management work, and third-party charges are non-refundable.",
          ],
        },
      ],
    },
    {
      id: "renewals-and-expiration",
      number: 9,
      title: "Renewals and expiration",
      blocks: [
        {
          kind: "p",
          content: [
            "Registration ends on the communicated expiry date unless renewed. You remain responsible for timely renewal even if we offer reminders or automatic renewal. Automatic renewal depends on an enabled setting, valid payment, account standing, and registrar and registry availability and is not guaranteed. After expiry, services may stop and the domain may enter grace, redemption, deletion, auction, or reallocation processes. The separate Expired Registration Recovery Policy is incorporated into this Agreement.",
          ],
        },
      ],
    },
    {
      id: "transfers-and-changes-of-registrant",
      number: 10,
      title: "Transfers and changes of registrant",
      blocks: [
        {
          kind: "p",
          content: [
            "Transfers and registrant changes are governed by the applicable registrar, registry, and ICANN Transfer Policy. A domain may be locked or ineligible for transfer because of recent registration, transfer, registrant change, expiry, dispute, court order, payment issue, abuse review, or another permitted restriction. You authorize us to submit approved transfer and contact-change instructions to the registrar, but you may also need to approve registrar communications or provide an authorization code. We will not request your password for another registrar.",
          ],
        },
      ],
    },
    {
      id: "dns-and-service-continuity",
      number: 11,
      title: "DNS and service continuity",
      blocks: [
        {
          kind: "p",
          content: [
            "You are responsible for confirming nameservers, DNS records, email routing, hosting dependencies, and technical instructions. We will use reasonable care when carrying out accepted instructions but do not guarantee uninterrupted DNS, website, email, transfer, or third-party service operation. Before a transfer or DNS change, you should retain a current copy of all required DNS and service configuration.",
          ],
        },
      ],
    },
    {
      id: "suspension-cancellation-and-compliance-action",
      number: 12,
      title: "Suspension, cancellation, and compliance action",
      blocks: [
        {
          kind: "p",
          content: [
            "We or the applicable registrar or registry may reject, suspend, lock, cancel, transfer, or otherwise restrict a Service where required or permitted by an agreement, policy, law, court order, dispute decision, abuse process, sanctions rule, payment failure, security concern, or investigation. Where reasonably possible and legally permitted, we will provide notice and an opportunity to address a curable issue.",
          ],
        },
      ],
    },
    {
      id: "privacy-and-registration-data",
      number: 13,
      title: "Privacy and registration data",
      blocks: [
        {
          kind: "p",
          content: [
            "We process personal information as described in our Privacy Policy. You authorize us to provide required data to the registrar, registry operator, verification and escrow providers, payment processors, and governing authorities. Registration data may be published, redacted, disclosed, or retained as required or permitted by applicable policy and law. If you supply another person’s information, you confirm that you have authority and have provided any required notice.",
          ],
        },
      ],
    },
    {
      id: "disputes-concerning-domain-rights",
      number: 14,
      title: "Disputes concerning domain rights",
      blocks: [
        {
          kind: "p",
          content: [
            "You are bound by applicable dispute policies, including the Uniform Domain Name Dispute Resolution Policy (“UDRP”), Uniform Rapid Suspension System where applicable, CIRA Domain Name Dispute Resolution Policy for eligible .CA disputes, and any registry-specific policy. We may implement binding decisions or lawful orders and may lock or restrict a domain while a dispute is pending. Our Domain Name Dispute Policy Notice is incorporated into this Agreement.",
          ],
        },
      ],
    },
    {
      id: "third-party-services",
      number: 15,
      title: "Third-party services",
      blocks: [
        {
          kind: "p",
          content: [
            "Registrar, registry, payment, hosting, email, security, certificate, and other third-party services are subject to their own availability and terms. CDR is not responsible for a third party’s independent acts or omissions except to the extent liability cannot lawfully be excluded.",
          ],
        },
      ],
    },
    {
      id: "disclaimer-of-warranties",
      number: 16,
      title: "Disclaimer of warranties",
      blocks: [
        {
          kind: "p",
          content: [
            "To the maximum extent permitted by law, the Services are provided “as available.” We disclaim implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, and uninterrupted or error-free operation. We do not warrant that a desired domain will be available, that a registration will prevent a legal challenge, or that an expired or disputed domain can be recovered.",
          ],
        },
      ],
    },
    {
      id: "limitation-of-liability",
      number: 17,
      title: "Limitation of liability",
      blocks: [
        {
          kind: "p",
          content: [
            "To the maximum extent permitted by law, CDR will not be liable for indirect, incidental, special, exemplary, punitive, or consequential damages or for lost profits, revenue, goodwill, opportunity, data, website availability, or email availability. CDR’s aggregate liability arising from a Service will not exceed the amount paid to CDR for that affected Service during the 12 months preceding the event giving rise to the claim. This section does not limit liability that cannot legally be limited.",
          ],
        },
      ],
    },
    {
      id: "indemnity",
      number: 18,
      title: "Indemnity",
      blocks: [
        {
          kind: "p",
          content: [
            "You will defend, indemnify, and hold harmless CDR, the applicable registrar and registry, ICANN, CIRA, and their respective affiliates, personnel, and contractors from third-party claims, damages, penalties, and reasonable costs arising from your domain, content, instructions, breach of this Agreement, unlawful conduct, or infringement of another party’s rights, except to the extent caused by the indemnified party’s own conduct where such exclusion is prohibited by law.",
          ],
        },
      ],
    },
    {
      id: "notices-and-changes",
      number: 19,
      title: "Notices and changes",
      blocks: [
        {
          kind: "p",
          content: [
            "We may send notices to the account or registrant email address on record and may post generally applicable updates on the website. You are responsible for monitoring those addresses and keeping them current. We may amend this Agreement to reflect changes in Services, suppliers, policy, or law. Material discretionary changes will take effect after reasonable notice; mandatory upstream or legal changes may apply when required.",
          ],
        },
      ],
    },
    {
      id: "governing-law",
      number: 20,
      title: "Governing law",
      blocks: [
        {
          kind: "p",
          content: [
            "Except where an applicable domain dispute policy, registrar agreement, registry rule, or mandatory law provides otherwise, this Agreement is governed by the laws of Ontario and the federal laws of Canada applicable there. The parties submit to the courts located in Ontario, Canada. Nothing in this section prevents a party from seeking urgent injunctive relief or complying with a mandatory dispute forum.",
          ],
        },
      ],
    },
    {
      id: "general-terms",
      number: 21,
      title: "General terms",
      blocks: [
        {
          kind: "p",
          content: [
            "This Agreement, the order, incorporated policies, and applicable upstream terms form the entire agreement for the Services. If a provision is unenforceable, it will be limited or replaced to the minimum extent necessary and the remaining provisions will continue. Failure to enforce a provision is not a waiver. You may not assign this Agreement without our consent, except in connection with a permitted transfer of the relevant domain and acceptance by the new registrant. Sections intended by their nature to survive will survive termination.",
          ],
        },
      ],
    },
    {
      id: "contact",
      number: 22,
      title: "Contact",
      blocks: [
        {
          kind: "p",
          content: [
            "Customer service and legal notices may be sent to ",
            {
              text: "support@corporatedomainregistry.com",
              href: "mailto:support@corporatedomainregistry.com",
              external: true,
            },
            ", subject to any different notice method stated in an applicable order or upstream agreement.",
          ],
        },
      ],
    },
  ],
};
