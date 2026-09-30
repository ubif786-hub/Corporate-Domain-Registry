// The background sweep, every 5 minutes inside the API process (server.ts). It finishes what the
// webhook and the done page left:
//   - orders still registering or waiting on the registry (Tucows answers some later)
//   - orders whose capture failed (Stripe retried)
//   - orders whose card hold is about to lapse (settled on day six)
//   - checkouts whose webhook never arrived (the session is read from Stripe)

import { tryConfig } from "../../core/config";
import { isoNow, toUnix, unixNow } from "../../core/time";
import { stripe } from "../../integrations/stripe/client";
import { DRIVABLE, fulfil, recordCheckout, recordExpired } from "../orders/fulfilment.service";
import { orderIds, readOrder } from "../orders/order.store";

let running = false;

export async function sweep(budgetSeconds = 240): Promise<{ ran_at: string; report: string[] }> {
  const report: string[] = [];
  const ranAt = isoNow();
  if (running) return { ran_at: ranAt, report: ["a sweep is already running"] };
  const c = tryConfig();
  if (!c || !c.stripeSecretKey || !c.opensrsUsername || !c.opensrsApiKey) return { ran_at: ranAt, report: ["not configured"] };
  running = true;
  try {
    const started = unixNow();
    for (const id of orderIds()) {
      if (unixNow() - started > budgetSeconds) { report.push("out of time; the next run continues"); break; }
      let order = readOrder(id);
      if (!order) continue;

      const age = unixNow() - (toUnix(order.created_at) ?? unixNow());
      if (order.status === "pending_payment" && order.stripe.session_id && age > 300) {
        const r = await stripe("GET", "/checkout/sessions/" + encodeURIComponent(order.stripe.session_id));
        if (r.status === 200 && r.body?.status) {
          if (r.body.status === "complete") {
            const o = await recordCheckout(id, r.body);
            if (o) report.push(`${id}: payment found without a webhook, now ${o.status}`);
          } else if (r.body.status === "expired") {
            recordExpired(id);
          }
        }
        order = readOrder(id);
        if (!order) continue;
      }

      if (DRIVABLE.includes(order.status)) {
        const status = await fulfil(id, 30);
        report.push(`${id}: ${order.status} -> ${status}`);
      }
    }
  } finally {
    running = false;
  }
  return { ran_at: ranAt, report };
}
