import type { CheckoutRegistrant, Currency, LineService, LineState, OrderStatus } from "@cdr/shared";

/** no_code: a paid transfer whose code never came; it is refunded. */
export type FailReason = "taken" | "tucows_on_hold" | "rejected" | "error" | "no_code";

/** A transfer's progress beyond its line state. The customer's code is NOT here: it is kept in its
 *  own table (order.store.ts) so it never reaches the admin pages, the CSV or a log. */
export interface LineTransfer {
  /** Why the last code did not work, shown on the code page while a new one is awaited. */
  last_error?: string;
  /** Tucows' transfer state as last seen (check_transfer). */
  status?: string;
  /** The expiry right after the move, and the paid years still to add to it with a renewal. */
  completed_expiry?: string;
  extra_years?: number;
  /** What this line cost the card (its share of a promotion included), set when the order is charged. */
  charged_cents?: number;
  refunded_cents?: number;
  refund_id?: string;
}

export interface OrderLine {
  domain: string;
  /** A renewal or a transfer reuses the registration states: "registered" means renewed or transferred. */
  service: LineService;
  label: string;
  term: number;
  amount_cents: number;
  state: LineState;
  attempts: number;
  attempted_at?: string;
  registered_at?: string;
  /** The domain's expiry date as last known. A renewal carries the date Tucows reported at checkout
   *  (its year guards against renewing twice) until it goes through, then the new date; a transfer
   *  the registry's date at checkout, so the years the move added can be counted. */
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
