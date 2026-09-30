// Plain-text email.
//   resend  Resend's HTTPS API (RESEND_API_KEY). DigitalOcean blocks outgoing mail ports, so this is
//           the production transport; FROM_EMAIL's domain must be verified in Resend first.
//   file    an outbox folder beside the orders (<ORDERS_DIR>/outbox/*.eml), for local proof
//   log     one line per email in the process log (recipient and subject only)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "./config";

export async function sendMail(to: string | null | undefined, subject: string, body: string): Promise<boolean> {
  const c = config();
  if (!to) return false;

  if (c.mailTransport === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Corporate Domain Registry <${c.fromEmail}>`,
          to: [to],
          reply_to: c.notifyEmail,
          subject,
          text: body,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) console.error(`[mail] Resend refused an email (HTTP ${res.status})`);
      return res.ok;
    } catch (e) {
      console.error("[mail] Resend could not be reached:", e instanceof Error ? e.message : e);
      return false;
    }
  }

  if (c.mailTransport === "log") {
    console.log(`[mail] to ${to}: ${subject}`);
    return true;
  }

  const headers = `From: Corporate Domain Registry <${c.fromEmail}>\r\n`
    + `Reply-To: ${c.notifyEmail}\r\n`
    + "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n";
  const dir = join(c.ordersDir, "outbox");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  writeFileSync(join(dir, `${stamp}-${randomBytes(3).toString("hex")}.eml`), `${headers}To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`, { mode: 0o600 });
  return true;
}
