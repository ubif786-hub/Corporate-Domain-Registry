// How to get a transfer code, matched on the registrar name from RDAP. Used by the emails and /transfer-code/.
// Names are exact (IANA's registrar list, CIRA for .ca): "Register.com - Network Solutions, LLC" is not Network Solutions.

export interface TransferGuide {
  name: string;
  url: string;
  steps: string[];
}

const GUIDES: { match: RegExp; guide: TransferGuide }[] = [
  {
    match: /^godaddy(\.com, llc| online services cayman islands ltd\.?)$/,
    guide: {
      name: "GoDaddy",
      url: "https://www.godaddy.com/help/get-the-auth-code-for-my-domain-1685",
      steps: [
        "Sign in to GoDaddy and open your Domain Portfolio.",
        "Select the domain, then Transfer > Transfer to Another Registrar, then Continue with transfer.",
        "Select Click here to see Authorization Code and copy it. GoDaddy also emails it to the domain's registrant email.",
      ],
    },
  },
  {
    match: /^namecheap, inc\.?$/,
    guide: {
      name: "Namecheap",
      url: "https://www.namecheap.com/support/knowledgebase/article.aspx/258/84/what-should-i-do-to-transfer-a-domain-from-namecheap/",
      steps: [
        "Sign in to Namecheap, go to Domain List and click Manage next to the domain.",
        "Open the Sharing & Transfer tab.",
        "Under Transfer Out, unlock the domain and request the Auth Code. Namecheap emails it to the domain's registrant email.",
      ],
    },
  },
  {
    match: /^network solutions, llc$/,
    guide: {
      name: "Network Solutions",
      url: "https://www.networksolutions.com/help/article/transfer-out-of-network-solutions",
      steps: [
        "Sign in to Network Solutions, click Domains and open the domain.",
        "On the Security tab, turn off Domain Lock.",
        "Click Request Auth Code and choose a reason. The code is emailed to the domain's registrant email.",
        "For a .ca domain, Network Solutions asks the account's primary contact to call their support for the code.",
      ],
    },
  },
  {
    match: /^squarespace domains (ii )?llc$/,
    guide: {
      name: "Squarespace",
      url: "https://support.squarespace.com/hc/en-us/articles/205812338-Transferring-a-domain-away-from-Squarespace",
      steps: [
        "Open your Squarespace domains dashboard and click the domain.",
        "Turn off the Domain Lock toggle.",
        "Click Request transfer code, then Ok. The code is emailed to the domain's contact email within 24 hours.",
      ],
    },
  },
  {
    match: /^wix\.com ltd\.?$/,
    guide: {
      name: "Wix",
      url: "https://support.wix.com/en/article/transferring-your-wix-domain-away-from-wix-2477749",
      steps: [
        "Go to Domains in your Wix account.",
        "Click the Domain Actions icon next to the domain and select Transfer away from Wix.",
        "Click Transfer Domain, then I Still Want to Transfer. Wix emails the code to the domain's registrant email.",
      ],
    },
  },
  {
    match: /^(1&1 )?ionos se$/,
    guide: {
      name: "IONOS",
      url: "https://www.ionos.com/help/domains/transferring-your-domain-away-from-ionos-to-another-provider/getting-the-authorization-code-for-your-domain-with-11-ionos/",
      steps: [
        "Sign in to IONOS and open Domains, then the Renewal & Transfer page.",
        "Select the domain.",
        "Click Show Authorization Code. It can take a few minutes to appear.",
      ],
    },
  },
  {
    match: /^cloudflare, inc\.?$/,
    guide: {
      name: "Cloudflare",
      url: "https://developers.cloudflare.com/registrar/account-options/transfer-out-from-cloudflare/",
      steps: [
        "In the Cloudflare dashboard, go to Manage Domains and select Manage on the domain.",
        "Select Configuration > Unlock, then Confirm and Unlock.",
        "Copy the auth code Cloudflare shows.",
      ],
    },
  },
  {
    match: /^bluehost inc\.?$/,
    guide: {
      name: "Bluehost",
      url: "https://www.bluehost.com/help/article/epp-auth-code",
      steps: [
        "Sign in to the Bluehost Portal, click Domains, then the domain.",
        "Open the Move & Access tab and click Request Auth Code.",
        "Choose a reason, click Continue With Transfer, then Send Auth Code. The code goes to the domain's registrant email.",
      ],
    },
  },
  {
    match: /^launchpad\.com inc\.?$/,
    guide: {
      name: "HostGator",
      url: "https://www.hostgator.com/help/article/what-is-my-epp-code-or-authorization-key",
      steps: [
        "Sign in to the HostGator Customer Portal, click Domains, then the domain.",
        "Open the Move & Access tab and click Request Auth Code.",
        "Choose a reason, click Continue with Transfer, then Send Auth Code. The code goes to the domain's registrant email.",
      ],
    },
  },
  {
    match: /^porkbun llc$/,
    guide: {
      name: "Porkbun",
      url: "https://kb.porkbun.com/article/27-how-to-transfer-domain-from-porkbun-to-another-registrar",
      steps: [
        "Open Domain Management in your Porkbun account.",
        "Click the green lock icon next to the domain to unlock it.",
        "Open the Details menu and select Get Authorization Code.",
      ],
    },
  },
  {
    match: /^name\.com, inc\.?$/,
    guide: {
      name: "Name.com",
      url: "https://www.name.com/support/articles/205188888-find-transfer-code",
      steps: [
        "Sign in to name.com and click My Domains.",
        "Click the domain.",
        "Under Domain Actions, click Show Transfer Authorization Code.",
      ],
    },
  },
  {
    match: /^dynadot\d* (inc|llc)\.?$/,
    guide: {
      name: "Dynadot",
      url: "https://www.dynadot.com/help/question/find-EPP",
      steps: [
        "Sign in to Dynadot, open My Domains > Manage Domains and click the domain.",
        "Scroll to Authorization Code. If it's locked, click Unlock Account, then Unlock.",
        "Copy the code shown there.",
      ],
    },
  },
  {
    match: /^webnames\.ca inc\.?$/,
    guide: {
      name: "Webnames.ca",
      url: "https://www.webnames.ca/help/domains/content/resources/articles/domains/domain_transfers/other/transferring_to_another_registrar.htm",
      steps: [
        "Sign in to Webnames.ca and go to My Account > Manage > Domains.",
        "Click the domain, then Domain Actions > Transfer Domain > Auth Code.",
        "Follow the screens to request the code and unlock the domain. Webnames checks the request and emails you the code.",
      ],
    },
  },
  {
    match: /^canspace solutions inc\.?$/,
    guide: {
      name: "CanSpace",
      url: "https://www.canspace.ca/clients/knowledgebase/7/How-do-I-get-the-EPP-code-for-my-domain-Also-known-as-authorization-code.html",
      steps: [
        "Sign in to the CanSpace client area and open Domains > My Domains.",
        "Click Manage on the domain, then Registrar Lock, and unlock it.",
        "Click Get EPP Code and copy the code exactly as shown.",
      ],
    },
  },
];

// Works at almost any registrar.
export const TRANSFER_STEPS: string[] = [
  "Sign in to your account at the company your domain is with now.",
  "Turn off the domain's transfer lock (also called registrar lock or domain lock).",
  "Ask for the transfer code (also called authorization code, auth code or EPP code). Most companies show it on screen or email it to the domain's contact address.",
];

// The registrar's own steps, if we have them.
export function transferGuide(registrar: string | null | undefined): TransferGuide | null {
  const r = (registrar ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!r) return null;
  return GUIDES.find((g) => g.match.test(r))?.guide ?? null;
}
