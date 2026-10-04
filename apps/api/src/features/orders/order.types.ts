import type { CheckoutRegistrant, Currency, LineService, LineState, OrderStatus } from "@cdr/shared";

export type FailReason = "taken" | "tucows_on_hold" | "rejected" | "error";

export interface OrderLine {
  domain: string;
  /** A renewal reuses the registration states: "registered" means renewed. */
  service: LineService;
  label: string;
  term: number;
  amount_cents: number;
  state: LineState;
  attempts: number;
  attempted_at?: string;
  registered_at?: string;
  /** The domain's expiry date as last known. A renewal carries the date Tucows reported at checkout
   *  (its year guards against renewing twice) until it goes through, then the new date. */
  expires_at?: string;
  reason?: FailReason;
  opensrs?: {
    order_id: string | null;
    domain_id?: string | null;
    code?: number;
    text?: string;
    reg_username?: string;
  };
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
