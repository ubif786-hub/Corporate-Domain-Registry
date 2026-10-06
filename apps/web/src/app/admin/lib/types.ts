// The shapes /api/admin/* answers with (apps/api/src/features/admin/*).

import type { AdminUser, Modes } from "./session";

export interface MoneyByCurrency { usd: number; cad: number }

export interface OrderSummary {
  id: string;
  status: string;
  test_mode: boolean;
  created_at: string;
  currency: string;
  subtotal_cents: number;
  captured_cents: number | null;
  name: string;
  org: string;
  email: string;
  country: string;
  lines: { domain: string; state: string; term: number; service: string }[];
}

export interface Overview {
  test_mode: boolean;
  modes: Modes;
  orders: { today: number; last30: number; prev30: number };
  revenue: { last30: MoneyByCurrency; prev30: MoneyByCurrency; all: MoneyByCurrency };
  domains: { last30: number; all: number; failed30: number };
  daily: { day: string; orders: number; domains: number }[];
  attention: { id: string; status: string; created_at: string; name: string; reason: "action" | "stuck" }[];
  waiting: number;
  recent: OrderSummary[];
}

export interface OrderList { orders: OrderSummary[]; total: number; page: number; pages: number; statuses: string[] }

export interface Registrant {
  first_name: string; last_name: string; org_name: string; email: string; phone: string;
  address1: string; address2: string; city: string; state: string; postal_code: string; country: string;
  ca_legal_type?: string;
}

export interface OrderLine {
  domain: string; service: string; label: string; term: number; amount_cents: number; state: string; attempts: number;
  attempted_at?: string; registered_at?: string; expires_at?: string; reason?: string;
  opensrs?: { order_id: string | null; domain_id?: string | null; code?: number; text?: string };
  transfer?: {
    from_registrar?: string; last_error?: string; status?: string; asked_at?: string; reminded?: number;
    charged_cents?: number; refunded_cents?: number; refund_id?: string;
  };
}

export interface Order {
  id: string;
  status: string;
  test_mode: boolean;
  opensrs_env: "test" | "live";
  created_at: string;
  updated_at: string;
  currency: string;
  subtotal_cents: number;
  lines: OrderLine[];
  registrant: Registrant;
  registrant_ip: string;
  visitor_country: string | null;
  agreement: { accepted_at: string; document: string; url: string };
  stripe: {
    session_id?: string; payment_intent?: string; amount_subtotal?: number; amount_discount?: number;
    amount_authorized?: number; authorized_at?: string; amount_captured?: number; amount_refunded?: number; settled_at?: string; settle_error?: string;
    customer?: { email: string | null; name: string | null };
  };
  log: string[];
}

/** code_days: how long a paid transfer waits for its code before it is refunded. */
export interface OrderDetail { order: Order; can_continue: boolean; code_days?: number }

export interface DomainRow {
  domain: string; service: string; state: string; reason: string | null; term: number; amount_cents: number; currency: string;
  registered_at: string | null; expires_at: string | null; tucows_order: string | null; order_id: string; order_status: string;
  ordered_at: string; test_mode: boolean; name: string; email: string;
}
export interface DomainList { rows: DomainRow[]; total: number; page: number; pages: number; counts: Record<string, number> }

export interface CustomerRow {
  email: string; name: string; org: string; country: string; phone: string; orders: number; domains: number;
  spent: MoneyByCurrency; first_order: string; last_order: string; last_order_id: string;
}
export interface CustomerList { rows: CustomerRow[]; total: number; page: number; pages: number }

export interface AuditEntry { at: string; action: string; who: string | null; ip: string | null; detail: Record<string, unknown> | null }
export interface Team { users: AdminUser[]; activity: AuditEntry[] | null }

export interface SalesReport {
  days: number;
  from: string;
  to: string;
  test_mode: boolean;
  period: { orders: number; registered: number; renewed: number; failed: number; usd: number; cad: number };
  all: { registered: number; renewed: number; usd: number; cad: number };
  buyers: {
    order_id: string; created_at: string; name: string; org: string; email: string; phone: string; country: string;
    lines: { domain: string; service: string; state: string; term: number; expires_at: string | null }[];
  }[];
  expiring: { domain: string; expires_at: string; name: string; email: string; order_id: string }[];
  renewal_window_days: number;
}

export interface Balance { balance_usd: number | null; env: "test" | "live"; alert_below_usd: number }

export interface SessionInfo { current: boolean; created_at: string; last_seen_at: string; ip: string | null; device: string }
