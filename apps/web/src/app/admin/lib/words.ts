// The admin panel's vocabulary: every internal code shown as plain English, with a tone for its
// badge. The owners never have to know what "settle_error" means.

import type { BadgeTone } from "@/components/Badge";

export interface Wording { label: string; tone: BadgeTone; explain: string }

export const ORDER_STATUS: Record<string, Wording> = {
  pending_payment: { label: "Awaiting payment", tone: "neutral", explain: "The customer opened the payment page and has not paid. Nothing was charged." },
  expired: { label: "Checkout abandoned", tone: "neutral", explain: "The customer left the payment page without paying. Nothing was charged." },
  stripe_error: { label: "Checkout failed", tone: "neutral", explain: "The payment page could not be opened. Nothing was charged." },
  authorized: { label: "Card on hold", tone: "info", explain: "The card is on hold for the full amount. The domains are registered next, then only the registered ones are charged." },
  fulfilling: { label: "Registering", tone: "info", explain: "The domains are being registered at Tucows right now." },
  pending: { label: "Waiting on registry", tone: "warning", explain: "Tucows accepted the order and the registry has not confirmed yet. The site checks again on its own." },
  registered: { label: "Registered", tone: "success", explain: "Every domain registered, and the card was charged for them." },
  partially_registered: { label: "Partly registered", tone: "warning", explain: "Some domains registered and only those were charged. The rest of the hold was released." },
  failed: { label: "Not registered", tone: "error", explain: "No domain could be registered. The hold on the card was released, so the customer paid nothing." },
  payment_failed: { label: "Payment failed", tone: "error", explain: "The card payment did not go through. Nothing was registered." },
  amount_mismatch: { label: "Amount mismatch", tone: "error", explain: "Stripe reported a different amount from the order. Nothing was registered. Check the payment in Stripe." },
  settle_error: { label: "Charge problem", tone: "error", explain: "The domains were handled but charging or releasing the card hold failed. Use “Run next step now” or check Stripe." },
  needs_review: { label: "Needs review", tone: "error", explain: "Something unexpected happened. Check the history below and the order in Tucows and Stripe." },
  transferring: { label: "Transferring", tone: "info", explain: "Paid. Waiting for the customer's transfer codes, or for the moves to finish. The customer gets reminders, and a transfer that never goes through is refunded on its own." },
};

export const LINE_STATE: Record<string, Wording> = {
  new: { label: "Not started", tone: "neutral", explain: "" },
  registering: { label: "Registering", tone: "info", explain: "" },
  registered: { label: "Registered", tone: "success", explain: "" },
  pending: { label: "Waiting on registry", tone: "warning", explain: "" },
  failed: { label: "Not registered", tone: "error", explain: "" },
  unknown: { label: "Check Tucows", tone: "error", explain: "Tucows did not answer clearly. Look the domain up in the Tucows panel before trying again." },
  awaiting_code: { label: "Waiting for code", tone: "warning", explain: "The customer has not sent a working transfer code yet." },
};

export const FAIL_REASON: Record<string, string> = {
  taken: "Someone registered it first",
  tucows_on_hold: "Tucows held it: top up the Tucows balance",
  rejected: "The registry refused the details or the transfer codes",
  error: "Tucows answered with an error",
  no_code: "No transfer code in time: refunded",
};

export const AUDIT_ACTION: Record<string, string> = {
  sign_in: "Signed in",
  sign_in_failed: "Failed sign-in",
  sign_in_limited: "Sign-in blocked (too many attempts)",
  sign_out: "Signed out",
  setup_completed: "Set their password",
  password_changed: "Changed their password",
  user_added: "Added a person",
  setup_link: "Made a setup link",
  role_changed: "Changed a role",
  user_disabled: "Turned off a person's access",
  user_enabled: "Turned a person's access back on",
  order_driven: "Ran an order's next step",
  csv_exported: "Downloaded the orders spreadsheet",
  report_exported: "Downloaded an analytics list",
  sessions_revoked: "Signed out other browsers",
  password_set: "Set a password from the server",
};

export const UNPAID_STATUSES = ["pending_payment", "expired", "stripe_error"];

export function statusWording(status: string): Wording {
  return ORDER_STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "neutral", explain: "" };
}

const SERVICE_LABEL: Record<string, Record<string, string>> = {
  renew: { registering: "Renewing", registered: "Renewed", failed: "Not renewed" },
  transfer: { new: "Code received", registering: "Sending transfer", pending: "Moving", registered: "Moved", failed: "Not moved" },
};

/** Renewals and transfers reuse the registration states ("registered" means renewed or moved). */
export function lineWording(state: string, service = "register"): Wording {
  const w = LINE_STATE[state] ?? { label: state, tone: "neutral", explain: "" };
  const label = SERVICE_LABEL[service]?.[state];
  return label ? { ...w, label } : w;
}
