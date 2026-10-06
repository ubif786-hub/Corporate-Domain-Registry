import type { CheckoutRegistrant, Currency, LineService, LineState, OrderStatus } from "@cdr/shared";

/** Tries per line: registrations sent, or transfer codes used. */
export const MAX_ATTEMPTS = 3;

/** no_code: a paid transfer whose code never came; it is refunded. */
export type FailReason = "taken" | "tucows_on_hold" | "rejected" | "error" | "no_code";

/** Transfer progress. The code itself is never stored here (see transfer_codes). */
export interface LineTransfer {
  /** Why the last code failed. */
  last_error?: string;
  /** Last check_transfer state, or "refused". */
  status?: string;
  /** Expiry right after the move, and the paid years still to renew. */
  completed_expiry?: string;
  extra_years?: number;
  /** This line's share of the charge (after any promotion). */
  charged_cents?: number;
  refunded_cents?: number;
  refund_id?: string;
  /** Registrar at checkout, from RDAP. */
  from_registrar?: string;
  /** Which emails went out (transfer.emails.ts). */
  asked_at?: string;
  reminded?: number;
  error_told?: boolean;
  closed_told?: boolean;
}

export interface OrderLine {
  domain: string;
  /** "registered" also means renewed or transferred. */
  service: LineService;
  label: string;
  term: number;
  amount_cents: number;
  state: LineState;
  attempts: number;
  attempted_at?: string;
  registered_at?: string;
  /** Last known expiry. Renewals and transfers keep the checkout date until done (it guards
   *  against renewing twice and counts the years a move added). */
  expires_at?: string;
  reason?: FailReason;
  opensrs?: {
    order_id: string | null;
    domain_id?: string | null;
    code?: number;
    text?: string;
    reg_username?: string;
  };
  transfer?: LineTransfer;
}

export interface OrderStripe {
  session_id?: string;
  expires_at?: string | null;
  livemode?: boolean;
  customer?: { email: string | null; name: string | null };
  amount_subtotal?: number;
  amount_discount?: number;
  payment_intent?: string;
  amount_authorized?: number;
  authorized_at?: string;
  amount_captured?: number;
  /** Refunds after the capture (transfers that never went through). */
  amount_refunded?: number;
  settled_at?: string;
  settle_error?: string;
  error?: { http: number; type: string | null; message: string | null };
}

/** One order, one JSON file in ORDERS_DIR. The same shape the PHP version wrote. */
export interface Order {
  id: string;
  status: OrderStatus;
  test_mode: boolean;
  opensrs_env: "test" | "live";
  created_at: string;
  updated_at: string;
  currency: Currency;
  subtotal_cents: number;
  lines: OrderLine[];
  registrant: CheckoutRegistrant;
  /** Kept for the registrar agreement (OpenSRS MSA 3.9): who ordered, from where, and when. */
  registrant_ip: string;
  visitor_country: string | null;
  agreement: { accepted_at: string; document: string; url: string };
  stripe: OrderStripe;
  /** Stripe event ids already applied, so a redelivery is a no-op. */
  events: string[];
  log: string[];
  notified_final?: string;
  settled_early?: boolean;
}
