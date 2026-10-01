"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckmarkOutline, WarningAlt } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { api, ApiError } from "../lib/api";
import { AuthFrame } from "../ui/AuthFrame";

/** Only a path inside the panel, never another site. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/admin/") || raw.startsWith("//") || raw.startsWith("/admin/sign-in")) return "/admin/";
  return raw;
}

export function SignInView() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Read once after mount: the address is not known while the static page renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignedOut(q.has("signed_out"));
    // Already signed in: straight through.
    api("/me", { redirectOn401: false }).then(() => window.location.replace(safeNext(q.get("next")))).catch(() => {});
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!d.email || !d.password) { setError("Enter your email and password."); return; }
    setBusy(true); setError(null); setSignedOut(false);
    try {
      await api("/session", { method: "POST", body: { email: d.email, password: d.password }, redirectOn401: false });
      window.location.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Sign in to the admin panel"
      intro="Orders, domains and customers for corporatedomainregistry.com."
      foot={<>Forgot your password? Ask an owner for a reset link. They make one on the Team page.</>}
    >
      <form className="adm-form" onSubmit={submit} noValidate aria-describedby={error ? "signin-error" : undefined}>
        {signedOut ? (
          <div className="adm-notice" data-tone="success" role="status">
            <CheckmarkOutline size={16} aria-hidden="true" /><p>You are signed out.</p>
          </div>
        ) : null}
        {error ? (
          <div className="adm-notice" data-tone="danger" role="alert" id="signin-error">
            <WarningAlt size={16} aria-hidden="true" /><p>{error}</p>
          </div>
        ) : null}
        <TextField id="si-email" name="email" type="email" label="Email" autoComplete="username" required autoFocus inputMode="email" spellCheck={false} />
        <TextField id="si-password" name="password" type="password" label="Password" autoComplete="current-password" required reveal />
        <div>
          <Button type="submit" variant="primary" size="lg" icon={<ArrowRight size={20} />} iconPosition="right" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
