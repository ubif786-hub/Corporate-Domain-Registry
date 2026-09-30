"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import { CalloutCard } from "@/components/CalloutCard";
import { TextField } from "@/components/TextField";

/* The account entry point, built once so the header never changes shape when accounts arrive
   (TRIAGE, section 8). The form is real; the account behind it is the next release, and the page
   says so when the button is pressed rather than pretending to sign anyone in. */

// D23 (owner, 27 Aug 2026): the narrow-form frame reads --container-width-xs, minted in
// v5.12.0 for exactly this shape. It carried a bare 28rem literal, which is the value the
// new token holds, so this is a rename and not a resize: measured 486.969px rendered before
// and after at a 1440 viewport (root 17.392px; 28 x 17.392 = 486.976 computed max-width).
// --container-width-sm at 40rem is the next rung up and is a band width, far too wide for a
// two-field sign-in card, which is why this site and five others carried the literal.
const formStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "var(--container-width-xs)" };

export function LoginForm() {
  const [tried, setTried] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) { e.currentTarget.reportValidity(); return; }
    setTried(true);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-group)" }}>
      <form onSubmit={submit} style={formStyle} data-ds-login-form="">
        <TextField id="login-email" name="email" label="Email" type="email" required />
        <TextField id="login-password" name="password" label="Password" type="password" required />
        <div>
          <Button type="submit" variant="primary">Sign in</Button>
        </div>
      </form>
      {tried ? (
        <CalloutCard
          tone="info"
          title="Accounts arrive with the next release"
          body="Sign-in, the domain portal and invoices go live with the server side of the service. Nothing you type here is stored."
        />
      ) : null}
    </div>
  );
}
